import { prisma } from '../db.js';
import logger from '../logger.js';
import { analysisQueue, dbLimit } from '../runtime/queues.js';
import { checkModeration, classifyCategory } from '../services/contentAnalysis.js';
import type { BookmarkRecord, CommitDeleteEvent, CommitPutEvent, DidDocument } from '../types.js';
import { isValidTangledUrl } from '../utils.js';

async function resolveHandle(did: string): Promise<string> {
  let handle = 'no handle';
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(`https://plc.directory/${did}`);
      if (response.ok) {
        const didData = await response.json() as DidDocument;
        handle = didData.alsoKnownAs?.[0]?.replace(/^at:\/\//, '') ?? handle;
        logger.info(`Handle successed for DID: ${did}, handle: ${handle}`);
        return handle;
      }
      logger.warn(`Attempt ${attempt}: plc.directory fetch failed with status ${response.status}`);
    } catch {
      logger.warn(`Attempt ${attempt}: plc.directory fetch error for DID: ${did}`);
    }
  }

  logger.warn(`Failed to fetch handle after ${maxAttempts} attempts for DID: ${did}`);
  return handle;
}

async function analyzeBookmark(aturi: string, record: BookmarkRecord): Promise<void> {
  try {
    const ogpTexts = [record.ogpTitle, record.ogpDescription].filter((text): text is string => !!text);
    const ogpFlaggedCategories = await checkModeration(ogpTexts);
    const ogpModerationResult = ogpFlaggedCategories.length > 0 ? ogpFlaggedCategories.join(',') : null;
    const category = await classifyCategory(
      record.ogpTitle || '',
      record.ogpDescription || '',
      record.comments?.[0]?.comment || '',
      record.tags || [],
    );

    await dbLimit(() => prisma.bookmark.updateMany({
      where: { uri: aturi },
      data: { category, moderation_result: ogpModerationResult },
    }));

    for (const comment of record.comments ?? []) {
      const texts = [comment.title, comment.comment].filter((text): text is string => !!text);
      const flaggedCategories = await checkModeration(texts);
      await dbLimit(() => prisma.comment.updateMany({
        where: { bookmark_uri: aturi, lang: comment.lang },
        data: { moderation_result: flaggedCategories.length > 0 ? flaggedCategories.join(',') : null },
      }));
    }
    logger.info(`Async analysis complete for ${aturi}: ${category} and Moderation: ${ogpModerationResult}`);
  } catch (error) {
    logger.error(`Async analysis failed for ${aturi}: ${error}`);
  }
}

export async function queueUnclassifiedBookmarkAnalysis(): Promise<void> {
  const bookmarks = await prisma.bookmark.findMany({
    where: { category: null },
    select: {
      uri: true,
      ogp_title: true,
      ogp_description: true,
      tags: { select: { tag: { select: { name: true } } } },
      comments: true,
    },
  });
  logger.info(`Found ${bookmarks.length} unclassified bookmarks. Queueing for analysis...`);

  for (const bookmark of bookmarks) {
    void analysisQueue.add(async () => {
      try {
        const tags = bookmark.tags.map(({ tag }) => tag.name);
        const mainComment = bookmark.comments.find(({ lang }) => lang === 'ja')?.comment
          || bookmark.comments[0]?.comment
          || '';
        const ogpTexts = [bookmark.ogp_title, bookmark.ogp_description]
          .filter((text): text is string => !!text);
        const flaggedCategories = await checkModeration(ogpTexts);
        const moderationResult = flaggedCategories.length > 0 ? flaggedCategories.join(',') : null;
        const category = await classifyCategory(
          bookmark.ogp_title || '',
          bookmark.ogp_description || '',
          mainComment,
          tags,
        );

        await dbLimit(() => prisma.bookmark.updateMany({
          where: { uri: bookmark.uri },
          data: { category, moderation_result: moderationResult },
        }));
        for (const comment of bookmark.comments) {
          const texts = [comment.title, comment.comment].filter((text): text is string => !!text);
          const commentFlags = await checkModeration(texts);
          await dbLimit(() => prisma.comment.updateMany({
            where: { id: comment.id },
            data: { moderation_result: commentFlags.length > 0 ? commentFlags.join(',') : null },
          }));
        }
        logger.info(`Recovery analysis complete for ${bookmark.uri}: ${category}`);
      } catch (error) {
        logger.error(`Recovery analysis failed for ${bookmark.uri}: ${error}`);
      }
    });
  }
}

export async function upsertBookmark(event: CommitPutEvent<BookmarkRecord>): Promise<void> {
  const record = event.commit.record;
  const aturi = `at://${event.did}/${event.commit.collection}/${event.commit.rkey}`;
  const handle = await resolveHandle(event.did);

  let verified = false;
  try {
    const url = new URL(record.subject || '');
    verified = ((url.pathname === '/' || url.pathname === '')
      && (url.hostname === handle || url.hostname.endsWith(`.${handle}`)))
      || isValidTangledUrl(record.subject || '', handle);
  } catch {
    // Invalid subjects remain unverified.
  }

  try {
    await dbLimit(() => prisma.userDidHandle.upsert({
      where: { did: event.did },
      update: { handle },
      create: { did: event.did, handle },
    }));
    await dbLimit(() => prisma.bookmark.upsert({
      where: { uri: aturi },
      update: {
        subject: record.subject ?? '',
        ogp_title: record.ogpTitle,
        ogp_description: record.ogpDescription,
        ogp_image: record.ogpImage,
        moderation_result: null,
        handle,
        category: null,
        indexed_at: new Date(),
      },
      create: {
        uri: aturi,
        did: event.did,
        subject: record.subject ?? '',
        ogp_title: record.ogpTitle,
        ogp_description: record.ogpDescription,
        ogp_image: record.ogpImage,
        moderation_result: null,
        handle,
        category: null,
        created_at: record.createdAt ? new Date(record.createdAt) : new Date(),
        indexed_at: new Date(),
      },
    }));

    const existingLangs = (record.comments ?? []).map(({ lang }) => lang);
    for (const comment of record.comments ?? []) {
      await dbLimit(() => prisma.comment.upsert({
        where: { bookmark_uri_lang: { bookmark_uri: aturi, lang: comment.lang } },
        update: { title: comment.title, comment: comment.comment, moderation_result: null },
        create: {
          bookmark_uri: aturi,
          lang: comment.lang,
          title: comment.title,
          comment: comment.comment,
          moderation_result: null,
        },
      }));
    }
    await prisma.comment.deleteMany({
      where: { bookmark_uri: aturi, NOT: { lang: { in: existingLangs } } },
    });

    const tagNames = (record.tags ?? [])
      .filter((name) => name && name.trim().length > 0)
      .filter((name) => name.toLowerCase() !== 'verified');
    if (verified) tagNames.push('Verified');

    const tagRecords: { id: number }[] = [];
    for (const name of tagNames) {
      try {
        tagRecords.push(await dbLimit(() => prisma.tag.upsert({
          where: { name },
          update: {},
          create: { name },
        })));
      } catch (error) {
        logger.error(`Tag upsert failed for ${name}: ${error}`);
      }
    }
    const oldTags = await prisma.bookmarkTag.findMany({
      where: { bookmark_uri: aturi },
      select: { tag_id: true },
    });
    const oldTagIds = oldTags.map(({ tag_id }) => tag_id);
    const newTagIds = tagRecords.map(({ id }) => id);
    const removeIds = oldTagIds.filter((id) => !newTagIds.includes(id));
    if (removeIds.length > 0) {
      await dbLimit(() => prisma.bookmarkTag.deleteMany({
        where: { bookmark_uri: aturi, tag_id: { in: removeIds } },
      }));
    }
    for (const id of newTagIds.filter((tagId) => !oldTagIds.includes(tagId))) {
      await dbLimit(() => prisma.bookmarkTag.create({ data: { bookmark_uri: aturi, tag_id: id } }));
    }

    void analysisQueue.add(() => analyzeBookmark(aturi, record));
    logger.info(`Upserted bookmark (queued for analysis): ${aturi}, Verify: ${verified}`);
  } catch (error) {
    logger.error(`Error in upsert: ${error}`);
  }
}

export async function deleteBookmark(event: CommitDeleteEvent): Promise<void> {
  const aturi = `at://${event.did}/${event.commit.collection}/${event.commit.rkey}`;
  try {
    await dbLimit(() => prisma.bookmark.deleteMany({ where: { uri: aturi } }));
    logger.info(`Deleted bookmark: ${aturi}`);
  } catch (error) {
    logger.error(`Error in deleteBookmark: ${error}`);
  }
}
