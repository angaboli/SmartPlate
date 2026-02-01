import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return '127.0.0.1';
}

export async function checkRateLimit({
  windowMs,
  maxAttempts,
  identifier,
  action,
}: {
  windowMs: number;
  maxAttempts: number;
  identifier: string;
  action: string;
}): Promise<void> {
  const windowStart = new Date(Date.now() - windowMs);

  const count = await db.rateLimitAttempt.count({
    where: {
      identifier,
      action,
      createdAt: { gte: windowStart },
    },
  });

  if (count >= maxAttempts) {
    logger.warn({ identifier, action, count, maxAttempts }, 'Rate limit exceeded');
    throw new AppError('Too many requests. Please try again later.', 429);
  }
}

export async function recordAttempt(
  identifier: string,
  action: string,
): Promise<void> {
  await db.rateLimitAttempt.create({
    data: { identifier, action },
  });
}

export async function cleanupExpiredAttempts(): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const result = await db.rateLimitAttempt.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return result.count;
}
