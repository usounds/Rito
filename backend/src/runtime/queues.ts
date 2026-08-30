import pLimit from 'p-limit';
import PQueue from 'p-queue';
import logger from '../logger.js';

const QUEUE_WARNING_SIZE = 1000;

export const mainQueue = new PQueue({ concurrency: 1 });
export const postQueue = new PQueue({ concurrency: 1 });
export const analysisQueue = new PQueue({ concurrency: 2 });
export const dbLimit = pLimit(5);

export function enqueueTask(name: string, target: PQueue, task: () => Promise<void>): void {
  if (target.size === QUEUE_WARNING_SIZE) {
    logger.warn(`${name} queue reached ${QUEUE_WARNING_SIZE} waiting tasks`);
  }

  void target.add(task).catch((error) => {
    logger.error(`${name} queue task failed: ${error instanceof Error ? error.message : String(error)}`);
  });
}
