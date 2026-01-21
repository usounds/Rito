import { describe, it, expect, vi } from 'vitest';

// Mock blocklist data
vi.mock('@/data/blocklist.json', () => ({
    default: ['example-blocked.com', 'spam.net', 'malware.org'],
}));

import { isBlocked } from '../HandleBlocklist';

describe('HandleBlocklist', () => {
    describe('isBlocked', () => {
        it('ブロックリストに含まれるドメインはtrueを返す', () => {
            expect(isBlocked('example-blocked.com')).toBe(true);
            expect(isBlocked('spam.net')).toBe(true);
            expect(isBlocked('malware.org')).toBe(true);
        });

        it('サブドメインもブロック対象', () => {
            expect(isBlocked('sub.example-blocked.com')).toBe(true);
            expect(isBlocked('deep.sub.spam.net')).toBe(true);
        });

        it('ブロックリストに含まれないドメインはfalseを返す', () => {
            expect(isBlocked('safe-site.com')).toBe(false);
            expect(isBlocked('google.com')).toBe(false);
        });

        it('大文字小文字を区別しない', () => {
            expect(isBlocked('EXAMPLE-BLOCKED.COM')).toBe(true);
            expect(isBlocked('SpAm.NeT')).toBe(true);
        });

        it('部分一致はブロックしない', () => {
            expect(isBlocked('notexample-blocked.com')).toBe(false);
            expect(isBlocked('example-blocked.com.safe.net')).toBe(false);
        });
    });
});
