import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma and normalize function
vi.mock('@/logic/HandlePrismaClient', () => ({
    prisma: {
        bookmark: {
            findMany: vi.fn().mockResolvedValue([
                {
                    uri: 'at://did:plc:xxx/blue.rito.feed.bookmark/1',
                    handle: 'user.bsky.social',
                    subject: 'https://example.com',
                    ogp_title: 'Test Article',
                    ogp_description: 'Description',
                    ogp_image: null,
                    created_at: new Date(),
                    indexed_at: new Date(),
                    moderation_result: null,
                    comments: [],
                    tags: [],
                },
            ]),
        },
    },
}));

vi.mock('@/logic/HandleBookmark', () => ({
    normalizeBookmarks: vi.fn((bookmarks) => bookmarks.map((b: { uri: string; ogp_title: string }) => ({
        uri: b.uri,
        ogpTitle: b.ogp_title,
        comments: [],
        tags: [],
        moderations: [],
    }))),
}));

import { GET } from '@app/xrpc/blue.rito.feed.getBookmark/route';

describe('xRPC: /xrpc/blue.rito.feed.getBookmark', () => {
    it('URIでブックマークを取得する', async () => {
        const req = new Request('http://localhost/xrpc/blue.rito.feed.getBookmark?uri=at://did:plc:xxx/blue.rito.feed.bookmark/1');
        const response = await GET(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(data)).toBe(true);
    });

    it('uriパラメータなしは400エラー', async () => {
        const req = new Request('http://localhost/xrpc/blue.rito.feed.getBookmark');
        const response = await GET(req);

        expect(response.status).toBe(400);
    });

    it('内部エラーが発生した場合は500エラー', async () => {
        const { prisma } = await import('@/logic/HandlePrismaClient');
        vi.mocked(prisma.bookmark.findMany).mockRejectedValueOnce(new Error('DB Error'));

        const req = new Request('http://localhost/xrpc/blue.rito.feed.getBookmark?uri=at://xxx');
        const response = await GET(req);

        expect(response.status).toBe(500);
    });
});
