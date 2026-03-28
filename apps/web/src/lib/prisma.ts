import { PrismaClient } from '@cveriskpilot/domain';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    // Connection pool: tune for Cloud Run concurrency (80 req/instance)
    // PgBouncer handles server-side pooling; Prisma pool is per-instance.
    datasourceUrl: process.env.DATABASE_URL,
    log:
      process.env.NODE_ENV === 'production'
        ? ['error']
        : ['query', 'error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
