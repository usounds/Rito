import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
vi.mock('@/logic/HandlePrismaClient', () => ({
    prisma: {
        like: {
            findMany: vi.fn().mockResolvedValue([
                {
                    aturi: 'at://did:plc:testuser/blue.rito.feed.like/1',
                    subject: 'https://example.com',
                    did: 'did:plc:testuser',
                    created_at: new Date(),
                },
            ]),
        },
        userDidHandle: {
            findFirst: vi.fn().mockResolvedValue({
                did: 'did:plc:testuser',
                handle: 'user.bsky.social',
            }),
        },
    },
}));

vi.mock('@atcute/lexicons/syntax', () => ({
    isDid: vi.fn((s: string) => s.startsWith('did:')),
}));

import { GET } from '@app/xrpc/blue.rito.feed.getActorLikes/route';

describe('xRPC: /xrpc/blue.rito.feed.getActorLikes', () => {
    it('DIDでいいねを取得する', async () => {
        const req = new Request('http://localhost/xrpc/blue.rito.feed.getActorLikes?actor=did:plc:testuser');
        const response = await GET(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(data)).toBe(true);
    });

    it('handleでいいねを取得する', async () => {
        const req = new Request('http://localhost/xrpc/blue.rito.feed.getActorLikes?actor=user.bsky.social');
        const response = await GET(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(data)).toBe(true);
    });

    it('actorパラメータなしは400エラー', async () => {
        const req = new Request('http://localhost/xrpc/blue.rito.feed.getActorLikes');
        const response = await GET(req);

        expect(response.status).toBe(400);
    });
});
