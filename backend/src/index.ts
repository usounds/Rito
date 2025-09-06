import { PrismaClient } from "@prisma/client";
import { CommitCreateEvent, CommitUpdateEvent, CommitDeleteEvent } from '@skyware/jetstream';
import { Jetstream } from '@skyware/jetstream';
import WebSocket from 'ws';
import { BlueRitoFeedBookmark } from './lexicons';
import logger from './logger';
import { BOOKMARK, SERVICE, JETSREAM_URL, CURSOR_UPDATE_INTERVAL } from './config';

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

  // ----------- CREATE / UPDATE / DELETE イベント -----------
  jetstream.onCreate(BOOKMARK, async (event: CommitCreateEvent<typeof BOOKMARK>) => {
    cursor = event.time_us.toString();
    const record = event.commit.record as BlueRitoFeedBookmark.Main;
    const aturi = `at://${event.did}/${event.commit.collection}/${event.commit.rkey}`;

    try {
      const tagRecords = await Promise.all((record.tags ?? []).map(name =>
        prisma.tag.upsert({
          where: { name },
          update: {},
          create: { name }
        })
      ));

      await prisma.bookmark.create({
        data: {
          uri: aturi,
          did: event.did,
          subject: record.subject ?? '',
          ogp_title: record.ogpTitle,
          ogp_description: record.ogpDescription,
          ogp_image: record.ogpImage,
          created_at: new Date(record.createdAt),
          indexed_at: new Date(),
          comments: {
            create: record.comments.map((c: any) => ({
              lang: c.lang,
              title: c.title,
              comment: c.comment
            }))
          },
          tags: {
            create: tagRecords.map(t => ({ tag: { connect: { id: t.id } } }))
          }
        }
      });

      logger.info(`Created: ${aturi}`);
    } catch (err) {
      logger.error('Error in onCreate:', err);
    }
  });

  jetstream.onUpdate(BOOKMARK, async (event: CommitUpdateEvent<typeof BOOKMARK>) => {
    cursor = event.time_us.toString();
    const record = event.commit.record;
    const aturi = `at://${event.did}/${event.commit.collection}/${event.commit.rkey}`;

    try {
      const bookmark = await prisma.bookmark.findUnique({
        where: { uri: aturi },
        include: { tags: true, comments: true },
      });
      if (!bookmark) return;

      const tagRecords = await Promise.all((record.tags ?? []).map((name: string) =>
        prisma.tag.upsert({ where: { name }, update: {}, create: { name } })
      ));

      const oldTagIds = bookmark.tags.map(bt => bt.tag_id);
      const newTagIds = tagRecords.map(t => t.id);

      const removeIds = oldTagIds.filter(id => !newTagIds.includes(id));
      await prisma.bookmarkTag.deleteMany({ where: { bookmark_uri: bookmark.uri, tag_id: { in: removeIds } } });

      const addIds = newTagIds.filter(id => !oldTagIds.includes(id));
      for (const id of addIds) {
        await prisma.bookmarkTag.create({ data: { bookmark_uri: bookmark.uri, tag_id: id } });
      }

      await prisma.comment.deleteMany({ where: { bookmark_uri: bookmark.uri } });
      await prisma.comment.createMany({
        data: record.comments.map((c: any) => ({
          bookmark_uri: bookmark.uri,
          lang: c.lang,
          title: c.title,
          comment: c.comment
        }))
      });

      await prisma.bookmark.update({
        where: { uri: bookmark.uri },
        data: {
          subject: record.subject,
          ogp_title: record.ogpTitle,
          ogp_description: record.ogpDescription,
          ogp_image: record.ogpImage,
          indexed_at: new Date()
        }
      });

      logger.info(`Updated: ${aturi}`);
    } catch (err) {
      logger.error('Error in onUpdate:', err);
    }
  });

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
