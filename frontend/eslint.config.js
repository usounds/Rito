import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({
  baseDirectory: process.cwd(),
});

export default [
  // 既存の設定
  ...compat.extends(
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended'
  ),
  {
    rules: {
      '@typescript-eslint/no-require-imports': 'error',
    },
  },
  {
    ignores: ['.next/*', 'node_modules/*', "src/lexicons/*",  'next-env.d.ts'],
  },
];
