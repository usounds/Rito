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
});
