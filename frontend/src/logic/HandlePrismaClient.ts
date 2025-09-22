import { PrismaClient } from '@prisma/client';
export * from '@prisma/client';

declare global {
  // Node.js では globalThis に prisma を追加
  var prisma: PrismaClient | undefined;
}

// Prisma Client をグローバルに保持（再生成を防ぐ）
export const prisma: PrismaClient =
  globalThis.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}
