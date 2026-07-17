import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/rate-limit', () => ({
  cleanupExpiredAttempts: vi.fn(),
}));

import { GET } from '../route';
import { cleanupExpiredAttempts } from '@/lib/rate-limit';

function makeRequest(authHeader?: string) {
  return new NextRequest('http://localhost/api/v1/cron/cleanup-rate-limits', {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

const ORIGINAL_CRON_SECRET = process.env.CRON_SECRET;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = 'test-secret';
});

afterEach(() => {
  process.env.CRON_SECRET = ORIGINAL_CRON_SECRET;
});

describe('GET /api/v1/cron/cleanup-rate-limits', () => {
  it('returns 401 when the bearer token does not match CRON_SECRET', async () => {
    const res = await GET(makeRequest('Bearer wrong-secret'));

    expect(res.status).toBe(401);
    expect(cleanupExpiredAttempts).not.toHaveBeenCalled();
  });

  it('returns 401 when no authorization header is present', async () => {
    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
    expect(cleanupExpiredAttempts).not.toHaveBeenCalled();
  });

  it('returns 401 when CRON_SECRET is not configured', async () => {
    process.env.CRON_SECRET = '';

    const res = await GET(makeRequest('Bearer test-secret'));

    expect(res.status).toBe(401);
  });

  it('runs the cleanup when the bearer token matches', async () => {
    vi.mocked(cleanupExpiredAttempts).mockResolvedValue(7);

    const res = await GET(makeRequest('Bearer test-secret'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, deleted: 7 });
  });
});
