import { describe, it, expect, vi, beforeEach } from 'vitest';

// モックを定義
const { mockFindManyBookmark, mockFindManyLike } = vi.hoisted(() => ({
    mockFindManyBookmark: vi.fn(),
    mockFindManyLike: vi.fn(),
}));

// pgモジュールをモックしてDB接続を回避
vi.mock('pg', () => ({
    default: {
        Pool: vi.fn(() => ({
            connect: vi.fn(),
            query: vi.fn(),
            end: vi.fn(),
        })),
    },
}));

// PrismaClientコンストラクタのモック
const MockPrismaClient = vi.fn(() => ({
    bookmark: { findMany: vi.fn() },
    like: { findMany: vi.fn() },
}));

vi.mock('@prisma/client', () => ({
    PrismaClient: MockPrismaClient,
}));

vi.mock('@prisma/adapter-pg', () => ({
    PrismaPg: vi.fn(),
}));

// パス解決の漏れを防ぐため、相対パスとエイリアスの両方でモック
vi.mock('@/logic/HandlePrismaClient', () => ({
    prisma: {
        bookmark: {
            findMany: mockFindManyBookmark,
        },
        like: {
            findMany: mockFindManyLike,
        },
    },
}));
vi.mock('../../../src/logic/HandlePrismaClient', () => ({
    prisma: {
        bookmark: {
            findMany: mockFindManyBookmark,
        },
        like: {
            findMany: mockFindManyLike,
        },
    },
}));

vi.mock('@/logic/HandleBookmark', () => ({
    normalizeBookmarks: vi.fn((bookmarks) => bookmarks.map((b: { uri: string; subject?: string }) => ({
        uri: b.uri,
        subject: b.subject || 'https://example.com',
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
    beforeEach(() => {
        vi.clearAllMocks();

        // デフォルトのモック動作を設定
        mockFindManyBookmark.mockResolvedValue([
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
        ]);
        mockFindManyLike.mockResolvedValue([]);
    });

    it('DIDでブックマークを取得する', async () => {
        const req = new Request('http://localhost/xrpc/blue.rito.feed.getActorBookmarks?actor=did:plc:testuser');
        const response = await GET(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(data)).toBe(true);
        expect(mockFindManyBookmark).toHaveBeenCalledWith(expect.objectContaining({
            where: { did: 'did:plc:testuser' }
        }));
    });

    it('handleでブックマークを取得する', async () => {
        const req = new Request('http://localhost/xrpc/blue.rito.feed.getActorBookmarks?actor=user.bsky.social');
        const response = await GET(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(data)).toBe(true);
        expect(mockFindManyBookmark).toHaveBeenCalledWith(expect.objectContaining({
            where: { handle: 'user.bsky.social' }
        }));
    });

    it('actorパラメータなしは400エラー', async () => {
        const req = new Request('http://localhost/xrpc/blue.rito.feed.getActorBookmarks');
        const response = await GET(req);

        expect(response.status).toBe(400);
    });

    it('likesを正しくマッピングして返す', async () => {
        // 特定のテストケースでのみLikeの返り値を変更
        mockFindManyLike.mockResolvedValueOnce([
            { subject: 'at://did:plc:testuser/blue.rito.feed.bookmark/1', aturi: 'at://like/1' }
        ]);

        const req = new Request('http://localhost/xrpc/blue.rito.feed.getActorBookmarks?actor=did:plc:testuser');
        const response = await GET(req);
        const data = await response.json();

        expect(data[0].likes).toEqual(['at://like/1']);
    });

    it('内部エラーが発生した場合は500エラー', async () => {
        // エラーケースのシミュレーション
        mockFindManyBookmark.mockRejectedValueOnce(new Error('DB Error'));

        const req = new Request('http://localhost/xrpc/blue.rito.feed.getActorBookmarks?actor=did:plc:testuser');
        const response = await GET(req);

        expect(response.status).toBe(500);
    });
});
