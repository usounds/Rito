import nextPlugin from '@next/eslint-plugin-next';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  // 🟥 まず最初に全体 ignore を定義する（Flat Configでは順序が重要）
  {
    ignores: [
      '**/.next/**',
      '**/node_modules/**',
      '**/out/**',
      '**/dist/**',
      'next-env.d.ts',
      'src/lexicons/**',
    ],
  },

  // 🟩 lint 対象の定義
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@next/next': nextPlugin,
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...nextPlugin.configs['core-web-vitals'].rules,
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-require-imports': 'error',
    },
  },
];
