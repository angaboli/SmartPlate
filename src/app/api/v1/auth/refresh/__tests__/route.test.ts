import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/services/auth.service', () => ({
  refresh: vi.fn(),
}));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(),
  recordAttempt: vi.fn(),
  getClientIp: vi.fn().mockReturnValue('1.2.3.4'),
}));

import { POST } from '../route';
import { refresh } from '@/services/auth.service';
import { checkRateLimit } from '@/lib/rate-limit';
import { AppError, AuthError } from '@/lib/errors';

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/v1/auth/refresh', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/v1/auth/refresh', () => {
  it('returns new tokens for a valid refresh token', async () => {
    vi.mocked(refresh).mockResolvedValue({ accessToken: 'at2', refreshToken: 'rt2' } as never);

    const res = await POST(makeRequest({ refreshToken: 'rt1' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.accessToken).toBe('at2');
  });

  it('returns 401 for an invalid/expired refresh token', async () => {
    vi.mocked(refresh).mockRejectedValue(new AuthError('Invalid refresh token'));

    const res = await POST(makeRequest({ refreshToken: 'bad' }));

    expect(res.status).toBe(401);
  });

  it('returns 400 when refreshToken is missing', async () => {
    const res = await POST(makeRequest({}));

    expect(res.status).toBe(400);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('returns 429 when the refresh rate limit is exceeded', async () => {
    vi.mocked(checkRateLimit).mockRejectedValue(
      new AppError('Too many requests. Please try again later.', 429),
    );

    const res = await POST(makeRequest({ refreshToken: 'rt1' }));

    expect(res.status).toBe(429);
    expect(refresh).not.toHaveBeenCalled();
  });
});
