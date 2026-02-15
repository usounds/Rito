'use server';

import { prisma } from '@/logic/HandlePrismaClient';
import { enrichBookmarks } from '@/logic/HandleBookmark';
import { getLocale } from 'next-intl/server';

export async function fetchCategoryBookmarks(category: string, page: number) {
    const TAKE = 50;
    const skip = page * TAKE;

    const bookmarks = await prisma.bookmark.findMany({
        where: {
            category: category,
        },
        orderBy: { created_at: 'desc' },
        take: TAKE,
        skip: skip,
        include: {
            comments: true,
            tags: { include: { tag: true } },
        },
    });

    const enrichedBookmarks = await enrichBookmarks(bookmarks, prisma);
    return enrichedBookmarks;
}
