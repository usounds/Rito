import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
export * from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// Internal networks (localhost, Docker service names without dots) don't need SSL
const isInternalNetwork = !process.env.DATABASE_URL?.match(/@[\w-]+\.[\w.-]+[:/]/);

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isInternalNetwork ? false : { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;