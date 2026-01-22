import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['src/**/__tests__/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.ts'],
            exclude: [
                'src/**/__tests__/**',
                'src/lexicons/**',
                'src/index.ts',        // Entry point with side effects
                'src/db.ts',           // Prisma-dependent module
                'src/lib/HandleOauthClientNode.ts', // OAuth client with top-level await
                'node_modules/**',
            ],
        },
        testTimeout: 10000,
    },
});
