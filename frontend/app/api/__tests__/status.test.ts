import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
vi.mock('@/logic/HandlePrismaClient', () => ({
    prisma: {
        jetstreamIndex: {
            findUnique: vi.fn().mockResolvedValue({
                service: 'rito',
                index: String(Date.now() * 1000), // 現在時刻（マイクロ秒）
            }),
        },
    },
}));

import { GET } from '@app/api/status/route';

describe('API: /api/status', () => {
    it('システムステータスを返す', async () => {
        const response = await GET();
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.comment).toBeDefined();
        expect(typeof data.diffMinutes).toBe('number');
    });

    it('正常時は遅延なしのコメントを返す', async () => {
        const response = await GET();
        const data = await response.json();

        expect(data.diffMinutes).toBe(0);
        expect(data.comment).toContain('normally');
    });

    it('5分以上の遅延がある場合は遅延コメントを返す', async () => {
        const delayTime = Date.now() - (10 * 60 * 1000); // 10分前
        const { prisma } = await import('@/logic/HandlePrismaClient');
        vi.mocked(prisma.jetstreamIndex.findUnique).mockResolvedValueOnce({
            service: 'rito',
            index: String(delayTime * 1000),
        } as any);

        const response = await GET();
        const data = await response.json();

        expect(data.diffMinutes).toBeGreaterThanOrEqual(10);
        expect(data.comment).toContain('experiencing delays');
    });

    it('レコードがない場合は遅延コメントを返す', async () => {
        const { prisma } = await import('@/logic/HandlePrismaClient');
        vi.mocked(prisma.jetstreamIndex.findUnique).mockResolvedValueOnce(null);

        const response = await GET();
        const data = await response.json();

        expect(data.comment).toContain('experiencing delays');
    });

    it('DBエラー時は500を返す', async () => {
        const { prisma } = await import('@/logic/HandlePrismaClient');
        vi.mocked(prisma.jetstreamIndex.findUnique).mockRejectedValueOnce(new Error('DB Error'));

        const response = await GET();
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Internal Server Error');
    });
});
