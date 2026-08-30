import { Client, simpleFetchHandler } from '@atcute/client';
import type * as AppBskyActorGetProfile from '@atcute/bluesky/types/app/actor/getProfile';
import type { XRPCQueries } from '@atcute/lexicons/ambient';
import type { ActorIdentifier } from '@atcute/lexicons/syntax';
import { prisma } from '../db.js';
import type { BlueRitoServiceSchema } from '../lexicons/index.js';
import logger from '../logger.js';
import type { CommitDeleteEvent, CommitPutEvent, DidDocument, DnsResponse } from '../types.js';

const publicAgent = new Client({
  handler: simpleFetchHandler({ service: 'https://public.api.bsky.app' }),
}) as Client<XRPCQueries>;

type ActorProfile = AppBskyActorGetProfile.$output;

async function fetchTxtRecords(subDomain: string): Promise<string | null> {
  try {
    const response = await fetch(`https://dns.google/resolve?name=${subDomain}&type=TXT`);
    const data = await response.json() as DnsResponse;
    if (!data.Answer || data.Answer.length === 0) return null;
    const text = data.Answer.map(({ data: answer }) => answer)
      .join('')
      .replace(/^"|"$/g, '')
      .replace(/"/g, '');
    return text.match(/did:[\w:.]+/)?.[0] ?? null;
  } catch (error) {
    logger.error(`TXTレコードの取得に失敗しました (${subDomain}): ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

export async function upsertResolver(event: CommitPutEvent<BlueRitoServiceSchema.Main>): Promise<void> {
  const record = event.commit.record;
  const nsid = event.commit.rkey;
  const did = event.did;
  let verified = false;
  let handle = '';

  if (!nsid || !did) {
    logger.warn(`Missing nsid or did in resolver event: ${JSON.stringify(record)}`);
    return;
  }

  const parts = nsid.split('.').reverse();
  const subDomain = `_lexicon.${parts.slice(1).join('.')}`;
  const foundDid = await fetchTxtRecords(subDomain);
  if (foundDid === did) {
    verified = true;
    logger.info(`Verified via DNS TXT: ${subDomain} -> ${foundDid}`);
  }

  if (!verified) {
    try {
      const response = await fetch(`https://plc.directory/${did}`);
      if (response.ok) {
        const didData = await response.json() as DidDocument;
        handle = didData.alsoKnownAs?.[0]?.replace(/^at:\/\//, '') ?? '';
      }
      if (!handle) {
        const userProfile = await publicAgent.get('app.bsky.actor.getProfile', {
          params: { actor: did as ActorIdentifier },
        });
        const profile = userProfile as typeof userProfile & { data?: ActorProfile };
        if (profile.ok && profile.data?.handle) handle = profile.data.handle;
      }
      const reversedHandle = handle.split('.').reverse().join('.');
      if (handle && nsid.startsWith(reversedHandle)) {
        verified = true;
        logger.info(`Verified handle: ${nsid} matches ${reversedHandle}`);
      } else {
        logger.warn(`Verification failed: ${nsid} does not match ${reversedHandle}`);
      }
    } catch (error) {
      logger.error(`Verification error for ${did}: ${error}`);
    }
  }

  if (!verified) return;
  try {
    await prisma.resolver.upsert({
      where: { nsid_did: { nsid, did } },
      update: { schema: record.schema || '', verified, indexed_at: new Date() },
      create: { nsid, did, schema: record.schema || '', verified, indexed_at: new Date() },
    });
    logger.info(`Upserted resolver: ${nsid} -> ${did}`);
  } catch (error) {
    logger.error(`Error in upsertResolver: ${error}`);
  }
}

export async function deleteResolver(event: CommitDeleteEvent): Promise<void> {
  const nsid = event.commit.rkey;
  try {
    await prisma.resolver.deleteMany({ where: { nsid, did: event.did } });
    logger.info(`Deleted resolver: ${nsid} -> ${event.did}`);
  } catch (error) {
    logger.error(`Error in deleteResolver: ${error}`);
  }
}
