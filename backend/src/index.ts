import { Jetstream, type CursorStore } from '@bsky/jetstream';
import { BOOKMARK, CURSOR_UPDATE_INTERVAL, JETSREAM_URL, LIKE, POST_COLLECTION, SERVICE } from './config.js';
import { prisma } from './db.js';
import {
  deleteBookmark,
  queueUnclassifiedBookmarkAnalysis,
  upsertBookmark,
} from './handlers/bookmark.js';
import { deleteLike, upsertLike } from './handlers/like.js';
import { deletePost, upsertPost } from './handlers/post.js';
import { deleteResolver, upsertResolver } from './handlers/resolver.js';
import type { BlueRitoFeedLike, BlueRitoServiceSchema } from './lexicons/index.js';
import logger from './logger.js';
import { enqueueTask, mainQueue, postQueue } from './runtime/queues.js';
import type {
  BookmarkRecord,
  CommitDeleteEvent,
  CommitPutEvent,
  JetstreamCommitEvent,
} from './types.js';
import { isRitoPostCandidate } from './utils.js';

let cursor = '0';
let previousCursor = '0';
let cursorUpdateInterval: NodeJS.Timeout;

(prisma as any).$on('error', (error: any) => {
  logger.error(`Prisma error event: ${error?.message || error}`);
  process.exit(1);
});

function formatCursor(value: string | number): string {
  const number = Number(value);
  if (number >= 1e15) return new Date(number / 1000).toISOString();
  return `seq:${value}`;
}

async function loadCursor(): Promise<string> {
  try {
    const record = await prisma.jetstreamIndex.findUnique({ where: { service: 'rito' } });
    if (record?.index) {
      logger.info(`Cursor from DB: ${record.index} (${formatCursor(record.index)})`);
      return record.index;
    }
    const now = (Date.now() * 1000).toString();
    logger.info(`No DB cursor found, using current time: ${now} (${formatCursor(now)})`);
    return now;
  } catch (error) {
    logger.error(`Failed to load cursor from DB: ${error}`);
    return (Date.now() * 1000).toString();
  }
}

function startCursorPersistence(): void {
  if (cursorUpdateInterval) clearInterval(cursorUpdateInterval);

  cursorUpdateInterval = setInterval(() => {
    if (!cursor) return;
    const currentCursor = cursor;
    if (previousCursor === currentCursor) {
      logger.error(`前回からcursorが変動していませんので、再起動のためにプロセスを終了します: ${currentCursor}`);
      process.exit(1);
    }

    void mainQueue.add(async () => {
      try {
        await prisma.jetstreamIndex.upsert({
          where: { service: 'rito' },
          update: { index: currentCursor },
          create: { service: 'rito', index: currentCursor },
        });
        logger.info(`Cursor updated to: ${currentCursor} (${formatCursor(currentCursor)})`);
      } catch (error) {
        logger.error(`Failed to upsert cursor in DB: ${error}`);
      }
    });
    previousCursor = currentCursor;
  }, CURSOR_UPDATE_INTERVAL);
}

async function routeEvent(
  event: JetstreamCommitEvent,
  postCollectionEnabled: boolean,
): Promise<void> {
  if (!event || event.kind !== 'commit') return;
  const { collection, operation } = event.commit;

  if (collection === BOOKMARK) {
    if (operation === 'create' || operation === 'update') {
      enqueueTask('main', mainQueue, () => upsertBookmark(event as CommitPutEvent<BookmarkRecord>));
    } else if (operation === 'delete') {
      enqueueTask('main', mainQueue, () => deleteBookmark(event as CommitDeleteEvent));
    }
    return;
  }

  if (collection === POST_COLLECTION) {
    if (!postCollectionEnabled) return;
    if (operation === 'create' || operation === 'update') {
      if (isRitoPostCandidate(event.commit.record)) {
        enqueueTask('post', postQueue, () => upsertPost(event as CommitPutEvent<unknown>));
      }
    } else if (operation === 'delete') {
      enqueueTask('post', postQueue, () => deletePost(event as CommitDeleteEvent));
    }
    return;
  }

  if (collection === SERVICE) {
    if (operation === 'create' || operation === 'update') {
      enqueueTask('main', mainQueue, () => upsertResolver(event as CommitPutEvent<BlueRitoServiceSchema.Main>));
    } else if (operation === 'delete') {
      enqueueTask('main', mainQueue, () => deleteResolver(event as CommitDeleteEvent));
    }
    return;
  }

  if (collection === LIKE) {
    if (operation === 'create' || operation === 'update') {
      enqueueTask('main', mainQueue, () => upsertLike(event as CommitPutEvent<BlueRitoFeedLike.Main>));
    } else if (operation === 'delete') {
      enqueueTask('main', mainQueue, () => deleteLike(event as CommitDeleteEvent));
    }
  }
}

async function init(): Promise<void> {
  cursor = await loadCursor();
  previousCursor = cursor;
  await queueUnclassifiedBookmarkAnalysis();

  const isLocal = process.env.IS_LOCAL === 'true' || process.env.NODE_ENV !== 'production';
  const isForceEnabled = process.env.ENABLE_POST_COLLECTION === 'true';
  const postCollectionEnabled = !isLocal || isForceEnabled;
  if (postCollectionEnabled) {
    logger.info(`POST_COLLECTION handlers are ENABLED (isLocal: ${isLocal}, isForceEnabled: ${isForceEnabled})`);
  } else {
    logger.info(`POST_COLLECTION handlers are DISABLED (isLocal: ${isLocal}, isForceEnabled: ${isForceEnabled}). Set ENABLE_POST_COLLECTION=true to force enable.`);
  }

  const cursorStore: CursorStore = {
    async load() {
      const value = Number(cursor);
      return Number.isNaN(value) || value <= 0 ? undefined : value;
    },
    async save(sequence) {
      cursor = sequence.toString();
    },
  };
  const jetstream = new Jetstream({ service: JETSREAM_URL });
  logger.info(`Jetstream v2 connecting to: ${JETSREAM_URL}`);
  startCursorPersistence();

  try {
    for await (const event of jetstream.live({
      collections: [BOOKMARK, SERVICE, LIKE, POST_COLLECTION],
      kinds: ['commit'],
      cursor: cursorStore,
      onError: (error) => {
        logger.error(`Jetstream error: ${error instanceof Error ? error.message : String(error)}`);
      },
    })) {
      await cursorStore.save(event.seq);
      if (event.kind !== 'commit') continue;
      await routeEvent(event, postCollectionEnabled);
    }
  } catch (error) {
    logger.error(`Jetstream live stream ended: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

void init();
