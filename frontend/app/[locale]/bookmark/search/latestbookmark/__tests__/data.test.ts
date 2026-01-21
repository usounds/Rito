import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma - must be defined before vi.mock
vi.mock('@/logic/HandlePrismaClient', () => ({
    prisma: {
        bookmark: {
            findMany: vi.fn().mockResolvedValue([]),
            count: vi.fn().mockResolvedValue(0),
        },
    },
}));

vi.mock('@/logic/HandleBookmark', () => ({
    enrichBookmarks: vi.fn().mockImplementation(async (bookmarks) => bookmarks.map((b: Record<string, unknown>) => ({
        uri: b.uri,
        subject: b.subject,
        handle: b.handle ?? '',
        ogpTitle: b.ogp_title ?? '',
        ogpDescription: b.ogp_description ?? '',
        ogpImage: b.ogp_image ?? '',
        createdAt: new Date().toISOString(),
        indexedAt: new Date().toISOString(),
        moderations: [],
        comments: b.comments ?? [],
        tags: [],
        likes: [],
        commentCount: 0,
    }))),
}));

import { fetchBookmarks } from '../data';
import { prisma } from '@/logic/HandlePrismaClient';

const mockFindMany = vi.mocked(prisma.bookmark.findMany);
const mockCount = vi.mocked(prisma.bookmark.count);

describe('latestbookmark/data.ts - fetchBookmarks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFindMany.mockResolvedValue([]);
        mockCount.mockResolvedValue(0);
    });

    it('デフォルトパラメータでブックマークを取得', async () => {
        const result = await fetchBookmarks({});

        expect(result.items).toEqual([]);
        expect(result.totalPages).toBe(0);
        expect(result.totalCount).toBe(0);
        expect(result.hasMore).toBe(false);
    });

    it('ページネーションが正しく動作', async () => {
        mockCount.mockResolvedValue(24);
        mockFindMany.mockResolvedValue([{
            uri: 'test',
            subject: 'https://example.com',
            did: 'did:plc:test',
            handle: 'user.bsky.social',
            ogp_title: 'Test',
            ogp_description: 'Desc',
            ogp_image: null,
            created_at: new Date(),
            indexed_at: new Date(),
            moderation_result: null,
            comments: [],
            tags: []
        }] as never);

        const result = await fetchBookmarks({ page: 1 });

        expect(result.totalPages).toBe(2);
        expect(result.hasMore).toBe(true);
    });

    it('タグフィルタが正しく適用される', async () => {
        await fetchBookmarks({ tag: ['test'] });

        expect(mockFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    AND: expect.arrayContaining([
                        expect.objectContaining({ tags: expect.anything() }),
                    ]),
                }),
            })
        );
    });

    it('除外タグ（-prefix）が正しく処理される', async () => {
        await fetchBookmarks({ tag: ['-excluded'] });

        expect(mockFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    NOT: expect.arrayContaining([
                        expect.objectContaining({ tags: expect.anything() }),
                    ]),
                }),
            })
        );
    });

    it('ハンドルフィルタが正しく適用される', async () => {
        await fetchBookmarks({ handle: ['user.bsky.social'] });

        expect(mockFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    handle: { in: ['user.bsky.social'] },
                }),
            })
        );
    });

    it('除外ハンドル（-prefix）が正しく処理される', async () => {
        await fetchBookmarks({ handle: ['-excluded.user'] });

        expect(mockFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    NOT: expect.arrayContaining([
                        expect.objectContaining({ handle: expect.anything() }),
                    ]),
                }),
            })
        );
    });

    it('DIDフィルタが正しく適用される（did:で始まる場合）', async () => {
        await fetchBookmarks({ did: 'did:plc:testuser' });

        expect(mockFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    did: 'did:plc:testuser',
                }),
            })
        );
    });

    it('DID以外の場合はhandle検索に変換', async () => {
        await fetchBookmarks({ did: 'user.bsky.social' });

        expect(mockFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    handle: 'user.bsky.social',
                }),
            })
        );
    });

    it('ソート順がupdatedの場合indexed_atでソート', async () => {
        await fetchBookmarks({ sort: 'updated' });

        expect(mockFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                orderBy: { indexed_at: 'desc' },
            })
        );
    });

    it('デフォルトソートはcreated_at', async () => {
        await fetchBookmarks({});

        expect(mockFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                orderBy: { created_at: 'desc' },
            })
        );
    });
});
