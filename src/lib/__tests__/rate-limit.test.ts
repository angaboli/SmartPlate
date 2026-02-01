import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => import('../__mocks__/db'));
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { checkRateLimit, recordAttempt, cleanupExpiredAttempts, getClientIp } from '../rate-limit';
import { db } from '../__mocks__/db';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getClientIp', () => {
  it('extracts IP from x-forwarded-for header', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(getClientIp(request)).toBe('1.2.3.4');
  });

  it('returns 127.0.0.1 when no header present', () => {
    const request = new Request('http://localhost');
    expect(getClientIp(request)).toBe('127.0.0.1');
  });
});

describe('checkRateLimit', () => {
  it('does not throw when under limit', async () => {
    db.rateLimitAttempt.count.mockResolvedValue(5);

    await expect(
      checkRateLimit({ identifier: '1.2.3.4', action: 'login', windowMs: 900000, maxAttempts: 10 }),
    ).resolves.toBeUndefined();
  });

  it('throws 429 when limit exceeded', async () => {
    db.rateLimitAttempt.count.mockResolvedValue(10);

    await expect(
      checkRateLimit({ identifier: '1.2.3.4', action: 'login', windowMs: 900000, maxAttempts: 10 }),
    ).rejects.toThrow('Too many requests');
  });
});

describe('recordAttempt', () => {
  it('creates a rate limit attempt record', async () => {
    db.rateLimitAttempt.create.mockResolvedValue({ id: '1', identifier: '1.2.3.4', action: 'login' });

    await recordAttempt('1.2.3.4', 'login');

    expect(db.rateLimitAttempt.create).toHaveBeenCalledWith({
      data: { identifier: '1.2.3.4', action: 'login' },
    });
  });
});

describe('cleanupExpiredAttempts', () => {
  it('deletes old records and returns count', async () => {
    db.rateLimitAttempt.deleteMany.mockResolvedValue({ count: 42 });

    const result = await cleanupExpiredAttempts();

    expect(result).toBe(42);
    expect(db.rateLimitAttempt.deleteMany).toHaveBeenCalledWith({
      where: { createdAt: { lt: expect.any(Date) } },
    });
  });
});
