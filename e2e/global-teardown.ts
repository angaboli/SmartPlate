import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Every E2E-created user gets an @e2e.smartplate.test email (see
// e2e/helpers/test-user.ts) so this can find and remove exactly what the
// suite created, without touching real dev data. Recipe deletion happens
// separately first: Recipe.authorId is onDelete: SetNull (not Cascade), so
// deleting the user alone would leave the imported recipe behind.
export default async function globalTeardown() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const db = new PrismaClient({ adapter });

  try {
    await db.recipe.deleteMany({
      where: { sourceUrl: { contains: '/recipe-fixture' } },
    });

    await db.user.deleteMany({
      where: { email: { endsWith: '@e2e.smartplate.test' } },
    });

    // The register endpoint rate-limits by IP (src/lib/rate-limit.ts,
    // 5/hour — see src/app/api/v1/auth/register/route.ts). Every E2E run
    // registers from localhost (no x-forwarded-for header locally — Node
    // reports it as the IPv4-mapped IPv6 form '::ffff:127.0.0.1'), so
    // without this an hour of repeated `pnpm test:e2e` runs would lock
    // itself out. Real deployed traffic always has a real forwarded IP
    // (Vercel sets x-forwarded-for), so this only ever clears local/dev
    // attempts, never production users' quota.
    await db.rateLimitAttempt.deleteMany({
      where: {
        identifier: { in: ['127.0.0.1', '::1', '::ffff:127.0.0.1'] },
        action: 'register',
      },
    });
  } finally {
    await db.$disconnect();
  }
}
