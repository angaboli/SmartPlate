import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/services/auth.service', () => ({
  logout: vi.fn(),
}));

import { POST } from '../route';
import { logout } from '@/services/auth.service';

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/v1/auth/logout', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/v1/auth/logout', () => {
  it('logs out with a valid refresh token', async () => {
    vi.mocked(logout).mockResolvedValue(undefined);

    const res = await POST(makeRequest({ refreshToken: 'rt1' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toBe('Logged out');
    expect(logout).toHaveBeenCalledWith('rt1');
  });

  it('returns 400 when refreshToken is missing', async () => {
    const res = await POST(makeRequest({}));

    expect(res.status).toBe(400);
    expect(logout).not.toHaveBeenCalled();
  });

  it('returns 500 if logout throws unexpectedly', async () => {
    vi.mocked(logout).mockRejectedValue(new Error('db down'));

    const res = await POST(makeRequest({ refreshToken: 'rt1' }));

    expect(res.status).toBe(500);
  });
});
