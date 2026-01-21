import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch
beforeEach(() => {
    global.fetch = vi.fn();
});

import { GET } from '@app/api/resolveHandle/route';

describe('API: /api/resolveHandle', () => {
    it('ハンドルをDIDに解決する', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: true,
            text: () => Promise.resolve('did:plc:testuser123'),
        });

        const req = new Request('http://localhost/api/resolveHandle?handle=user.bsky.social');
        const response = await GET(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.did).toBe('did:plc:testuser123');
    });

    it('handleパラメータなしは400エラー', async () => {
        const req = new Request('http://localhost/api/resolveHandle');
        const response = await GET(req);

        expect(response.status).toBe(400);
    });

    it('解決失敗時は502エラー', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: false,
        });

        const req = new Request('http://localhost/api/resolveHandle?handle=invalid.handle');
        const response = await GET(req);

        expect(response.status).toBe(502);
    });

    it('ネットワークエラー時は500エラー', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

        const req = new Request('http://localhost/api/resolveHandle?handle=error.test');
        const response = await GET(req);

        expect(response.status).toBe(500);
    });
});
