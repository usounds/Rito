import type * as AppBskyEmbedExternal from '@atcute/bluesky/types/app/embed/external';
import type * as AppBskyFeedPost from '@atcute/bluesky/types/app/feed/post';
import type * as AppBskyRichTextFacet from '@atcute/bluesky/types/app/richtext/facet';
import { Agent } from '@atproto/api';
import { prisma } from '../db.js';
import { client as oauthClient } from '../lib/HandleOauthClientNode.js';
import logger from '../logger.js';
import type {
  CommitDeleteEvent,
  CommitPutEvent,
  DidDocument,
  DomainCheckResult,
  OgpResult,
} from '../types.js';
import { deriveBookmarkRkeyFromPost, normalizeComment } from '../utils.js';

const ritoApiBaseUrl = process.env.RITO_API_BASE_URL ?? 'https://rito.blue';

const isPostRecord = (value: unknown): value is AppBskyFeedPost.Main & { via?: string } =>
  !!value && typeof value === 'object' && '$type' in value && value.$type === 'app.bsky.feed.post';

const isEmbedExternal = (value: unknown): value is AppBskyEmbedExternal.Main =>
  !!value && typeof value === 'object' && '$type' in value && value.$type === 'app.bsky.embed.external';

const isTagFeature = (value: unknown): value is AppBskyRichTextFacet.Tag =>
  !!value && typeof value === 'object' && '$type' in value && value.$type === 'app.bsky.richtext.facet#tag';

export async function upsertPost(event: CommitPutEvent<unknown>): Promise<void> {
  const record = event.commit.record;
  if (!isPostRecord(record)) return;
  const aturi = `at://${event.did}/${event.commit.collection}/${event.commit.rkey}`;

  try {
    const tags: string[] = [];
    for (const facet of record.facets ?? []) {
      for (const feature of facet.features ?? []) {
        if (isTagFeature(feature) && feature.tag) tags.push(feature.tag);
      }
    }
    if (!tags.includes('rito.blue')) return;
    tags.splice(tags.indexOf('rito.blue'), 1);
    if (record.via === 'リト' || record.via === 'Rito') return;

    const links: string[] = [];
    if (record.embed && isEmbedExternal(record.embed) && record.embed.external?.uri) {
      links.push(record.embed.external.uri);
    }
    const uniqueLinks = Array.from(new Set(links));
    if (uniqueLinks.length !== 1) return;

    let handle = 'no handle';
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await fetch(`https://plc.directory/${event.did}`);
        if (response.ok) {
          const didData = await response.json() as DidDocument;
          handle = didData.alsoKnownAs?.[0]?.replace(/^at:\/\//, '') ?? handle;
          logger.info(`Handle successed for DID: ${event.did}, handle: ${handle}`);
          break;
        }
        logger.warn(`Attempt ${attempt}: plc.directory fetch failed with status ${response.status}`);
      } catch {
        logger.warn(`Attempt ${attempt}: plc.directory fetch error for DID: ${event.did}`);
      }
    }

    const preference = await prisma.postToBookmark.findUnique({
      where: { sub: event.did },
      select: { sub: true, lang: true },
    });
    if (!preference) return;

    logger.info(`Detect #rito.blue post: ${aturi}, link: ${uniqueLinks[0]}`);
    const urlString = uniqueLinks[0];
    let domain: string;
    try {
      domain = new URL(urlString).hostname;
    } catch {
      return;
    }
    const domainResponse = await fetch(`${ritoApiBaseUrl}/api/checkDomain?domain=${domain}`);
    const domainData = await domainResponse.json() as DomainCheckResult;
    if (domainData.result) {
      logger.warn(`Domain not allowed: ${domain} for post ${aturi}`);
      return;
    }

    let ogpTitle = '';
    let ogpDescription = '';
    let ogImage = '';
    try {
      const ogpResponse = await fetch(`${ritoApiBaseUrl}/api/fetchOgp?url=${encodeURIComponent(urlString)}`);
      const ogpData = await ogpResponse.json() as OgpResult;
      ogpTitle = ogpData.result?.ogTitle || '';
      ogpDescription = ogpData.result?.ogDescription || '';
      ogImage = ogpData.result?.ogImage?.[0]?.url || '';
    } catch {
      // Fall back to the embed metadata below.
    }

    const existingBookmark = await prisma.bookmark.findFirst({
      where: { did: event.did, subject: urlString },
    });
    if (existingBookmark) {
      logger.info(`Bookmark already exists for ${urlString} by ${event.did}, skipping...`);
      return;
    }

    const session = await oauthClient.restore(event.did);
    const agent = new Agent(session);
    await agent.com.atproto.repo.putRecord({
      repo: event.did,
      collection: 'blue.rito.feed.bookmark',
      rkey: deriveBookmarkRkeyFromPost(event.commit.rkey),
      record: {
        subject: urlString,
        createdAt: new Date().toISOString(),
        comments: [{
          lang: preference.lang || 'ja',
          title: ogpTitle,
          comment: normalizeComment(record.text || ''),
        }],
        ogpTitle,
        ogpDescription: record.embed && isEmbedExternal(record.embed)
          ? record.embed.external?.description || ogpDescription
          : ogpDescription,
        ogpImage: ogImage,
        tags,
      },
    });
    logger.info(`Post to bookmark created: ${aturi}, link: ${urlString}`);
  } catch (error) {
    logger.error(`Error in upsertPost for ${aturi}: ${error}`);
  }
}

export async function deletePost(event: CommitDeleteEvent): Promise<void> {
  const aturi = `at://${event.did}/${event.commit.collection}/${event.commit.rkey}`;
  try {
    await prisma.postUri.deleteMany({ where: { postUri: aturi } });
    const deletedPosts = await prisma.post.deleteMany({ where: { uri: aturi } });
    if (deletedPosts.count > 0) {
      logger.info(`Deleted post: ${aturi} (${deletedPosts.count} records)`);
    }
  } catch (error) {
    logger.error(`Error in deletePost for ${aturi}: ${error}`);
  }
}
