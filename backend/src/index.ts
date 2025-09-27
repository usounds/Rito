import { PrismaClient } from "@prisma/client";
import { CommitCreateEvent, CommitDeleteEvent, CommitUpdateEvent, Jetstream } from '@skyware/jetstream';
import WebSocket from 'ws';
import { BOOKMARK, CURSOR_UPDATE_INTERVAL, JETSREAM_URL, SERVICE, POST_COLLECTION, LIKE } from './config';
import { BlueRitoFeedBookmark } from './lexicons';
import logger from './logger';
import OpenAI from "openai";
import { Client, simpleFetchHandler } from '@atcute/client';
import pLimit from "p-limit";
import PQueue from 'p-queue';
const queue = new PQueue({ concurrency: 1 });

const dbLimit = pLimit(5); // 同時に DB 操作は最大 5 件まで
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

  const jetstream = new Jetstream({
    wantedCollections: [BOOKMARK, SERVICE, LIKE],
    endpoint: JETSREAM_URL,
    cursor: Number(cursor),
    ws: WebSocket,
  });

  jetstream.on('open', () => {
    logger.info(`Jetstream open: ${JETSREAM_URL}`);

    cursorUpdateInterval = setInterval(() => {
      if (!jetstream.cursor) return;

      const currentCursor = jetstream.cursor.toString();

      // DB 更新はキュー経由で
      queue.add(async () => {
        try {
          await prisma.jetstreamIndex.upsert({
            where: { service: 'rito' },
            update: { index: currentCursor },
            create: { service: 'rito', index: currentCursor },
          });

          logger.info(`Cursor updated to: ${currentCursor} (${epochUsToDateTime(currentCursor)})`);
        } catch (err) {
          logger.error(`Failed to upsert cursor in DB: ${err}`);
        }
      });

      // 前回と同じなら再接続
      if (prev_time_us === currentCursor) {
        logger.info(`前回からtime_usが変動していませんので再接続します`);
        jetstream.close();
      }

      prev_time_us = currentCursor;
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
    //console.log("upsertBookmark")

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
      //console.log("DID->Handleテーブル")
      await dbLimit(() =>
        prisma.userDidHandle.upsert({
          where: { did: event.did },
          update: { handle: handle },
          create: { did: event.did, handle: handle },
        })
      );

      // Bookmark の upsert
      //console.log("Bookmark の upsert")
      await dbLimit(() =>
        prisma.bookmark.upsert({
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
            created_at: record.createdAt ? new Date(record.createdAt) : new Date(),
            indexed_at: new Date(),
          },
        })
      );

      // コメントの upsert（個別に moderation）
      for (const c of record.comments ?? []) {
        const commentTexts: string[] = [];
        if (c.title) commentTexts.push(c.title);
        if (c.comment) commentTexts.push(c.comment);

        const commentFlaggedCategories = await checkModeration(commentTexts);
        const commentModerationResult = commentFlaggedCategories.length > 0 ? commentFlaggedCategories.join(',') : null;

        // コメントの upsert
        //console.log("コメントの upsert")
        await dbLimit(() =>
          prisma.comment.upsert({
            where: {
              bookmark_uri_lang: {
                bookmark_uri: aturi,
                lang: c.lang,
              },
            },
            update: {
              title: c.title,
              comment: c.comment,
              moderation_result: commentModerationResult,
            },
            create: {
              bookmark_uri: aturi,
              lang: c.lang,
              title: c.title,
              comment: c.comment,
              moderation_result: commentModerationResult,
            },
          })
        );
      }

      async function safeUpsertTag(name: string) {
        try {
          return await dbLimit(() =>
            prisma.tag.upsert({
              where: { name },
              update: {},
              create: { name },
            })
          );
        } catch (err) {
          console.error(`Tag upsert failed for "${name}":`, err);
          return null; // エラーが出た場合は null を返す
        }
      }

      // タグの更新
      let tagsLocal = (record.tags ?? [])
        .filter((name) => name && name.trim().length > 0) // 空文字を除外
        .filter((name) => name.toLowerCase() !== "verified");

      if (isVerify) tagsLocal.push("Verified");

      // 順番に処理
      const tagRecords = [];
      for (const name of tagsLocal) {
        const tag = await safeUpsertTag(name);
        if (tag) tagRecords.push(tag);
      }

      // null を除外
      const validTagRecords = tagRecords.filter(
        (t): t is NonNullable<typeof t> => t !== null
      );

      // BookmarkTag の更新用
      const oldTagIds = await prisma.bookmarkTag.findMany({
        where: { bookmark_uri: aturi },
        select: { tag_id: true },
      }).then(res => res.map(r => r.tag_id));

      const newTagIds = validTagRecords.map(t => t.id);

      // 不要タグ削除
      const removeIds = oldTagIds.filter(id => !newTagIds.includes(id));
      if (removeIds.length > 0) {
        await dbLimit(() =>
          prisma.bookmarkTag.deleteMany({
            where: { bookmark_uri: aturi, tag_id: { in: removeIds } },
          })
        );
      }

      // 新規タグ追加
      const addIds = newTagIds.filter(id => !oldTagIds.includes(id));
      for (const id of addIds) {
        await dbLimit(() =>
          prisma.bookmarkTag.create({ data: { bookmark_uri: aturi, tag_id: id } })
        );
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
      const chunkSize = 50; // 1回のクエリで処理する件数

      const chunks = Array.from({ length: Math.ceil(uniqueLinks.length / chunkSize) }, (_, i) =>
        uniqueLinks.slice(i * chunkSize, i * chunkSize + chunkSize)
      );

      const results = await Promise.all(
        chunks.map(chunk =>
          dbLimit(() =>
            prisma.bookmark.findMany({ where: { subject: { in: chunk } } })
          )
        )
      );

      const matchingBookmarks = results.flat();
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

      await dbLimit(() =>
        prisma.userDidHandle.upsert({
          where: { did: event.did },
          update: { handle },
          create: { did: event.did, handle },
        })
      );

      // Post の moderation チェック
      const postTexts = record.text ? [record.text] : [];
      const postFlaggedCategories = await checkModeration(postTexts);
      const postModerationResult = postFlaggedCategories.length > 0 ? postFlaggedCategories.join(',') : null;

      // 既存 PostUri 削除
      await dbLimit(() =>
        prisma.postUri.deleteMany({ where: { postUri: aturi } })
      );

      // Post upsert
      await dbLimit(() =>
        prisma.post.upsert({
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
        })
      );

      // PostUri 作成（空配列チェック）
      if (uniqueLinks.length > 0) {
        await dbLimit(() =>
          prisma.postUri.createMany({
            data: uniqueLinks.map(uri => ({ postUri: aturi, uri })),
            skipDuplicates: true,
          })
        );
      }

      logger.info(
        `Upserted post: ${aturi}, handle: ${handle}, uris: ${uniqueLinks.join(', ')}, moderation: ${postModerationResult}`
      );
    } catch (err) {
      logger.error(`Error in upsertPost for ${aturi}: ${err}`);
    }
  }

  // イベント登録
  // BOOKMARK
  jetstream.onCreate(BOOKMARK, event => queue.add(() => upsertBookmark(event)));
  jetstream.onUpdate(BOOKMARK, event => queue.add(() => upsertBookmark(event)));

  // POST_COLLECTION
  //jetstream.onCreate(POST_COLLECTION, event => queue.add(() => upsertPost(event)));
  //jetstream.onUpdate(POST_COLLECTION, event => queue.add(() => upsertPost(event)));

  // SERVICE
  jetstream.onCreate(SERVICE, event => queue.add(() => upsertResolver(event)));
  jetstream.onUpdate(SERVICE, event => queue.add(() => upsertResolver(event)));

  jetstream.onCreate(LIKE, event => queue.add(() => upsertLike(event)));
  jetstream.onUpdate(LIKE, event => queue.add(() => upsertLike(event)));

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
      await dbLimit(() =>
        prisma.resolver.upsert({
          where: { nsid_did: { nsid, did } },
          update: { schema, verified, indexed_at: new Date() },
          create: { nsid, did, schema, verified, indexed_at: new Date() },
        })
      );

      logger.info(
        `Upserted resolver: nsid=${nsid}, ${did}, handle=${handle}, verified=${verified}`
      );
    } catch (err) {
      logger.error(`Error in upsertResolver for nsid=${nsid}, did=${did}: ${err}`);
    }
  }

  async function upsertLike(
    event: CommitCreateEvent<"blue.rito.feed.like"> | CommitUpdateEvent<"blue.rito.feed.like">
  ) {
    const record = event.commit.record as any;
    const aturi = `at://${event.did}/${event.commit.collection}/${event.commit.rkey}`;
    const subject = record?.subject;
    if (!subject) return;

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

    await dbLimit(() =>
      prisma.userDidHandle.upsert({
        where: { did: event.did },
        update: { handle: handle },
        create: { did: event.did, handle: handle },
      })
    );

    await dbLimit(() =>
      prisma.like.upsert({
        where: { aturi },
        update: { created_at: new Date(record.createdAt) },
        create: { aturi, subject: subject, did: event.did, created_at: new Date(record.createdAt) },
      })
    );

    logger.info(`Upserted like: ${aturi}, subject=${subject}, did=${event.did}`);
  }

  jetstream.onDelete(BOOKMARK, event =>
    queue.add(async () => {
      cursor = event.time_us.toString();
      const aturi = `at://${event.did}/${event.commit.collection}/${event.commit.rkey}`;
      try {
        const result = await dbLimit(() =>
          prisma.bookmark.deleteMany({ where: { uri: aturi } })
        );

        if (result.count > 0) {
          logger.info(`Deleted bookmark: ${aturi} (${result.count} records)`);
        }
      } catch (err) {
        logger.error(`Error in onDelete bookmark: ${err}`);
      }
    })
  );

  jetstream.onDelete(LIKE, event =>
    queue.add(async () => {
      const aturi = `at://${event.did}/${event.commit.collection}/${event.commit.rkey}`;
      try {
        const result = await dbLimit(() =>
          prisma.like.deleteMany({ where: { aturi } })
        );

        if (result.count > 0) {
          logger.info(`Deleted like: ${aturi} (${result.count} records)`);
        }
      } catch (err) {
        logger.error(`Error in onDelete like: ${err}`);
      }
    })
  );

  jetstream.onDelete(SERVICE, event =>
    queue.add(async () => {
      const nsid = event.commit.rkey;
      const did = event.did;
      try {
        const result = await dbLimit(() =>
          prisma.resolver.deleteMany({ where: { nsid, did } })
        );

        if (result.count > 0) {
          logger.info(`Deleted resolver: nsid=${nsid}, did=${did} (${result.count} records)`);
        }
      } catch (err) {
        logger.error(`Error in onDelete resolver: ${err}`);
      }
    })
  );

  /*  jetstream.onDelete(POST_COLLECTION, event =>
  queue.add(async () => {
    cursor = event.time_us.toString();
    const aturi = `at://${event.did}/${event.commit.collection}/${event.commit.rkey}`;
    try {
      // 1. Post に紐づく PostUri を先に削除
      await dbLimit(() =>
        prisma.postUri.deleteMany({ where: { postUri: aturi } })
      );

      // 2. Post を削除
      const deletedPosts = await dbLimit(() =>
        prisma.post.deleteMany({ where: { uri: aturi } })
      );

      if (deletedPosts.count > 0) {
        logger.info(`Deleted post: ${aturi} (${deletedPosts.count} records)`);
      }
    } catch (err) {
      logger.error(`Error in onDelete post for ${aturi}: ${err}`);
    }
  })
    );
    */


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