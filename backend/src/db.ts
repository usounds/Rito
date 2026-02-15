/**
 * Database service module for Rito backend.
 * This module wraps Prisma operations for better testability.
 */

import 'dotenv/config';
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import pLimit from "p-limit";
import logger from './logger.js';

// Export the PLimit instance for external use
export const dbLimit = pLimit(5);

// Internal networks (localhost, Docker service names without dots) don't need SSL
const isInternalNetwork = !process.env.DATABASE_URL?.match(/@[\w-]+\.[\w.-]+[:/]/);
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isInternalNetwork ? false : { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);

// Create a singleton Prisma client
export const prisma = new PrismaClient({ adapter });

// Set up error handler
(prisma as any).$on('error', (e: any) => {
    logger.error(`Prisma error event: ${e?.message || e}`);
    process.exit(1);
});

/**
 * Load cursor from JetstreamIndex
 */
export async function loadCursor(epochUsToDateTime: (cursor: string | number) => string): Promise<string> {
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

/**
 * Upsert cursor to JetstreamIndex
 */
export async function upsertCursor(currentCursor: string): Promise<void> {
    await prisma.jetstreamIndex.upsert({
        where: { service: 'rito' },
        update: { index: currentCursor },
        create: { service: 'rito', index: currentCursor },
    });
}

/**
 * Upsert user DID to handle mapping
 */
export async function upsertUserDidHandle(did: string, handle: string): Promise<void> {
    await dbLimit(() =>
        prisma.userDidHandle.upsert({
            where: { did },
            update: { handle },
            create: { did, handle },
        })
    );
}

/**
 * Upsert bookmark record
 */
export interface BookmarkUpsertData {
    uri: string;
    did: string;
    subject: string;
    ogpTitle?: string;
    ogpDescription?: string;
    ogpImage?: string;
    moderationResult: string | null;
    handle: string;
    category?: string | null;
    createdAt?: Date;
}

export async function upsertBookmarkRecord(data: BookmarkUpsertData): Promise<void> {
    await dbLimit(() =>
        prisma.bookmark.upsert({
            where: { uri: data.uri },
            update: {
                subject: data.subject,
                ogp_title: data.ogpTitle,
                ogp_description: data.ogpDescription,
                ogp_image: data.ogpImage,
                moderation_result: data.moderationResult,
                handle: data.handle,
                category: data.category,
                indexed_at: new Date(),
            },
            create: {
                uri: data.uri,
                did: data.did,
                subject: data.subject,
                ogp_title: data.ogpTitle,
                ogp_description: data.ogpDescription,
                ogp_image: data.ogpImage,
                moderation_result: data.moderationResult,
                handle: data.handle,
                category: data.category,
                created_at: data.createdAt ?? new Date(),
                indexed_at: new Date(),
            },
        })
    );
}

/**
 * Upsert comment record
 */
export interface CommentUpsertData {
    bookmarkUri: string;
    lang: string;
    title?: string;
    comment?: string;
    moderationResult: string | null;
}

export async function upsertComment(data: CommentUpsertData): Promise<void> {
    await dbLimit(() =>
        prisma.comment.upsert({
            where: {
                bookmark_uri_lang: {
                    bookmark_uri: data.bookmarkUri,
                    lang: data.lang,
                },
            },
            update: {
                title: data.title,
                comment: data.comment,
                moderation_result: data.moderationResult,
            },
            create: {
                bookmark_uri: data.bookmarkUri,
                lang: data.lang,
                title: data.title,
                comment: data.comment,
                moderation_result: data.moderationResult,
            },
        })
    );
}

/**
 * Delete comments not in the given language list
 */
export async function deleteCommentsNotInLangs(bookmarkUri: string, langs: string[]): Promise<void> {
    await prisma.comment.deleteMany({
        where: {
            bookmark_uri: bookmarkUri,
            NOT: {
                lang: { in: langs },
            },
        },
    });
}

/**
 * Upsert tag
 */
export async function safeUpsertTag(name: string): Promise<{ id: number; name: string } | null> {
    try {
        return await dbLimit(() =>
            prisma.tag.upsert({
                where: { name },
                update: {},
                create: { name },
            })
        );
    } catch (err) {
        console.error(`Tag upsert failed for "${name}":`, err);
        return null;
    }
}

/**
 * Get existing tag IDs for a bookmark
 */
export async function getBookmarkTagIds(bookmarkUri: string): Promise<number[]> {
    const tags = await prisma.bookmarkTag.findMany({
        where: { bookmark_uri: bookmarkUri },
        select: { tag_id: true },
    });
    return tags.map((r: { tag_id: number }) => r.tag_id);
}

/**
 * Delete bookmark tags by IDs
 */
export async function deleteBookmarkTags(bookmarkUri: string, tagIds: number[]): Promise<void> {
    await dbLimit(() =>
        prisma.bookmarkTag.deleteMany({
            where: { bookmark_uri: bookmarkUri, tag_id: { in: tagIds } },
        })
    );
}

/**
 * Create bookmark tag
 */
export async function createBookmarkTag(bookmarkUri: string, tagId: number): Promise<void> {
    await dbLimit(() =>
        prisma.bookmarkTag.create({ data: { bookmark_uri: bookmarkUri, tag_id: tagId } })
    );
}

/**
 * Find postToBookmark record
 */
export async function findPostToBookmark(sub: string): Promise<{ sub: string; lang?: string } | null> {
    return await prisma.postToBookmark.findUnique({
        where: { sub },
        select: { sub: true, lang: true },
    });
}

/**
 * Find existing bookmark by did and subject
 */
export async function findExistingBookmark(did: string, subject: string): Promise<{ uri: string } | null> {
    return await prisma.bookmark.findFirst({
        where: { did, subject },
        select: { uri: true },
    });
}

/**
 * Upsert resolver record
 */
export async function upsertResolverRecord(nsid: string, did: string, schema: string, verified: boolean): Promise<void> {
    await dbLimit(() =>
        prisma.resolver.upsert({
            where: { nsid_did: { nsid, did } },
            update: { schema, verified, indexed_at: new Date() },
            create: { nsid, did, schema, verified, indexed_at: new Date() },
        })
    );
}

/**
 * Upsert like record
 */
export async function upsertLikeRecord(aturi: string, subject: string, did: string, createdAt: Date): Promise<void> {
    await dbLimit(() =>
        prisma.like.upsert({
            where: { aturi },
            update: { created_at: createdAt },
            create: { aturi, subject, did, created_at: createdAt },
        })
    );
}

/**
 * Delete bookmark
 */
export async function deleteBookmark(uri: string): Promise<{ count: number }> {
    return await dbLimit(() =>
        prisma.bookmark.deleteMany({ where: { uri } })
    );
}

/**
 * Delete like
 */
export async function deleteLike(aturi: string): Promise<{ count: number }> {
    return await dbLimit(() =>
        prisma.like.deleteMany({ where: { aturi } })
    );
}

/**
 * Delete resolver
 */
export async function deleteResolver(nsid: string, did: string): Promise<{ count: number }> {
    return await dbLimit(() =>
        prisma.resolver.deleteMany({ where: { nsid, did } })
    );
}
