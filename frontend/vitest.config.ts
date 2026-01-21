import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const cssMockPlugin = {
    name: 'css-mock',
    enforce: 'pre' as const,
    resolveId(id: string) {
        if (id.endsWith('.scss') || id.endsWith('.css')) {
            return id;
        }
    },
    load(id: string) {
        if (id.endsWith('.scss') || id.endsWith('.css')) {
            return 'export default new Proxy({}, { get: (target, prop) => prop });';
        }
    },
};

export default defineConfig({
    plugins: [react(), cssMockPlugin],
    css: {
        postcss: {
            plugins: [],
        },
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./vitest.setup.ts'],
        include: ['**/*.test.{ts,tsx}'],
        exclude: ['**/node_modules/**'],
        css: false,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules',
                '.next',
                'prisma',
                '**/*.d.ts',
                'vitest.config.ts',
                'vitest.setup.ts',
            ],
        },
    },
    resolve: {
        alias: [
            { find: '@', replacement: resolve(__dirname, './src') },
            { find: '@app', replacement: resolve(__dirname, './app') },
        ],
    },
});
