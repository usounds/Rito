import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock prisma
vi.mock('@/logic/HandlePrismaClient', () => ({
    prisma: {
        bookmark: {
            findMany: vi.fn().mockResolvedValue([
                {
                    uri: 'at://did:plc:xxx/blue.rito.feed.bookmark/1',
                    tags: [{ tag: { id: 1, name: 'test' } }],
                },
            ]),
        },
        bookmarkTag: {
            groupBy: vi.fn().mockResolvedValue([
                { tag_id: 1, _count: { tag_id: 10 } },
                { tag_id: 2, _count: { tag_id: 5 } },
            ]),
        },
        tag: {
            findMany: vi.fn().mockResolvedValue([
                { id: 1, name: 'test' },
                { id: 2, name: 'example' },
            ]),
        },
    },
}));

import { GET } from '@app/xrpc/blue.rito.feed.getLatestBookmarkTag/route';

describe('xRPC: /xrpc/blue.rito.feed.getLatestBookmarkTag', () => {
    it('最新のタグを取得する', async () => {
        const req = new NextRequest('http://localhost/xrpc/blue.rito.feed.getLatestBookmarkTag');
        const response = await GET(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(data)).toBe(true);
    });

    it('選択されたタグでフィルタする', async () => {
        const req = new NextRequest('http://localhost/xrpc/blue.rito.feed.getLatestBookmarkTag?tags=test');
        const response = await GET(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(data)).toBe(true);
    });

    it('actorでフィルタする', async () => {
        const req = new NextRequest('http://localhost/xrpc/blue.rito.feed.getLatestBookmarkTag?actor=user.bsky.social');
        const response = await GET(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(data)).toBe(true);
    });
});
