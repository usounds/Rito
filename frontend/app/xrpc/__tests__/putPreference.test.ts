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
            findUnique: vi.fn().mockResolvedValue(null),
            upsert: vi.fn().mockResolvedValue({ sub: 'did:plc:testuser' }),
            deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        userDidHandle: {
            findUnique: vi.fn().mockResolvedValue({
                did: 'did:plc:testuser',
                unblur_moderation_categories: [],
                terms_notice_acknowledged_revision_date: null,
                privacy_notice_acknowledged_revision_date: null,
            }),
            upsert: vi.fn().mockResolvedValue({
                did: 'did:plc:testuser',
                unblur_moderation_categories: [],
            }),
        },
    },
}));

vi.stubEnv('NEXT_PUBLIC_URL', 'https://rito.blue');

import { prisma } from '@/logic/HandlePrismaClient';
import { POST } from '@app/xrpc/blue.rito.preference.putPreference/route';

describe('xRPC: /xrpc/blue.rito.preference.putPreference', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(prisma.postToBookmark.findUnique).mockResolvedValue(null);
        vi.mocked(prisma.userDidHandle.findUnique).mockResolvedValue({
            did: 'did:plc:testuser',
            handle: 'test.bsky.social',
            unblur_moderation_categories: [],
            terms_notice_acknowledged_revision_date: null,
            privacy_notice_acknowledged_revision_date: null,
        } as never);
    });

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

    it('法務通知の確認日だけを更新しても自動収集設定を変更しない', async () => {
        vi.mocked(prisma.postToBookmark.findUnique).mockResolvedValue({
            sub: 'did:plc:testuser',
            lang: 'ja',
        } as never);

        const req = new NextRequest('http://localhost/xrpc/blue.rito.preference.putPreference', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer valid-token',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                termsNoticeAcknowledgedRevisionDate: '2026-07-03',
                privacyNoticeAcknowledgedRevisionDate: '2026-07-03',
            }),
        });
        const response = await POST(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.enableAutoGenerateBookmark).toBe(true);
        expect(data.termsNoticeAcknowledgedRevisionDate).toBe('2026-07-03');
        expect(data.privacyNoticeAcknowledgedRevisionDate).toBe('2026-07-03');
        expect(prisma.postToBookmark.deleteMany).not.toHaveBeenCalled();
        expect(prisma.postToBookmark.upsert).not.toHaveBeenCalled();
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
