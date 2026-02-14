import { prisma } from '@/logic/HandlePrismaClient';
import { enrichBookmarks } from '@/logic/HandleBookmark';
import { Prisma } from "@prisma/client";

export type BookmarkQuery = {
    sort?: 'created' | 'updated';
    tag?: string[];
    handle?: string[];
    page?: number;
    comment?: string;
    did?: string;
    relationship?: 'following' | 'followers' | 'mutual';
    userDid?: string;
};

export async function fetchBookmarks(query: BookmarkQuery) {
    const page = query.page ?? 1;
    const take = 12;
    const skip = (page - 1) * take;
    const orderField = query.sort === 'updated' ? 'indexed_at' : 'created_at';

    const where: Prisma.BookmarkWhereInput = {
        NOT: [{ subject: '' }],
    };

    if (query.relationship && query.userDid) {
        if (query.relationship === 'following') {
            const following = await prisma.socialGraph.findMany({
                where: { observerDid: query.userDid, type: 'follow' },
                select: { targetDid: true }
            });
            const dids = following.map(f => f.targetDid);
            where.did = { in: dids };

        } else if (query.relationship === 'followers') {
            const followers = await prisma.socialGraph.findMany({
                where: { targetDid: query.userDid, type: 'follow' },
                select: { observerDid: true }
            });
            const dids = followers.map(f => f.observerDid);
            where.did = { in: dids };

        } else if (query.relationship === 'mutual') {
            const following = await prisma.socialGraph.findMany({
                where: { observerDid: query.userDid, type: 'follow' },
                select: { targetDid: true }
            });
            const followers = await prisma.socialGraph.findMany({
                where: { targetDid: query.userDid, type: 'follow' },
                select: { observerDid: true }
            });

            const followingSet = new Set(following.map(f => f.targetDid));
            const mutuals = followers.map(f => f.observerDid).filter(did => followingSet.has(did));
            where.did = { in: mutuals };
        }
    }

    if (query.did) {
        const decodedDid = decodeURIComponent(query.did);
        if (decodedDid.startsWith("did")) {
            where.did = decodedDid;
        } else {
            where.handle = decodedDid;
        }
    }

    if (query.handle?.length) {
        const includeHandles = query.handle.filter((h) => !h.startsWith('-'));
        const excludeHandles = query.handle.filter((h) => h.startsWith('-')).map((h) => h.slice(1));

        if (includeHandles.length) {
            where.handle = { in: includeHandles };
        }
        if (excludeHandles.length) {
            (where.NOT as Prisma.BookmarkWhereInput[]).push({
                handle: { in: excludeHandles },
            });
        }
    }

    if (query.tag?.length) {
        const includeTags = query.tag.filter((t) => !t.startsWith('-'));
        const excludeTags = query.tag.filter((t) => t.startsWith('-')).map((t) => t.slice(1));

        const andConditions: Prisma.BookmarkWhereInput[] = [];

        if (includeTags.length) {
            andConditions.push(
                ...includeTags.map((t) => ({
                    tags: {
                        some: {
                            tag: {
                                name: { equals: t, mode: 'insensitive' as const },
                            },
                        },
                    },
                })),
            );
        }

        if (excludeTags.length) {
            (where.NOT as Prisma.BookmarkWhereInput[]).push(
                ...excludeTags.map((t) => ({
                    tags: {
                        some: {
                            tag: {
                                name: { equals: t, mode: 'insensitive' as const },
                            },
                        },
                    },
                })),
            );
        }

        if (andConditions.length) {
            where.AND = andConditions;
        }
    }

    const bookmarks = await prisma.bookmark.findMany({
        where,
        orderBy: { [orderField]: 'desc' },
        take,
        skip,
        include: {
            comments: true,
            tags: { include: { tag: true } },
        },
    });

    const totalCount = await prisma.bookmark.count({ where });
    const totalPages = Math.ceil(totalCount / take);
    const items = await enrichBookmarks(bookmarks, prisma);

    return {
        items,
        totalPages,
        totalCount,
        hasMore: page < totalPages
    };
}
