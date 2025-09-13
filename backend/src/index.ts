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

  async function upsertBookmark(event: CommitCreateEvent<typeof BOOKMARK> | CommitUpdateEvent<typeof BOOKMARK>) {
    const record = event.commit.record as BlueRitoFeedBookmark.Main;
    const aturi = `at://${event.did}/${event.commit.collection}/${event.commit.rkey}`;
    cursor = event.time_us.toString();

    let handle = 'no handle';
    let isVerify = false;

    try {
      // ユーザー情報取得
      const userProfile = await publicAgent.get(`app.bsky.actor.getProfile`, {
        params: { actor: event.did },
      });

      if (userProfile.ok) {
        handle = userProfile.data.handle;

        // URL が正しいかチェック
        try {
          const url = new URL(event.commit.record.subject || '');
          const domain = url.hostname;

          if (url.pathname === '/' || url.pathname === '') {
            if (domain === handle || domain.endsWith('.' + handle)) {
              isVerify = true;
            }
          }
        } catch {
          // URL パースエラーは無視
        }
      }
    } catch (err) {
      logger.error(`Error fetching userProfile: ${err}`);
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
        create: { did: event.did, handle: handle }, // handle は取得済み
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

      // コメントの更新（個別にmoderation）
      await prisma.comment.deleteMany({ where: { bookmark_uri: aturi } });

      const commentsData = await Promise.all((record.comments ?? []).map(async (c) => {
        const commentTexts: string[] = [];
        if (c.title) commentTexts.push(c.title);
        if (c.comment) commentTexts.push(c.comment);
        const commentFlaggedCategories = await checkModeration(commentTexts);
        const commentModerationResult = commentFlaggedCategories.length > 0 ? commentFlaggedCategories.join(',') : null;

        return {
          bookmark_uri: aturi,
          lang: c.lang,
          title: c.title,
          comment: c.comment,
          moderation_result: commentModerationResult,
        };
      }));

      await prisma.comment.createMany({
        data: commentsData,
      });

      // タグの更新
      let tagsLocal = (record.tags ?? [])
        .filter((name) => name.toLowerCase() !== "verified"); // まず既存の "verified" は削除

      if (isVerify) {
        // true の場合は必ず追加
        tagsLocal.push("Verified");
      }

      // タグの upsert
      const tagRecords = await Promise.all((tagsLocal ?? []).map(name =>
        prisma.tag.upsert({
          where: { name },
          update: {},
          create: { name },
        })
      ));

      const oldTagIds: number[] = await prisma.bookmarkTag.findMany({
        where: { bookmark_uri: aturi },
        select: { tag_id: true },
      }).then((res: { tag_id: number }[]) => res.map(r => r.tag_id));

      const newTagIds = tagRecords.map(t => t.id);

      // 不要なタグ削除
      const removeIds = oldTagIds.filter(id => !newTagIds.includes(id));
      if (removeIds.length > 0) {
        await prisma.bookmarkTag.deleteMany({
          where: { bookmark_uri: aturi, tag_id: { in: removeIds } },
        });
      }

      // 追加タグ登録
      const addIds = newTagIds.filter(id => !oldTagIds.includes(id));
      for (const id of addIds) {
        await prisma.bookmarkTag.create({ data: { bookmark_uri: aturi, tag_id: id } });
      }

      logger.info(`Upserted bookmark: ${aturi}, OGP moderation: ${ogpModerationResult}`);
    } catch (err) {
      logger.error(`Error in upsert:${err}`);
    }
  }

  async function upsertPost(event: CommitCreateEvent<typeof POST_COLLECTION> | CommitUpdateEvent<typeof POST_COLLECTION>) {
    const record = event.commit.record as any;
    const aturi = `at://${event.did}/${event.commit.collection}/${event.commit.rkey}`;
    //cursor = event.time_us.toString();

    try {
      // facetsからリンクを抽出
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

      // embedのexternalのuriも抽出
      if (record.embed && record.embed.$type === 'app.bsky.embed.external' && record.embed.external && record.embed.external.uri) {
        links.push(record.embed.external.uri);
      }

      // Bookmarkのsubjectに含まれるリンクがあるかチェック
      if (links.length === 0) return;

      const matchingBookmarks = await prisma.bookmark.findMany({
        where: {
          subject: {
            in: links
          }
        }
      });

      if (matchingBookmarks.length === 0) return;

      let handle = 'no handle'

      try {
        const userProfile = await publicAgent.get(`app.bsky.actor.getProfile`, {
          params: {
            actor: event.did,
          },
        });
        if (userProfile.ok) {
          handle = userProfile.data.handle
        }
      } catch (err) {
        logger.error(`Error in upsert:${err}`);

      }

      // Postのmoderationチェック
      const postTexts: string[] = [];
      if (record.text) postTexts.push(record.text);
      const postFlaggedCategories = await checkModeration(postTexts);
      const postModerationResult = postFlaggedCategories.length > 0 ? postFlaggedCategories.join(',') : null;

      // Post の upsert
      await prisma.post.upsert({
        where: { uri: aturi },
        update: {
          handle: handle,
          text: record.text || '',
          lang: record.langs || [],
          urls: links,
          moderation_result: postModerationResult,
          indexed_at: new Date(),
        },
        create: {
          uri: aturi,
          handle: handle,
          text: record.text || '',
          lang: record.langs || [],
          urls: links,
          moderation_result: postModerationResult,
          indexed_at: new Date(),
        },
      });

      logger.info(`Upserted post: ${aturi}, handle: ${handle}, urls: ${links.join(', ')}, moderation: ${postModerationResult}`);
    } catch (err) {
      logger.error(`Error in upsertPost: ${err}`);
    }
  }

  // イベント登録
  jetstream.onCreate(BOOKMARK, upsertBookmark);
  jetstream.onUpdate(BOOKMARK, upsertBookmark);

  jetstream.onCreate(POST_COLLECTION, upsertPost);
  jetstream.onUpdate(POST_COLLECTION, upsertPost);

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

  jetstream.onDelete(POST_COLLECTION, async (event: CommitDeleteEvent<typeof POST_COLLECTION>) => {
    cursor = event.time_us.toString();
    const aturi = `at://${event.did}/${event.commit.collection}/${event.commit.rkey}`;

    try {
      const result = await prisma.post.deleteMany({ where: { uri: aturi } });
      if (result.count > 0) {
        logger.info(`Deleted post: ${aturi} (${result.count} records)`);
      }
    } catch (err) {
      logger.error(`Error in onDelete post: ${err}`);
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