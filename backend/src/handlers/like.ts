import { prisma } from '../db.js';
import type { BlueRitoFeedLike } from '../lexicons/index.js';
import logger from '../logger.js';
import type { CommitDeleteEvent, CommitPutEvent } from '../types.js';

export async function upsertLike(event: CommitPutEvent<BlueRitoFeedLike.Main>): Promise<void> {
  const record = event.commit.record;
  const aturi = `at://${event.did}/${event.commit.collection}/${event.commit.rkey}`;
  const subject = typeof record.subject === 'string'
    ? record.subject
    : (record.subject as { uri: string }).uri;

  try {
    await prisma.like.upsert({
      where: { aturi },
      update: { subject, did: event.did, created_at: new Date(record.createdAt) },
      create: { aturi, subject, did: event.did, created_at: new Date(record.createdAt) },
    });
    logger.info(`Upserted like: ${aturi}, subject: ${subject}`);
  } catch (error) {
    logger.error(`Error in upsertLike: ${error}`);
  }
}

export async function deleteLike(event: CommitDeleteEvent): Promise<void> {
  const aturi = `at://${event.did}/${event.commit.collection}/${event.commit.rkey}`;
  try {
    await prisma.like.deleteMany({ where: { aturi } });
    logger.info(`Deleted like: ${aturi}`);
  } catch (error) {
    logger.error(`Error in deleteLike: ${error}`);
  }
}
