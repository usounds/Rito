import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/logic/HandleBlocklist', () => ({
    isBlocked: vi.fn((domain: string) => domain === 'blocked.com'),
}));

// Import after mocking
import { GET } from '@app/api/checkDomain/route';

describe('API: /api/checkDomain', () => {
    it('ブロックされたドメインはtrueを返す', async () => {
        const req = new Request('http://localhost/api/checkDomain?domain=blocked.com');
        const response = await GET(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.result).toBe(true);
    });

    it('ブロックされていないドメインはfalseを返す', async () => {
        const req = new Request('http://localhost/api/checkDomain?domain=safe.com');
        const response = await GET(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.result).toBe(false);
    });

    it('domainパラメータなしは400エラー', async () => {
        const req = new Request('http://localhost/api/checkDomain');
        const response = await GET(req);

        expect(response.status).toBe(400);
    });
});
