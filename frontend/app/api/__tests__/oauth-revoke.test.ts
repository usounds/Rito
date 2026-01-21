import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/logic/HandleOauthClientNode', () => ({
    getOAuthClient: vi.fn().mockResolvedValue({
        restore: vi.fn().mockResolvedValue({
            signOut: vi.fn().mockResolvedValue(undefined),
        }),
    }),
    verifySignedDid: vi.fn().mockImplementation((signed: string) => {
        if (signed.startsWith('did:plc:')) return signed.split('.')[0];
        return null;
    }),
}));

vi.stubEnv('NEXT_PUBLIC_URL', 'http://localhost:3000');

import { GET } from '@app/api/oauth/revoke/route';

describe('API: /api/oauth/revoke', () => {
    it('有効なセッションでログアウト成功', async () => {
        const req = new NextRequest('http://localhost/api/oauth/revoke', {
            headers: {
                'referer': 'http://localhost:3000/',
            },
        });
        req.cookies.set('USER_DID', 'did:plc:testuser.signature');

        const response = await GET(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.ok).toBe(true);
    });

    it('USER_DIDクッキーなしは401エラー', async () => {
        const req = new NextRequest('http://localhost/api/oauth/revoke', {
            headers: {
                'referer': 'http://localhost:3000/',
            },
        });

        const response = await GET(req);
        expect(response.status).toBe(401);
    });

    it('無効な署名は401エラー', async () => {
        const req = new NextRequest('http://localhost/api/oauth/revoke', {
            headers: {
                'referer': 'http://localhost:3000/',
            },
        });
        req.cookies.set('USER_DID', 'invalid-signature');

        const response = await GET(req);
        expect(response.status).toBe(401);
    });
});
