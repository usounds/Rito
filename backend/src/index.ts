import { PrismaClient } from "@prisma/client";
import { CommitCreateEvent, CommitDeleteEvent, CommitUpdateEvent, Jetstream } from '@skyware/jetstream';
import WebSocket from 'ws';
import { BOOKMARK, CURSOR_UPDATE_INTERVAL, JETSREAM_URL, SERVICE, POST_COLLECTION } from './config';
import { BlueRitoFeedBookmark } from './lexicons';
import logger from './logger';
import OpenAI from "openai";
import { Client, simpleFetchHandler } from '@atcute/client';
const publicAgent = new Client({
  handler: simpleFetchHandler({
    service: 'https://public.api.bsky.app',
  }),
});


const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // 環境変数にAPIキーを設定しておく
});

async function checkModeration(texts: string[]): Promise<string[]> {
  try {
    const response = await client.moderations.create({
      model: "omni-moderation-latest",
      input: texts,
    });

    const flaggedCategories: Set<string> = new Set();

    response.results.forEach(result => {
      for (const [category, value] of Object.entries(result.categories)) {
        if (value) flaggedCategories.add(category);
      }
    });

    return Array.from(flaggedCategories); // 問題なければ空配列 []
  } catch (error) {
    console.error("Moderation error:", error);
    throw error;
  }
}

const prisma = new PrismaClient();
let cursor = "0";
let prev_time_us = "0";
let cursorUpdateInterval: NodeJS.Timeout;

(prisma as any).$on('error', (e: any) => {
  logger.error(`Prisma error event: ${e?.message || e}`);
  process.exit(1); // DB接続が切れたらプロセス終了
});

function epochUsToDateTime(cursor: string | number): string {
  return new Date(Number(cursor) / 1000).toISOString();
}

// JetstreamIndex から初期カーソル取得
async function loadCursor(): Promise<string> {
  try {
    const indexRecord = await prisma.jetstreamIndex.findUnique({
      where: { service: 'rito' }
    });
    if (indexRecord && indexRecord.index) {
      logger.info(`Cursor from DB: ${indexRecord.index} (${epochUsToDateTime(indexRecord.index)})`);
      return indexRecord.index;
    } else {
      const nowUs = Date.now().toString();
      logger.info(`No DB cursor found, using current time: ${nowUs} (${epochUsToDateTime(nowUs)})`);
      return nowUs;
    }
  } catch (err) {
    logger.error(`Failed to load cursor from DB: ${err}`);
    return Date.now().toString();
  }
}

// 初期化
async function init() {
  cursor = await loadCursor();
  logger.info(`Cursor initialized: ${cursor} (${epochUsToDateTime(cursor)})`);

  const jetstream = new Jetstream({
    wantedCollections: [BOOKMARK, SERVICE, POST_COLLECTION],
    endpoint: JETSREAM_URL,
    cursor: Number(cursor),
    ws: WebSocket,
  });

  jetstream.on('open', () => {
    logger.info('Jetstream open');

    cursorUpdateInterval = setInterval(async () => {
      if (jetstream.cursor) {
        const currentCursor = jetstream.cursor.toString();
        logger.info(`Cursor updated to: ${currentCursor} (${epochUsToDateTime(currentCursor)})`);

        try {
          await prisma.jetstreamIndex.upsert({
            where: { service: 'rito' },
            update: { index: currentCursor },
            create: { service: 'rito', index: currentCursor },
          });
        } catch (err) {
          logger.error(`Failed to load cursor from DB: ${err}`);
        }

        // 前回と同じなら再接続
        if (prev_time_us === currentCursor) {
          logger.info(`前回からtime_usが変動していませんので再接続します`);
          jetstream.close();
        }
        prev_time_us = currentCursor;
      }
    }, CURSOR_UPDATE_INTERVAL);
  });


  function isValidTangledUrl(url: string, userProfHandle: string): boolean {
    try {
      const u = new URL(url);

      // ドメインが tangled.org であることを確認
      if (u.hostname !== "tangled.org") return false;

      // パスを分解
      const parts = u.pathname.split("/").filter(Boolean);

      // 最低でも2要素必要（例: ["@rito.blue", "skeet.el"]）
      if (parts.length < 2) return false;

      // 1個目が @handle であることを確認
      if (parts[0] !== `@${userProfHandle}`) return false;

      return true;
    } catch {
      return false;
    }
  }

  async function upsertBookmark(event: CommitCreateEvent<typeof BOOKMARK> | CommitUpdateEvent<typeof BOOKMARK>) {
    const record = event.commit.record as BlueRitoFeedBookmark.Main;
    const aturi = `at://${event.did}/${event.commit.collection}/${event.commit.rkey}`;
    cursor = event.time_us.toString();

    let handle = 'no handle';
    let isVerify = false;

    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await fetch(`https://plc.directory/${event.did}`);
        if (res.ok) {
          const didData = await res.json();
          handle = didData.alsoKnownAs?.[0]?.replace(/^at:\/\//, '');
          logger.info(`Handle successed for DID: ${event.did}, handle: ${handle}`);
          break; // 成功したらループを抜ける
        } else {
          logger.warn(`Attempt ${attempt}: plc.directory fetch failed with status ${res.status}`);
        }
      } catch (err) {
        logger.warn(`Attempt ${attempt}: plc.directory fetch error for DID: ${event.did}`);
      }

    }

    if (!handle) {
      logger.warn(`Failed to fetch handle after ${maxAttempts} attempts for DID: ${event.did}`);
      try {
        const userProfile = await publicAgent.get(`app.bsky.actor.getProfile`, {
          params: { actor: event.did },
        });
        if (userProfile.ok && userProfile.data.handle) {
          handle = userProfile.data.handle;
        } else {
          logger.error(`Error fetching handle from publicAgent: ${event.did}`);
          return;
        }
      } catch (err) {
        logger.error(`Error fetching handle from publicAgent: ${err}`);
      }
    }

    // URL が正しいかチェック
    const subject = event.commit.record.subject || '';
    try {
      const url = new URL(subject);
      const domain = url.hostname;

      if ((url.pathname === '/' || url.pathname === '') &&
        (domain === handle || domain.endsWith(`.${handle}`))) {
        isVerify = true;
      } else if (isValidTangledUrl(subject, handle)) {
        isVerify = true;
      }
    } catch {
      // URL パースエラーは無視
    }

    try {
      // OGP用のmoderation
      const ogpTexts: string[] = [];
      if (record.ogpTitle) ogpTexts.push(record.ogpTitle);
      if (record.ogpDescription) ogpTexts.push(record.ogpDescription);
      const ogpFlaggedCategories = await checkModeration(ogpTexts);
      const ogpModerationResult = ogpFlaggedCategories.length > 0 ? ogpFlaggedCategories.join(',') : null;

      // DID->Handleテーブル
      await prisma.userDidHandle.upsert({
        where: { did: event.did },
        update: {},
        create: { did: event.did, handle: handle },
      });

      // Bookmark の upsert
      await prisma.bookmark.upsert({
        where: { uri: aturi },
        update: {
          subject: record.subject ?? '',
          ogp_title: record.ogpTitle,
          ogp_description: record.ogpDescription,
          ogp_image: record.ogpImage,
          moderation_result: ogpModerationResult,
          handle: handle,
          indexed_at: new Date(),
        },
        create: {
          uri: aturi,
          did: event.did,
          subject: record.subject ?? '',
          ogp_title: record.ogpTitle,
          ogp_description: record.ogpDescription,
          ogp_image: record.ogpImage,
          moderation_result: ogpModerationResult,
          handle: handle,
          created_at: new Date(),
          indexed_at: new Date(),
        },
      });

      // コメントの upsert（個別に moderation）
      for (const c of record.comments ?? []) {
        const commentTexts: string[] = [];
        if (c.title) commentTexts.push(c.title);
        if (c.comment) commentTexts.push(c.comment);

        const commentFlaggedCategories = await checkModeration(commentTexts);
        const commentModerationResult = commentFlaggedCategories.length > 0 ? commentFlaggedCategories.join(',') : null;

        // 既存コメントを lang ごとにチェック
        const existing = await prisma.comment.findFirst({
          where: {
            bookmark_uri: aturi,
            lang: c.lang,
          },
        });

        if (existing) {
          // update
          await prisma.comment.update({
            where: { id: existing.id },
            data: {
              title: c.title,
              comment: c.comment,
              moderation_result: commentModerationResult,
            },
          });
        } else {
          // create
          await prisma.comment.create({
            data: {
              bookmark_uri: aturi,
              lang: c.lang,
              title: c.title,
              comment: c.comment,
              moderation_result: commentModerationResult,
            },
          });
        }
      }

      // タグの更新
      let tagsLocal = (record.tags ?? []).filter((name) => name.toLowerCase() !== "verified");
      if (isVerify) tagsLocal.push("Verified");

      // タグの upsert
      const tagRecords = await Promise.all(tagsLocal.map(name =>
        prisma.tag.upsert({
          where: { name },
          update: {},
          create: { name },
        })
      ));

      // BookmarkTag の更新
      const oldTagIds = await prisma.bookmarkTag.findMany({
        where: { bookmark_uri: aturi },
        select: { tag_id: true },
      }).then(res => res.map(r => r.tag_id));

      const newTagIds = tagRecords.map(t => t.id);

      // 不要タグ削除
      const removeIds = oldTagIds.filter(id => !newTagIds.includes(id));
      if (removeIds.length > 0) {
        await prisma.bookmarkTag.deleteMany({
          where: { bookmark_uri: aturi, tag_id: { in: removeIds } },
        });
      }

      // 新規タグ追加
      const addIds = newTagIds.filter(id => !oldTagIds.includes(id));
      for (const id of addIds) {
        await prisma.bookmarkTag.create({ data: { bookmark_uri: aturi, tag_id: id } });
      }

      logger.info(`Upserted bookmark: ${aturi}, Verify: ${isVerify},  OGP moderation: ${ogpModerationResult}`);
    } catch (err) {
      logger.error(`Error in upsert: ${err}`);
    }
  }


  async function upsertPost(
    event: CommitCreateEvent<typeof POST_COLLECTION> | CommitUpdateEvent<typeof POST_COLLECTION>
  ) {
    const record = event.commit.record as any;
    const aturi = `at://${event.did}/${event.commit.collection}/${event.commit.rkey}`;

    try {
      // facets と embed からリンク抽出
      const links: string[] = [];

      if (record.facets) {
        for (const facet of record.facets) {
          if (facet.features) {
            for (const feature of facet.features) {
              if (feature.$type === 'app.bsky.richtext.facet#link' && feature.uri) {
                links.push(feature.uri);
              }
            }
          }
        }
      }

      if (record.embed?.$type === 'app.bsky.embed.external' && record.embed.external?.uri) {
        links.push(record.embed.external.uri);
      }

      // 重複・undefined 排除
      const uniqueLinks = Array.from(new Set(links.filter((l): l is string => !!l)));
      if (uniqueLinks.length === 0) return;

      // Bookmark チェック（空配列回避済み）
      const matchingBookmarks = await prisma.bookmark.findMany({
        where: { subject: { in: uniqueLinks } },
      });
      if (!matchingBookmarks || matchingBookmarks.length === 0) return;

      // UserDidHandle upsert
      let handle = 'no handle';

      const maxAttempts = 2;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const res = await fetch(`https://plc.directory/${event.did}`);
          if (res.ok) {
            const didData = await res.json();
            handle = didData.alsoKnownAs?.[0]?.replace(/^at:\/\//, '');
            logger.info(`Handle successed for DID: ${event.did}, handle: ${handle}`);
            break; // 成功したらループを抜ける
          } else {
            logger.warn(`Attempt ${attempt}: plc.directory fetch failed with status ${res.status}`);
          }
        } catch (err) {
          logger.warn(`Attempt ${attempt}: plc.directory fetch error for DID: ${event.did}`);
        }

      }

      if (!handle) {
        logger.warn(`Failed to fetch handle after ${maxAttempts} attempts for DID: ${event.did}`);
        try {
          const userProfile = await publicAgent.get(`app.bsky.actor.getProfile`, {
            params: { actor: event.did },
          });
          if (userProfile.ok && userProfile.data.handle) {
            handle = userProfile.data.handle;
          } else {
            logger.error(`Error fetching handle from publicAgent: ${event.did}`);
            return;
          }
        } catch (err) {
          logger.error(`Error fetching handle from publicAgent: ${err}`);
        }
      }

      await prisma.userDidHandle.upsert({
        where: { did: event.did },
        update: { handle },
        create: { did: event.did, handle },
      });

      // Post の moderation チェック
      const postTexts = record.text ? [record.text] : [];
      const postFlaggedCategories = await checkModeration(postTexts);
      const postModerationResult = postFlaggedCategories.length > 0 ? postFlaggedCategories.join(',') : null;

      // 既存 PostUri 削除
      await prisma.postUri.deleteMany({ where: { postUri: aturi } });

      // Post upsert
      await prisma.post.upsert({
        where: { uri: aturi },
        update: {
          handle,
          text: record.text || '',
          lang: Array.isArray(record.langs) ? record.langs : [],
          moderation_result: postModerationResult,
          indexed_at: new Date(),
        },
        create: {
          uri: aturi,
          did: event.did,
          handle,
          text: record.text || '',
          lang: Array.isArray(record.langs) ? record.langs : [],
          moderation_result: postModerationResult,
          indexed_at: new Date(),
        },
      });

      // PostUri 作成（空配列チェック）
      if (uniqueLinks.length > 0) {
        await prisma.postUri.createMany({
          data: uniqueLinks.map(uri => ({ postUri: aturi, uri })),
          skipDuplicates: true,
        });
      }

      logger.info(
        `Upserted post: ${aturi}, handle: ${handle}, uris: ${uniqueLinks.join(', ')}, moderation: ${postModerationResult}`
      );
    } catch (err) {
      logger.error(`Error in upsertPost for ${aturi}: ${err}`);
    }
  }

  // イベント登録
  jetstream.onCreate(BOOKMARK, upsertBookmark);
  jetstream.onUpdate(BOOKMARK, upsertBookmark);

  jetstream.onCreate(POST_COLLECTION, upsertPost);
  jetstream.onUpdate(POST_COLLECTION, upsertPost);

  jetstream.onCreate(SERVICE, upsertResolver);
  jetstream.onUpdate(SERVICE, upsertResolver);

  // TXT レコード取得関数
  const fetchTxtRecords = async (subDomain: string): Promise<string | null> => {
    try {
      const response = await fetch(`https://dns.google/resolve?name=${subDomain}&type=TXT`);
      const data = await response.json();
      if (!data.Answer || data.Answer.length === 0) return null;

      const txtData = data.Answer.map((a: any) => a.data)
        .join("")
        .replace(/^"|"$/g, "")
        .replace(/"/g, "");

      const didMatch = txtData.match(/did:[\w:.]+/);
      return didMatch ? didMatch[0] : null;
    } catch (error) {
      logger.error(`TXTレコードの取得に失敗しました (${subDomain}): ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  };


  async function upsertResolver(
    event: CommitCreateEvent<typeof SERVICE> | CommitUpdateEvent<typeof SERVICE>
  ) {
    const record = event.commit.record as any;
    const nsid = event.commit.rkey;
    const did = event.did;
    const schema = record.schema || '';
    let verified = false;
    let handle = '';

    if (!nsid || !did) {
      logger.warn(`Missing nsid or did in resolver event: ${JSON.stringify(record)}`);
      return;
    }


    // verified がまだ false なら DNS TXT レコードもチェック
    const parts = nsid.split('.').reverse(); // uk.skyblur.post -> ['post', 'skyblur', 'uk']
    const subDomain = `_lexicon.${parts.slice(1).join('.')}`;
    const foundDid = await fetchTxtRecords(subDomain);

    if (foundDid && foundDid === did) {
      verified = true;
      logger.info(`Verified via DNS TXT: ${subDomain} -> ${foundDid}`);
    }

    if (!verified) {
      try {
        const res = await fetch(`https://plc.directory/${event.did}`);
        if (res.ok) {
          const didData = await res.json();
          handle = didData.alsoKnownAs?.[0]?.replace(/^at:\/\//, '');
        }

        if (!handle) {
          // まずユーザープロフィールから handle を取得
          const userProfile = await publicAgent.get('app.bsky.actor.getProfile', {
            params: { actor: did },
          });

          if (userProfile.ok) {
            handle = userProfile.data.handle;

          }

        }

        const reversedHandle = handle.split('.').reverse().join('.');
        if (handle && nsid.startsWith(reversedHandle)) {
          logger.info(`Verified via Profile: ${did} -> ${reversedHandle}`);
          verified = true;
        }
      } catch (err) {
        logger.error(`Error fetching profile for ${did}: ${err}`);
      }
    }

    try {
      await prisma.resolver.upsert({
        where: { nsid_did: { nsid, did } },
        update: { schema, verified, indexed_at: new Date() },
        create: { nsid, did, schema, verified, indexed_at: new Date() },
      });

      logger.info(
        `Upserted resolver: nsid=${nsid}, ${did}, handle=${handle}, verified=${verified}`
      );
    } catch (err) {
      logger.error(`Error in upsertResolver for nsid=${nsid}, did=${did}: ${err}`);
    }
  }



  jetstream.onDelete(BOOKMARK, async (event: CommitDeleteEvent<typeof BOOKMARK>) => {
    cursor = event.time_us.toString();
    const aturi = `at://${event.did}/${event.commit.collection}/${event.commit.rkey}`;

    try {
      const result = await prisma.bookmark.deleteMany({ where: { uri: aturi } });
      if (result.count > 0) {
        logger.info(`Deleted bookmark: ${aturi} (${result.count} records)`);
      }
    } catch (err) {
      logger.error(`Error in onDelete bookmark: ${err}`);
    }
  });

  jetstream.onDelete(SERVICE, async (event: CommitDeleteEvent<typeof SERVICE>) => {
    const nsid = event.commit.rkey;
    const did = event.did;

    try {
      const result = await prisma.resolver.deleteMany({
        where: { nsid, did },
      });

      if (result.count > 0) {
        logger.info(`Deleted resolver: nsid=${nsid}, did=${did} (${result.count} records)`);
      }
    } catch (err) {
      logger.error(`Error in onDelete resolver: ${err}`);
    }
  });


  jetstream.onDelete(POST_COLLECTION, async (event: CommitDeleteEvent<typeof POST_COLLECTION>) => {
    cursor = event.time_us.toString();
    const aturi = `at://${event.did}/${event.commit.collection}/${event.commit.rkey}`;

    try {
      // 1. Post に紐づく PostUri を先に削除
      const deletedUris = await prisma.postUri.deleteMany({
        where: { postUri: aturi }, // PostUri.postUri が外部キー
      });

      // 2. Post を削除
      const deletedPosts = await prisma.post.deleteMany({
        where: { uri: aturi },
      });
      if (deletedPosts.count > 0) {
        logger.info(`Deleted post: ${aturi} (${deletedPosts.count} records)`);
      } else {
        //logger.info(`No post found for deletion: ${aturi}`);
      }
    } catch (err) {
      logger.error(`Error in onDelete post for ${aturi}: ${err}`);
    }
  });


  jetstream.on('close', () => {
    clearInterval(cursorUpdateInterval);
    logger.warn(`Jetstream connection closed.`);
    process.exit(1);
  });

  jetstream.on('error', (error) => {
    logger.error(`Jetstream error: ${error.message}`);
    jetstream.close();
    process.exit(1);
  });

  jetstream.start();
}

init().catch(err => {
  logger.error('Failed to initialize Jetstream:', err);
  process.exit(1);
});