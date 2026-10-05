import { Jetstream, type CursorStore } from '@bsky/jetstream';
import {
  BOOKMARK,
  CURSOR_UPDATE_INTERVAL,
  DEFAULT_JETSTREAM_URLS,
  JETSREAM_URL,
  LIKE,
  POST_COLLECTION,
  SERVICE,
} from './config.js';
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
let latestEventTimeUs = (Date.now() * 1000).toString();
let lastFrameReceivedAt = Date.now();
let consecutiveStallCount = 0;
let currentHostIndex = 0;
let useTimestampCursor = false;
let currentAbortController: AbortController | null = null;
let cursorUpdateInterval: NodeJS.Timeout;

const FALLBACK_HOSTS: string[] = Array.from(
  new Set([JETSREAM_URL, ...DEFAULT_JETSTREAM_URLS]),
);

const STALL_TIMEOUT_MS = Math.max(CURSOR_UPDATE_INTERVAL * 1.5, 90000);

(prisma as any).$on('error', (error: any) => {
  logger.error(`Prisma error event: ${error?.message || error}`);
  process.exit(1);
});

function formatCursor(value: string | number): string {
  const number = Number(value);
  if (number >= 1e14) return new Date(number / 1000).toISOString();
  return `seq:${value}`;
}

interface CursorInfo {
  cursor: string;
  timeUs: string;
}

async function loadCursor(): Promise<CursorInfo> {
  try {
    const record = await prisma.jetstreamIndex.findUnique({ where: { service: 'rito' } });
    if (record?.index) {
      const rawIndex = record.index;
      let cursorVal: string;
      let timeUsVal: string;

      if (rawIndex.includes(':')) {
        const parts = rawIndex.split(':');
        cursorVal = parts[0];
        timeUsVal = parts[1] || parts[0];
      } else {
        cursorVal = rawIndex;
        timeUsVal = rawIndex;
      }

      logger.info(`Cursor from DB: ${cursorVal} (raw: ${rawIndex}) (${formatCursor(cursorVal)})`);
      return { cursor: cursorVal, timeUs: timeUsVal };
    }
    const now = (Date.now() * 1000).toString();
    logger.info(`No DB cursor found, using current time: ${now} (${formatCursor(now)})`);
    return { cursor: now, timeUs: now };
  } catch (error) {
    logger.error(`Failed to load cursor from DB: ${error}`);
    const now = (Date.now() * 1000).toString();
    return { cursor: now, timeUs: now };
  }
}

function triggerReconnect(reason: string): void {
  consecutiveStallCount++;
  logger.warn(
    `Triggering stream reconnect. Reason: ${reason} (consecutive stalls: ${consecutiveStallCount})`,
  );

  if (consecutiveStallCount === 1) {
    useTimestampCursor = true;
    logger.warn(
      `[Level 1 Fallback] Switching cursor to microsecond timestamp: ${latestEventTimeUs} (${formatCursor(latestEventTimeUs)}) on host: ${FALLBACK_HOSTS[currentHostIndex]}`,
    );
  } else {
    currentHostIndex = (currentHostIndex + 1) % FALLBACK_HOSTS.length;
    useTimestampCursor = true;
    logger.warn(
      `[Level 2 Fallback] Switching host to: ${FALLBACK_HOSTS[currentHostIndex]} with timestamp: ${latestEventTimeUs} (${formatCursor(latestEventTimeUs)})`,
    );
  }

  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
}

function startCursorPersistence(): void {
  if (cursorUpdateInterval) clearInterval(cursorUpdateInterval);

  cursorUpdateInterval = setInterval(() => {
    if (!cursor || cursor === '0') return;
    const currentCursor = cursor;
    const now = Date.now();
    const timeSinceLastFrame = now - lastFrameReceivedAt;

    if (previousCursor !== currentCursor) {
      const indexToSave = `${currentCursor}:${latestEventTimeUs}`;

      void mainQueue.add(async () => {
        try {
          await prisma.jetstreamIndex.upsert({
            where: { service: 'rito' },
            update: { index: indexToSave },
            create: { service: 'rito', index: indexToSave },
          });
          logger.info(`Cursor updated to: ${indexToSave} (${formatCursor(currentCursor)})`);
        } catch (error) {
          logger.error(`Failed to upsert cursor in DB: ${error}`);
        }
      });
      previousCursor = currentCursor;
      consecutiveStallCount = 0;
      return;
    }

    if (timeSinceLastFrame < STALL_TIMEOUT_MS) {
      logger.info(
        `Cursor unchanged (${currentCursor}), but frames are active (${Math.round(timeSinceLastFrame / 1000)}s since last frame). Continuing stream.`,
      );
      return;
    }

    logger.warn(
      `Jetstream stall detected: no frames received for ${Math.round(timeSinceLastFrame / 1000)}s (cursor: ${currentCursor}). Triggering reconnect...`,
    );
    triggerReconnect(`Stalled for ${Math.round(timeSinceLastFrame / 1000)}s`);
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

async function startStream(postCollectionEnabled: boolean): Promise<void> {
  while (true) {
    const serviceUrl = FALLBACK_HOSTS[currentHostIndex];
    const jetstream = new Jetstream({ service: serviceUrl });
    const abortController = new AbortController();
    currentAbortController = abortController;

    let startCursorVal: number | undefined;
    if (useTimestampCursor) {
      const timeNum = Number(latestEventTimeUs);
      if (!Number.isNaN(timeNum) && timeNum >= 1e14) {
        startCursorVal = timeNum;
      }
    }
    if (!startCursorVal) {
      const cursorNum = Number(cursor);
      if (!Number.isNaN(cursorNum) && cursorNum > 0) {
        startCursorVal = cursorNum;
      }
    }

    const cursorStore: CursorStore = {
      async load() {
        return startCursorVal;
      },
      async save(sequence) {
        cursor = sequence.toString();
        useTimestampCursor = false;
      },
    };

    logger.info(
      `Jetstream v2 connecting to: ${serviceUrl} (startCursor: ${startCursorVal ? formatCursor(startCursorVal) : 'none'})`,
    );

    try {
      for await (const event of jetstream.live({
        collections: [BOOKMARK, SERVICE, LIKE, POST_COLLECTION],
        kinds: ['commit'],
        cursor: cursorStore,
        signal: abortController.signal,
        onError: (error) => {
          logger.error(`Jetstream error: ${error instanceof Error ? error.message : String(error)}`);
        },
        onInfo: (info) => {
          logger.info(`Jetstream info advisory: ${JSON.stringify(info)}`);
          if (info.name === 'OutdatedCursor') {
            logger.warn(`OutdatedCursor advisory received. Triggering Level 1/2 fallback.`);
            triggerReconnect('OutdatedCursor advisory');
          }
        },
      })) {
        lastFrameReceivedAt = Date.now();
        await cursorStore.save(event.seq);

        if (event.time) {
          latestEventTimeUs = (new Date(event.time).getTime() * 1000).toString();
        } else if ('timeUs' in event && typeof (event as any).timeUs === 'number') {
          latestEventTimeUs = (event as any).timeUs.toString();
        } else {
          latestEventTimeUs = event.seq.toString();
        }

        if (event.kind !== 'commit') continue;
        await routeEvent(event as unknown as JetstreamCommitEvent, postCollectionEnabled);
      }
    } catch (error) {
      if (abortController.signal.aborted) {
        logger.info(`Jetstream stream intentionally aborted for reconnect.`);
      } else {
        logger.error(
          `Jetstream live stream ended with error: ${error instanceof Error ? error.message : String(error)}`,
        );
        triggerReconnect(`Stream error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

async function init(): Promise<void> {
  const cursorInfo = await loadCursor();
  cursor = cursorInfo.cursor;
  previousCursor = cursor;
  latestEventTimeUs = cursorInfo.timeUs;
  lastFrameReceivedAt = Date.now();
  await queueUnclassifiedBookmarkAnalysis();

  const isLocal = process.env.IS_LOCAL === 'true' || process.env.NODE_ENV !== 'production';
  const isForceEnabled = process.env.ENABLE_POST_COLLECTION === 'true';
  const postCollectionEnabled = !isLocal || isForceEnabled;
  if (postCollectionEnabled) {
    logger.info(`POST_COLLECTION handlers are ENABLED (isLocal: ${isLocal}, isForceEnabled: ${isForceEnabled})`);
  } else {
    logger.info(`POST_COLLECTION handlers are DISABLED (isLocal: ${isLocal}, isForceEnabled: ${isForceEnabled}). Set ENABLE_POST_COLLECTION=true to force enable.`);
  }

  startCursorPersistence();
  await startStream(postCollectionEnabled);
}

void init();
