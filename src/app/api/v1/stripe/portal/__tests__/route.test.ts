import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock('@/services/subscription.service', () => ({
  createPortalSession: vi.fn(),
}));

import { POST } from '../route';
import { getCurrentUser } from '@/lib/auth';
import { createPortalSession } from '@/services/subscription.service';
import { NotFoundError } from '@/lib/errors';

function makeRequest() {
  return new NextRequest('http://localhost/api/v1/stripe/portal', { method: 'POST' });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/v1/stripe/portal', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const res = await POST(makeRequest());

    expect(res.status).toBe(401);
    expect(createPortalSession).not.toHaveBeenCalled();
  });

  it('returns 404 when the user has no billing account yet', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(createPortalSession).mockRejectedValue(
      new NotFoundError('No billing account found for this user'),
    );

    const res = await POST(makeRequest());

    expect(res.status).toBe(404);
  });

  it('returns the portal session url on success', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(createPortalSession).mockResolvedValue({
      url: 'https://billing.stripe.com/session123',
    } as never);

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.url).toBe('https://billing.stripe.com/session123');
    expect(createPortalSession).toHaveBeenCalledWith('u1');
  });
});
