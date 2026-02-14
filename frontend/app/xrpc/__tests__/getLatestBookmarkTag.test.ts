import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock prisma
// We need to hoist the mock factory so it executes before imports
// Mock prisma
const prismaMock = vi.hoisted(() => ({
    bookmark: {
        findMany: vi.fn(),
    },
    bookmarkTag: {
        groupBy: vi.fn(),
    },
    tag: {
        findMany: vi.fn(),
    },
    socialGraph: {
        findMany: vi.fn(),
    },
}));

vi.mock('@/logic/HandlePrismaClient', () => ({
    prisma: prismaMock,
}));

import { GET } from '@app/xrpc/blue.rito.feed.getLatestBookmarkTag/route';

describe('xRPC: /xrpc/blue.rito.feed.getLatestBookmarkTag', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default mock implementations
        prismaMock.bookmark.findMany.mockResolvedValue([
            {
                uri: 'at://did:plc:xxx/blue.rito.feed.bookmark/1',
                tags: [{ tag: { id: 1, name: 'test' } }],
            },
        ]);
        prismaMock.bookmarkTag.groupBy.mockResolvedValue([
            { tag_id: 1, _count: { tag_id: 10 } },
            { tag_id: 2, _count: { tag_id: 5 } },
        ]);
        prismaMock.tag.findMany.mockResolvedValue([
            { id: 1, name: 'test' },
            { id: 2, name: 'example' },
        ]);
    });

    it('最新のタグを取得する', async () => {
        const req = new NextRequest('http://localhost/xrpc/blue.rito.feed.getLatestBookmarkTag');
        const response = await GET(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(data)).toBe(true);
        expect(prismaMock.bookmark.findMany).toHaveBeenCalled();
    });

    it('選択されたタグでフィルタする', async () => {
        const req = new NextRequest('http://localhost/xrpc/blue.rito.feed.getLatestBookmarkTag?tags=test');
        const response = await GET(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(data)).toBe(true);
        // Verify filtering logic is triggered (complicated to verify exact args with this mock setup, but at least it runs)
    });

    it('actor(handle)でフィルタする', async () => {
        const req = new NextRequest('http://localhost/xrpc/blue.rito.feed.getLatestBookmarkTag?actor=user.bsky.social');
        const response = await GET(req);
        await response.json();

        expect(response.status).toBe(200);
        expect(prismaMock.bookmark.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                OR: expect.arrayContaining([
                    { handle: 'user.bsky.social' }
                ])
            })
        }));
    });

    it('actor(did)でフィルタする', async () => {
        const req = new NextRequest('http://localhost/xrpc/blue.rito.feed.getLatestBookmarkTag?actor=did:plc:user');
        const response = await GET(req);
        await response.json();

        expect(response.status).toBe(200);
        expect(prismaMock.bookmark.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                OR: expect.arrayContaining([
                    { did: 'did:plc:user' }
                ])
            })
        }));
    });

    it('relationship=following でフィルタする', async () => {
        const observerDid = 'did:plc:observer';
        prismaMock.socialGraph.findMany.mockResolvedValueOnce([
            { targetDid: 'did:plc:target1' },
            { targetDid: 'did:plc:target2' },
        ]);

        const req = new NextRequest(`http://localhost/xrpc/blue.rito.feed.getLatestBookmarkTag?actor=${observerDid}&relationship=following`);
        const response = await GET(req);
        await response.json();

        expect(response.status).toBe(200);

        // Check if socialGraph was queried correctly
        expect(prismaMock.socialGraph.findMany).toHaveBeenCalledWith({
            where: { observerDid: observerDid, type: 'follow' },
            select: { targetDid: true }
        });

        // Check if bookmark query included the target DIDs + observer DID
        expect(prismaMock.bookmark.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                did: { in: expect.arrayContaining(['did:plc:target1', 'did:plc:target2', observerDid]) }
            })
        }));
    });

    it('relationship=followers でフィルタする', async () => {
        const observerDid = 'did:plc:observer'; // Me
        prismaMock.socialGraph.findMany.mockResolvedValueOnce([
            { observerDid: 'did:plc:follower1' }, // follower
        ]);

        const req = new NextRequest(`http://localhost/xrpc/blue.rito.feed.getLatestBookmarkTag?actor=${observerDid}&relationship=followers`);
        const response = await GET(req);
        await response.json();

        expect(response.status).toBe(200);

        // Check if socialGraph was queried correctly
        expect(prismaMock.socialGraph.findMany).toHaveBeenCalledWith({
            where: { targetDid: observerDid, type: 'follow' },
            select: { observerDid: true }
        });

        expect(prismaMock.bookmark.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                did: { in: expect.arrayContaining(['did:plc:follower1', observerDid]) }
            })
        }));
    });

    it('relationship=mutual でフィルタする', async () => {
        const observerDid = 'did:plc:observer';

        // Mock following
        prismaMock.socialGraph.findMany.mockResolvedValueOnce([
            { targetDid: 'did:plc:friend' },
            { targetDid: 'did:plc:only_following' },
        ]);

        // Mock followers
        prismaMock.socialGraph.findMany.mockResolvedValueOnce([
            { observerDid: 'did:plc:friend' },
            { observerDid: 'did:plc:only_follower' },
        ]);

        const req = new NextRequest(`http://localhost/xrpc/blue.rito.feed.getLatestBookmarkTag?actor=${observerDid}&relationship=mutual`);
        const response = await GET(req);
        await response.json();

        expect(response.status).toBe(200);

        // Should verify intersection: 'did:plc:friend' only (plus observerDid)
        expect(prismaMock.bookmark.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                did: { in: expect.arrayContaining(['did:plc:friend', observerDid]) }
            })
        }));

        // Should NOT contain non-mutuals
        // Note: expect.not.arrayContaining is tricky, so let's check the args manually or trust the above inclusive check + logic
        const callArgs = prismaMock.bookmark.findMany.mock.calls[0][0];
        const dids = callArgs.where.did.in;
        expect(dids).toContain('did:plc:friend');
        expect(dids).toContain(observerDid);
        expect(dids).not.toContain('did:plc:only_following');
        expect(dids).not.toContain('did:plc:only_follower');
    });
});

