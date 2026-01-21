import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/logic/HandleJWT', () => ({
    verifyJWT: vi.fn().mockImplementation(async (auth: string, audience: string) => {
        if (auth === 'Bearer valid-token') {
            return {
                verified: true,
                payload: {
                    iss: 'did:plc:testuser',
                    lxm: 'blue.rito.preference.getPreference',
                },
            };
        }
        throw new Error('Invalid JWT');
    }),
}));

vi.mock('@/logic/HandlePrismaClient', () => ({
    prisma: {
        postToBookmark: {
            findUnique: vi.fn().mockResolvedValue({
                sub: 'did:plc:testuser',
                lang: 'ja',
            }),
        },
    },
}));

vi.stubEnv('NEXT_PUBLIC_URL', 'https://rito.blue');

import { GET } from '@app/xrpc/blue.rito.preference.getPreference/route';

describe('xRPC: /xrpc/blue.rito.preference.getPreference', () => {
    it('設定を取得する', async () => {
        const req = new Request('http://localhost/xrpc/blue.rito.preference.getPreference', {
            headers: {
                'Authorization': 'Bearer valid-token',
            },
        });
        const response = await GET(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.enableAutoGenerateBookmark).toBeDefined();
    });

    it('Authorizationヘッダーなしは500エラー', async () => {
        const req = new Request('http://localhost/xrpc/blue.rito.preference.getPreference');
        const response = await GET(req);

        expect(response.status).toBe(500);
    });
});
