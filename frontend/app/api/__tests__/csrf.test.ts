import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock crypto
vi.mock('crypto', () => ({
    default: {
        randomBytes: () => ({
            toString: () => 'mock-csrf-token-12345',
        }),
    },
}));

import { GET } from '@app/api/csrf/route';

describe('API: /api/csrf', () => {
    it('CSRFトークンを生成する', async () => {
        const response = await GET();
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.csrfToken).toBeDefined();
        expect(typeof data.csrfToken).toBe('string');
    });

    it('CSRFトークンをクッキーに設定する', async () => {
        const response = await GET();
        const cookies = response.headers.get('set-cookie');

        expect(cookies).toContain('CSRF_TOKEN');
    });
});
