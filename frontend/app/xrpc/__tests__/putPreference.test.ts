import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/logic/HandleJWT', () => ({
    verifyJWT: vi.fn().mockImplementation(async (auth: string) => {
        if (auth === 'Bearer valid-token') {
            return {
                verified: true,
                payload: {
                    iss: 'did:plc:testuser',
                    lxm: 'blue.rito.preference.putPreference',
                },
            };
        }
        throw new Error('Invalid JWT');
    }),
}));

vi.mock('@/logic/HandlePrismaClient', () => ({
    prisma: {
        postToBookmark: {
            upsert: vi.fn().mockResolvedValue({ sub: 'did:plc:testuser' }),
            deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
    },
}));

vi.stubEnv('NEXT_PUBLIC_URL', 'https://rito.blue');

import { POST } from '@app/xrpc/blue.rito.preference.putPreference/route';

describe('xRPC: /xrpc/blue.rito.preference.putPreference', () => {
    it('設定を有効にする', async () => {
        const req = new NextRequest('http://localhost/xrpc/blue.rito.preference.putPreference', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer valid-token',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ enableAutoGenerateBookmark: true }),
        });
        const response = await POST(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.enableAutoGenerateBookmark).toBe(true);
    });

    it('設定を無効にする', async () => {
        const req = new NextRequest('http://localhost/xrpc/blue.rito.preference.putPreference', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer valid-token',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ enableAutoGenerateBookmark: false }),
        });
        const response = await POST(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.enableAutoGenerateBookmark).toBe(false);
    });

    it('Authorizationヘッダーなしは500エラー', async () => {
        const req = new NextRequest('http://localhost/xrpc/blue.rito.preference.putPreference', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ enableAutoGenerateBookmark: true }),
        });
        const response = await POST(req);

        expect(response.status).toBe(500);
    });
});
