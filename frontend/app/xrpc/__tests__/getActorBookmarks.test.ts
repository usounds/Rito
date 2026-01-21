import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
vi.mock('@/logic/HandlePrismaClient', () => ({
    prisma: {
        bookmark: {
            findMany: vi.fn().mockResolvedValue([
                {
                    uri: 'at://did:plc:testuser/blue.rito.feed.bookmark/1',
                    handle: 'user.bsky.social',
                    subject: 'https://example.com',
                    ogp_title: 'Test',
                    ogp_description: 'Desc',
                    ogp_image: null,
                    created_at: new Date(),
                    indexed_at: new Date(),
                    moderation_result: null,
                    comments: [],
                    tags: [],
                },
            ]),
        },
        like: {
            findMany: vi.fn().mockResolvedValue([]),
        },
    },
}));

vi.mock('@/logic/HandleBookmark', () => ({
    normalizeBookmarks: vi.fn((bookmarks) => bookmarks.map((b: { uri: string }) => ({
        uri: b.uri,
        comments: [],
        tags: [],
        moderations: [],
    }))),
}));

vi.mock('@atcute/lexicons/syntax', () => ({
    isDid: vi.fn((s: string) => s.startsWith('did:')),
}));

import { GET } from '@app/xrpc/blue.rito.feed.getActorBookmarks/route';

describe('xRPC: /xrpc/blue.rito.feed.getActorBookmarks', () => {
    it('DIDでブックマークを取得する', async () => {
        const req = new Request('http://localhost/xrpc/blue.rito.feed.getActorBookmarks?actor=did:plc:testuser');
        const response = await GET(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(data)).toBe(true);
    });

    it('handleでブックマークを取得する', async () => {
        const req = new Request('http://localhost/xrpc/blue.rito.feed.getActorBookmarks?actor=user.bsky.social');
        const response = await GET(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(data)).toBe(true);
    });

    it('actorパラメータなしは400エラー', async () => {
        const req = new Request('http://localhost/xrpc/blue.rito.feed.getActorBookmarks');
        const response = await GET(req);

        expect(response.status).toBe(400);
    });

    it('likesを正しくマッピングして返す', async () => {
        const { prisma } = await import('@/logic/HandlePrismaClient');
        vi.mocked(prisma.like.findMany).mockResolvedValueOnce([
            { subject: 'at://did:plc:testuser/blue.rito.feed.bookmark/1', aturi: 'at://like/1' }
        ] as any);

        const req = new Request('http://localhost/xrpc/blue.rito.feed.getActorBookmarks?actor=did:plc:testuser');
        const response = await GET(req);
        const data = await response.json();

        expect(data[0].likes).toEqual(['at://like/1']);
    });

    it('内部エラーが発生した場合は500エラー', async () => {
        const { prisma } = await import('@/logic/HandlePrismaClient');
        vi.mocked(prisma.bookmark.findMany).mockRejectedValueOnce(new Error('DB Error'));

        const req = new Request('http://localhost/xrpc/blue.rito.feed.getActorBookmarks?actor=did:plc:testuser');
        const response = await GET(req);

        expect(response.status).toBe(500);
    });
});
