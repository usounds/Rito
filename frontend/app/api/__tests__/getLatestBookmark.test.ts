import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
vi.mock('@/logic/HandlePrismaClient', () => ({
    prisma: {
        bookmark: {
            findMany: vi.fn().mockResolvedValue([
                {
                    uri: 'at://did:plc:xxx/blue.rito.feed.bookmark/1',
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
    },
}));

import { GET } from '@app/api/getLatestBookmark/route';

describe('API: /api/getLatestBookmark', () => {
    it('最新のブックマークを取得する', async () => {
        const response = await GET();
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(data)).toBe(true);
    });
});
