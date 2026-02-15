import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
const mockPrisma = {
    bookmark: {
        findMany: vi.fn().mockResolvedValue([]),
    },
    like: {
        findMany: vi.fn().mockResolvedValue([]),
    },
};

vi.mock('@/logic/HandlePrismaClient', () => ({
    prisma: mockPrisma,
}));

import { withTrailingSlashVariants, normalizeBookmarks, enrichBookmarks } from '../HandleBookmark';

describe('HandleBookmark', () => {
    const mockRawBookmark = {
        uri: 'at://did:plc:xxx/blue.rito.feed.bookmark/yyy',
        handle: 'user.bsky.social',
        subject: 'https://example.com/article',
        ogp_title: 'Test Article',
        ogp_description: 'Description',
        ogp_image: 'https://example.com/image.jpg',
        created_at: new Date('2024-01-01T00:00:00Z'),
        indexed_at: new Date('2024-01-01T00:00:00Z'),
        moderation_result: 'nsfw,spam',
        comments: [
            { lang: 'ja', title: '日本語タイトル', comment: 'コメント', moderation_result: null },
            { lang: 'en', title: 'English Title', comment: 'Comment', moderation_result: 'adult' },
        ],
        tags: [
            { tag: { name: 'test' } },
            { tag: { name: 'Verified' } },
        ],
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('withTrailingSlashVariants', () => {
        it('末尾スラッシュなしURLに両方のバリアントを返す', () => {
            const result = withTrailingSlashVariants('https://example.com/page');
            expect(result).toEqual(['https://example.com/page', 'https://example.com/page/']);
        });

        it('末尾スラッシュありURLに両方のバリアントを返す', () => {
            const result = withTrailingSlashVariants('https://example.com/page/');
            expect(result).toEqual(['https://example.com/page/', 'https://example.com/page']);
        });

        it('ルートURLを正しく処理する', () => {
            const result = withTrailingSlashVariants('https://example.com/');
            expect(result).toHaveLength(2);
        });
    });

    describe('normalizeBookmarks', () => {

        it('RawBookmarkをBookmark形式に変換する', () => {
            const result = normalizeBookmarks([mockRawBookmark as never]);
            expect(result).toHaveLength(1);
            expect(result[0].uri).toBe(mockRawBookmark.uri);
            expect(result[0].ogpTitle).toBe('Test Article');
        });

        it('moderationsを配列に分割する', () => {
            const result = normalizeBookmarks([mockRawBookmark as never]);
            expect(result[0].moderations).toEqual(['nsfw', 'spam']);
        });

        it('tagsからtag.nameを抽出する', () => {
            const result = normalizeBookmarks([mockRawBookmark as never]);
            expect(result[0].tags).toContain('test');
            expect(result[0].tags).toContain('Verified');
        });

        it('Verifiedタグを先頭にソートする', () => {
            const result = normalizeBookmarks([mockRawBookmark as never]);
            expect(result[0].tags[0]).toBe('Verified');
        });

        it('日付をISO文字列に変換する', () => {
            const result = normalizeBookmarks([mockRawBookmark as never]);
            expect(result[0].createdAt).toBe('2024-01-01T00:00:00.000Z');
        });

        it('コメントを正しくマッピングする', () => {
            const result = normalizeBookmarks([mockRawBookmark as never]);
            expect(result[0].comments).toHaveLength(2);
            expect(result[0].comments[0].lang).toBe('ja');
        });

        it('nullフィールドをデフォルト値に変換する', () => {
            const nullBookmark = {
                ...mockRawBookmark,
                handle: null,
                ogp_title: null,
                ogp_description: null,
                ogp_image: null,
                moderation_result: null,
            };
            const result = normalizeBookmarks([nullBookmark as never]);
            expect(result[0].handle).toBe('');
            expect(result[0].ogpTitle).toBe('');
            expect(result[0].moderations).toEqual([]);
        });
        it('ogpTitle と ogpDescription を 255 文字で切り捨てる', () => {
            const longText = 'a'.repeat(300);
            const longBookmark = {
                ...mockRawBookmark,
                ogp_title: longText,
                ogp_description: longText,
            };
            const result = normalizeBookmarks([longBookmark as never]);
            expect(result[0].ogpTitle).toHaveLength(255);
            expect(result[0].ogpDescription).toHaveLength(255);
        });
    });

    describe('enrichBookmarks', () => {
        const mockBookmarks = [
            {
                uri: 'at://did:plc:xxx/blue.rito.feed.bookmark/1',
                handle: 'user.bsky.social',
                subject: 'https://example.com/article',
                ogp_title: 'Test',
                ogp_description: 'Desc',
                ogp_image: null,
                created_at: new Date(),
                indexed_at: new Date(),
                moderation_result: null,
                comments: [],
                tags: [],
            },
        ];

        it('ブックマークを正規化してlikesとcommentCountを追加', async () => {
            mockPrisma.bookmark.findMany.mockResolvedValue([
                { uri: 'at://did:plc:xxx/blue.rito.feed.bookmark/1', subject: 'https://example.com/article' },
            ]);
            mockPrisma.like.findMany.mockResolvedValue([
                { subject: 'https://example.com/article', aturi: 'at://did:plc:yyy/blue.rito.feed.like/1' },
            ]);

            const result = await enrichBookmarks(mockBookmarks as never, mockPrisma as never);

            expect(result).toHaveLength(1);
            expect(result[0].likes).toContain('at://did:plc:yyy/blue.rito.feed.like/1');
            expect(result[0].commentCount).toBeGreaterThanOrEqual(0);
        });

        it('DBに一致するブックマークがない場合も正常に動作', async () => {
            mockPrisma.bookmark.findMany.mockResolvedValue([]);
            mockPrisma.like.findMany.mockResolvedValue([]);

            const result = await enrichBookmarks(mockBookmarks as never, mockPrisma as never);

            expect(result).toHaveLength(1);
            expect(result[0].likes).toEqual([]);
            expect(result[0].commentCount).toBe(0);
        });

        it('AT-URI形式のlikeを正しく処理', async () => {
            mockPrisma.bookmark.findMany.mockResolvedValue([
                { uri: 'at://did:plc:xxx/blue.rito.feed.bookmark/1', subject: 'https://example.com/article' },
            ]);
            mockPrisma.like.findMany.mockResolvedValue([
                { subject: 'at://did:plc:xxx/blue.rito.feed.bookmark/1', aturi: 'at://did:plc:yyy/blue.rito.feed.like/2' },
            ]);

            const result = await enrichBookmarks(mockBookmarks as never, mockPrisma as never);

            expect(result[0].likes).toContain('at://did:plc:yyy/blue.rito.feed.like/2');
        });

        it('末尾スラッシュの有無に関わらずlikeをマッチング', async () => {
            mockPrisma.bookmark.findMany.mockResolvedValue([
                { uri: 'at://did:plc:xxx/blue.rito.feed.bookmark/1', subject: 'https://example.com/article/' },
            ]);
            mockPrisma.like.findMany.mockResolvedValue([
                { subject: 'https://example.com/article', aturi: 'at://did:plc:yyy/blue.rito.feed.like/3' },
            ]);

            const result = await enrichBookmarks(mockBookmarks as never, mockPrisma as never);

            expect(result[0].likes).toContain('at://did:plc:yyy/blue.rito.feed.like/3');
        });

        it('同じsubjectに複数のlikeがある場合も正しく処理', async () => {
            mockPrisma.bookmark.findMany.mockResolvedValue([
                { uri: 'at://did:plc:xxx/blue.rito.feed.bookmark/1', subject: 'https://example.com/article' },
            ]);
            mockPrisma.like.findMany.mockResolvedValue([
                { subject: 'https://example.com/article', aturi: 'at://did:plc:a/blue.rito.feed.like/1' },
                { subject: 'https://example.com/article', aturi: 'at://did:plc:b/blue.rito.feed.like/2' },
            ]);

            const result = await enrichBookmarks(mockBookmarks as never, mockPrisma as never);

            expect(result[0].likes).toHaveLength(2);
        });

        it('異なるsubjectを持つ複数のブックマークを正しく処理', async () => {
            const multipleBookmarks = [
                ...mockBookmarks,
                {
                    uri: 'at://did:plc:xxx/blue.rito.feed.bookmark/2',
                    subject: 'https://other.com',
                    ogp_title: 'Other',
                    ogp_description: 'Desc',
                    created_at: new Date(),
                    indexed_at: new Date(),
                    comments: [],
                    tags: [],
                },
            ];
            mockPrisma.bookmark.findMany.mockResolvedValue([
                { uri: 'at://did:plc:xxx/blue.rito.feed.bookmark/1', subject: 'https://example.com/article' },
                { uri: 'at://did:plc:xxx/blue.rito.feed.bookmark/2', subject: 'https://other.com' },
            ]);
            mockPrisma.like.findMany.mockResolvedValue([
                { subject: 'https://example.com/article', aturi: 'at://did:plc:a/blue.rito.feed.like/1' },
            ]);

            const result = await enrichBookmarks(multipleBookmarks as never, mockPrisma as never);
            expect(result).toHaveLength(2);
            expect(result[0].likes).toHaveLength(1);
            expect(result[1].likes).toHaveLength(0);
        });

        it('日付が文字列の場合も正しく処理', () => {
            const stringDateBookmark = {
                ...mockRawBookmark,
                created_at: '2024-05-01T12:00:00Z',
                indexed_at: '2024-05-01T12:00:00Z',
            };
            const result = normalizeBookmarks([stringDateBookmark as never]);
            expect(result[0].createdAt).toBe('2024-05-01T12:00:00Z');
        });

        it('コメントのフィールドが欠落している場合を処理', () => {
            const partialCommentBookmark = {
                ...mockRawBookmark,
                comments: [{ lang: 'ja', title: null, comment: null, moderation_result: null }],
            };
            const result = normalizeBookmarks([partialCommentBookmark as never]);
            expect(result[0].comments[0].title).toBe('');
            expect(result[0].comments[0].comment).toBe('');
        });

        it('タグが配列でない場合を処理', () => {
            const noTagsBookmark = { ...mockRawBookmark, tags: null };
            const result = normalizeBookmarks([noTagsBookmark as never]);
            expect(result[0].tags).toEqual([]);
        });

        it('AT-URI Likeがどのbookmarkにもマッチしない場合を処理', async () => {
            mockPrisma.bookmark.findMany.mockResolvedValue([
                { uri: 'at://did:plc:xxx/blue.rito.feed.bookmark/1', subject: 'https://example.com' },
            ]);
            mockPrisma.like.findMany.mockResolvedValue([
                { subject: 'at://did:plc:other/blue.rito.feed.bookmark/999', aturi: 'at://like/1' },
            ]);

            const result = await enrichBookmarks(mockBookmarks as never, mockPrisma as never);
            // マッチしないAT-URI Likeはそのまま保持される（特定のuriには紐付かないが、コード上は matchedUris.push(like.subject) を通る）
            // 実際には uriLikesMap[bookmark.uri] 経由で取得されるので、どのブックマークの likes にも含まれない
            expect(result[0].likes).toHaveLength(0);
        });
    });
});
