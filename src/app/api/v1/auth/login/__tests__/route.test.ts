import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/services/auth.service', () => ({
  login: vi.fn(),
}));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(),
  recordAttempt: vi.fn(),
  getClientIp: vi.fn().mockReturnValue('1.2.3.4'),
}));

import { POST } from '../route';
import { login } from '@/services/auth.service';
import { checkRateLimit } from '@/lib/rate-limit';
import { AppError, AuthError } from '@/lib/errors';

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/v1/auth/login', () => {
  it('returns tokens for valid credentials', async () => {
    vi.mocked(login).mockResolvedValue({
      user: { id: 'u1', email: 'a@test.com', name: 'A', role: 'user' },
      tokens: { accessToken: 'at', refreshToken: 'rt' },
    } as never);

    const res = await POST(makeRequest({ email: 'a@test.com', password: 'password123' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.tokens.accessToken).toBe('at');
  });

  it('returns 401 for invalid credentials', async () => {
    vi.mocked(login).mockRejectedValue(new AuthError('Invalid email or password'));

    const res = await POST(makeRequest({ email: 'a@test.com', password: 'wrong' }));

    expect(res.status).toBe(401);
  });

  it('returns 400 for a malformed body', async () => {
    const res = await POST(makeRequest({ email: 'not-an-email' }));

    expect(res.status).toBe(400);
    expect(login).not.toHaveBeenCalled();
  });

  it('returns 429 when the login rate limit is exceeded', async () => {
    vi.mocked(checkRateLimit).mockRejectedValue(
      new AppError('Too many requests. Please try again later.', 429),
    );

    const res = await POST(makeRequest({ email: 'a@test.com', password: 'password123' }));

    expect(res.status).toBe(429);
    expect(login).not.toHaveBeenCalled();
  });
});
