import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockFetchSafeRemoteHtml } = vi.hoisted(() => ({
    mockFetchSafeRemoteHtml: vi.fn(),
}));

vi.mock('@/logic/safeRemoteHtml', async (importOriginal) => {
    const original = await importOriginal<typeof import('@/logic/safeRemoteHtml')>();
    return {
        ...original,
        fetchSafeRemoteHtml: mockFetchSafeRemoteHtml,
    };
});

vi.mock('@/logic/HandleOauthClientNode', () => ({
    verifySignedDid: vi.fn((value: string) => value === 'did:plc:test.signature' ? 'did:plc:test' : null),
}));

// Mock open-graph-scraper
vi.mock('open-graph-scraper', () => ({
    default: vi.fn().mockResolvedValue({
        result: {
            ogTitle: 'Example Title',
            ogDescription: 'Example Description',
            ogImage: [{ url: '/image.jpg' }],
        },
    }),
}));

import { GET } from '@app/api/fetchOgp/route';

describe('API: /api/fetchOgp', () => {
    function createRequest(url: string, authenticated = true) {
        const request = new NextRequest(url);
        if (authenticated) {
            request.cookies.set('USER_DID', 'did:plc:test.signature');
        }
        return request;
    }

    beforeEach(() => {
        vi.clearAllMocks();
        mockFetchSafeRemoteHtml.mockResolvedValue({
            html: '<html><head></head></html>',
            finalUrl: 'https://example.com/page',
        });
    });

    it('OGPデータを取得する', async () => {
        const req = createRequest('http://localhost/api/fetchOgp?url=https://example.com');
        const response = await GET(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.result).toBeDefined();
        expect(data.result.ogImage[0].url).toBe('https://example.com/image.jpg');
        expect(data.html).toBeUndefined();
        expect(response.headers.get('Cache-Control')).toContain('no-store');
    });

    it('urlパラメータなしは400エラー', async () => {
        const req = createRequest('http://localhost/api/fetchOgp');
        const response = await GET(req);

        expect(response.status).toBe(400);
    });

    it('取得失敗時は500エラー', async () => {
        mockFetchSafeRemoteHtml.mockRejectedValueOnce(new Error('Failed to fetch OGP'));
        const req = createRequest('http://localhost/api/fetchOgp?url=https://invalid-url.test');
        const response = await GET(req);

        expect(response.status).toBe(500);
    });

    it('未認証リクエストは401を返す', async () => {
        const req = createRequest('http://localhost/api/fetchOgp?url=https://example.com', false);

        const response = await GET(req);

        expect(response.status).toBe(401);
        expect(mockFetchSafeRemoteHtml).not.toHaveBeenCalled();
    });
});
