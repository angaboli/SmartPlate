import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/services/auth.service', () => ({
  register: vi.fn(),
}));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(),
  recordAttempt: vi.fn(),
  getClientIp: vi.fn().mockReturnValue('1.2.3.4'),
}));

import { POST } from '../route';
import { register } from '@/services/auth.service';
import { checkRateLimit } from '@/lib/rate-limit';
import { AppError, ConflictError } from '@/lib/errors';

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

const validBody = { email: 'new@test.com', password: 'password123', name: 'New User' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/v1/auth/register', () => {
  it('creates the account and returns tokens on success', async () => {
    vi.mocked(register).mockResolvedValue({
      user: { id: 'u1', email: 'new@test.com', name: 'New User', role: 'user' },
      tokens: { accessToken: 'at', refreshToken: 'rt' },
    } as never);

    const res = await POST(makeRequest(validBody));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.tokens.accessToken).toBe('at');
    expect(register).toHaveBeenCalledWith(validBody);
  });

  it('returns 409 when the email is already registered', async () => {
    vi.mocked(register).mockRejectedValue(new ConflictError('Email already registered'));

    const res = await POST(makeRequest(validBody));

    expect(res.status).toBe(409);
  });

  it('returns 400 for an invalid body (e.g. weak password)', async () => {
    const res = await POST(makeRequest({ email: 'new@test.com', password: '123' }));

    expect(res.status).toBe(400);
    expect(register).not.toHaveBeenCalled();
  });

  it('returns 429 when the registration rate limit is exceeded', async () => {
    vi.mocked(checkRateLimit).mockRejectedValue(
      new AppError('Too many requests. Please try again later.', 429),
    );

    const res = await POST(makeRequest(validBody));

    expect(res.status).toBe(429);
    expect(register).not.toHaveBeenCalled();
  });
});
