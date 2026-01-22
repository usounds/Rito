import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('config', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.resetModules();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('should export BOOKMARK constant', async () => {
        const { BOOKMARK } = await import('../config.js');
        expect(BOOKMARK).toBe('blue.rito.feed.bookmark');
    });

    it('should export LIKE constant', async () => {
        const { LIKE } = await import('../config.js');
        expect(LIKE).toBe('blue.rito.feed.like');
    });

    it('should export SERVICE constant', async () => {
        const { SERVICE } = await import('../config.js');
        expect(SERVICE).toBe('blue.rito.service.schema');
    });

    it('should export POST_COLLECTION constant', async () => {
        const { POST_COLLECTION } = await import('../config.js');
        expect(POST_COLLECTION).toBe('app.bsky.feed.post');
    });

    it('should use default JETSTREAM_URL when env is not set', async () => {
        delete process.env.JETSREAM_URL;
        const { JETSREAM_URL } = await import('../config.js');
        expect(JETSREAM_URL).toBe('wss://jetstream2.us-west.bsky.network/subscribe');
    });

    it('should use default CURSOR_UPDATE_INTERVAL when env is not set', async () => {
        delete process.env.CURSOR_UPDATE_INTERVAL;
        const { CURSOR_UPDATE_INTERVAL } = await import('../config.js');
        expect(CURSOR_UPDATE_INTERVAL).toBe(60000);
    });
});
