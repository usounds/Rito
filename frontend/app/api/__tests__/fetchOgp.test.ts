import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock open-graph-scraper
vi.mock('open-graph-scraper', () => ({
    default: vi.fn().mockImplementation(({ url }: { url: string }) => {
        if (url === 'https://example.com') {
            return Promise.resolve({
                result: {
                    ogTitle: 'Example Title',
                    ogDescription: 'Example Description',
                    ogImage: [{ url: 'https://example.com/image.jpg' }],
                },
            });
        }
        return Promise.reject(new Error('Failed to fetch OGP'));
    }),
}));

import { GET } from '@app/api/fetchOgp/route';

describe('API: /api/fetchOgp', () => {
    it('OGPデータを取得する', async () => {
        const req = new Request('http://localhost/api/fetchOgp?url=https://example.com');
        const response = await GET(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.result).toBeDefined();
    });

    it('urlパラメータなしは400エラー', async () => {
        const req = new Request('http://localhost/api/fetchOgp');
        const response = await GET(req);

        expect(response.status).toBe(400);
    });

    it('取得失敗時は500エラー', async () => {
        const req = new Request('http://localhost/api/fetchOgp?url=https://invalid-url.test');
        const response = await GET(req);

        expect(response.status).toBe(500);
    });
});
