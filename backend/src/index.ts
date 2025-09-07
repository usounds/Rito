import { PrismaClient } from "@prisma/client";
import { CommitCreateEvent, CommitDeleteEvent, CommitUpdateEvent, Jetstream } from '@skyware/jetstream';
import WebSocket from 'ws';
import { BOOKMARK, CURSOR_UPDATE_INTERVAL, JETSREAM_URL, SERVICE } from './config';
import { BlueRitoFeedBookmark } from './lexicons';
import logger from './logger';
import OpenAI from "openai";
import { Client, simpleFetchHandler } from '@atcute/client';

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
    logger.error('Failed to load cursor from DB:', err);
    return Date.now().toString();
  }
}

// 初期化
async function init() {
  cursor = await loadCursor();
  logger.info(`Cursor initialized: ${cursor} (${epochUsToDateTime(cursor)})`);

  const jetstream = new Jetstream({
    wantedCollections: [BOOKMARK, SERVICE],
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
          logger.error('Failed to update JetstreamIndex:', err);
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

    try {

      // Bookmark の upsert
      await prisma.bookmark.upsert({
        where: { uri: aturi },
        update: {
          subject: record.subject ?? '',
          ogp_title: record.ogpTitle,
          ogp_description: record.ogpDescription,
          ogp_image: record.ogpImage,
          indexed_at: new Date(),
        },
        create: {
          uri: aturi,
          did: event.did,
          subject: record.subject ?? '',
          ogp_title: record.ogpTitle,
          ogp_description: record.ogpDescription,
          ogp_image: record.ogpImage,
          created_at: new Date(),
          indexed_at: new Date(),
        },
      });

      // コメントの更新
      await prisma.comment.deleteMany({ where: { bookmark_uri: aturi } });
      await prisma.comment.createMany({
        data: (record.comments ?? []).map(c => ({
          bookmark_uri: aturi,
          lang: c.lang,
          title: c.title,
          comment: c.comment,
        })),
      });

      // タグの更新
      //verifiedが含まれていたら除外する

      const publicAgent = new Client({
        handler: simpleFetchHandler({
          service: 'https://public.api.bsky.app',
        }),
      })

      let isVerify = false



      try {
        // URLが正しいかチェック
        const url = new URL(event.commit.record.subject || '')
        const domain = url.hostname

        if (url.pathname === '/' || url.pathname === '') {

          const userProfile = await publicAgent.get(`app.bsky.actor.getProfile`, {
            params: {
              actor: event.did,
            },
          })

          if (userProfile.ok && (domain == userProfile.data.handle || domain.endsWith('.' + userProfile.data.handle))) {
            isVerify = true
          }
        }
      } catch {

      }

      let tagsLocal = (record.tags ?? [])
        .filter((name) => name.toLowerCase() !== "verified"); // まず既存の "verified" は削除

      if (isVerify) {
        // true の場合は必ず追加
        tagsLocal.push("Verified");
      }

      // タグの upsert
      const tagRecords = await Promise.all((tagsLocal?? []).map(name =>
        prisma.tag.upsert({
          where: { name },
          update: {},
          create: { name },
        })
      ));

      const oldTagIds = await prisma.bookmarkTag.findMany({
        where: { bookmark_uri: aturi },
        select: { tag_id: true },
      }).then(res => res.map(r => r.tag_id));

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

      const textsToCheck: string[] = [];

      if (record.ogpTitle) textsToCheck.push(record.ogpTitle);
      if (record.ogpDescription) textsToCheck.push(record.ogpDescription);

      if (record.comments) {
        record.comments.forEach(comment => {
          if (comment.title) textsToCheck.push(comment.title);
          if (comment.comment) textsToCheck.push(comment.comment);
        });
      }

      const flaggedCategories = await checkModeration(textsToCheck);
      logger.info(`Moderation result : ${flaggedCategories}`);
      await prisma.bookmark.upsert({
        where: { uri: aturi },
        update: {
          moderation: flaggedCategories.join(','), // カンマ区切りで保存
        },
        create: {
          uri: aturi,
          did: event.did,
          subject: record.subject ?? '',
          ogp_title: record.ogpTitle,
          ogp_description: record.ogpDescription,
          ogp_image: record.ogpImage,
          created_at: new Date(),
          indexed_at: new Date(),
          moderation: flaggedCategories.join(','), // カンマ区切りで保存
        },
      });

      logger.info(`Upserted: ${aturi}`);
    } catch (err) {
      logger.error('Error in upsertBookmark:', err);
    }
  }

  // イベント登録
  jetstream.onCreate(BOOKMARK, upsertBookmark);
  jetstream.onUpdate(BOOKMARK, upsertBookmark);

  jetstream.onDelete(BOOKMARK, async (event: CommitDeleteEvent<typeof BOOKMARK>) => {
    cursor = event.time_us.toString();
    const aturi = `at://${event.did}/${event.commit.collection}/${event.commit.rkey}`;

    try {
      await prisma.bookmark.deleteMany({ where: { uri: aturi } });
      logger.info(`Deleted: ${aturi}`);
    } catch (err) {
      logger.error('Error in onDelete:', err);
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
