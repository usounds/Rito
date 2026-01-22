import { describe, it, expect, vi } from 'vitest';

describe('logger', () => {
    it('should export a logger instance', async () => {
        const logger = (await import('../logger.js')).default;
        expect(logger).toBeDefined();
        expect(typeof logger.info).toBe('function');
        expect(typeof logger.error).toBe('function');
        expect(typeof logger.warn).toBe('function');
        expect(typeof logger.debug).toBe('function');
    });

    it('should have info method that can be called', async () => {
        const logger = (await import('../logger.js')).default;
        // Just verify it doesn't throw
        expect(() => logger.info('Test log message')).not.toThrow();
    });

    it('should have error method that can be called', async () => {
        const logger = (await import('../logger.js')).default;
        expect(() => logger.error('Test error message')).not.toThrow();
    });

    it('should have warn method that can be called', async () => {
        const logger = (await import('../logger.js')).default;
        expect(() => logger.warn('Test warning message')).not.toThrow();
    });
});
