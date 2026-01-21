import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
vi.mock('@/logic/HandlePrismaClient', () => ({
    prisma: {
        bookmark: {
            findMany: vi.fn().mockResolvedValue([]),
        },
    },
}));

vi.mock('@/logic/HandleBookmark', () => ({
    normalizeBookmarks: vi.fn((bookmarks) => bookmarks),
}));

import { GET } from '@app/xrpc/blue.rito.feed.getBookmarkBySubject/route';

describe('xRPC: /xrpc/blue.rito.feed.getBookmarkBySubject', () => {
    it('subjectでブックマークを取得する', async () => {
        const req = new Request('http://localhost/xrpc/blue.rito.feed.getBookmarkBySubject?subject=https://example.com');
        const response = await GET(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(data)).toBe(true);
    });

    it('didでブックマークを取得する', async () => {
        const req = new Request('http://localhost/xrpc/blue.rito.feed.getBookmarkBySubject?did=did:plc:testuser');
        const response = await GET(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(data)).toBe(true);
    });

    it('subjectとdid両方でフィルタ', async () => {
        const req = new Request('http://localhost/xrpc/blue.rito.feed.getBookmarkBySubject?subject=https://example.com&did=did:plc:testuser');
        const response = await GET(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(data)).toBe(true);
    });

    it('パラメータなしは400エラー', async () => {
        const req = new Request('http://localhost/xrpc/blue.rito.feed.getBookmarkBySubject');
        const response = await GET(req);

        expect(response.status).toBe(400);
    });

    it('内部エラーが発生した場合は500エラー', async () => {
        const { prisma } = await import('@/logic/HandlePrismaClient');
        vi.mocked(prisma.bookmark.findMany).mockRejectedValueOnce(new Error('DB Error'));

        const req = new Request('http://localhost/xrpc/blue.rito.feed.getBookmarkBySubject?subject=https://example.com');
        const response = await GET(req);

        expect(response.status).toBe(500);
    });
});
