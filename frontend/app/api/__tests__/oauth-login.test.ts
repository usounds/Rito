import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/logic/HandleOauthClientNode', () => ({
    getOAuthClient: vi.fn().mockResolvedValue({
        authorize: vi.fn().mockResolvedValue(new URL('https://bsky.social/oauth/authorize?code=test')),
    }),
}));

// Mock environment
vi.stubEnv('NEXT_PUBLIC_URL', 'http://localhost:3000');

import { POST } from '@app/api/oauth/login/route';

describe('API: /api/oauth/login', () => {
    it('有効なリクエストでOAuth URLを返す', async () => {
        const req = new NextRequest('http://localhost/api/oauth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'referer': 'http://localhost:3000/',
            },
            body: JSON.stringify({
                handle: 'user.bsky.social',
                returnTo: '/',
                csrf: 'valid-token',
            }),
        });

        // Add CSRF cookie
        req.cookies.set('CSRF_TOKEN', 'valid-token');

        const response = await POST(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.url).toContain('oauth');
    });

    it('CSRFトークン不一致は403エラー', async () => {
        const req = new NextRequest('http://localhost/api/oauth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'referer': 'http://localhost:3000/',
            },
            body: JSON.stringify({
                handle: 'user.bsky.social',
                csrf: 'wrong-token',
            }),
        });

        req.cookies.set('CSRF_TOKEN', 'correct-token');

        const response = await POST(req);
        expect(response.status).toBe(403);
    });

    it('無効なJSONは400エラー', async () => {
        const req = new NextRequest('http://localhost/api/oauth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'referer': 'http://localhost:3000/',
            },
            body: 'invalid json',
        });

        const response = await POST(req);
        expect(response.status).toBe(400);
    });
});
