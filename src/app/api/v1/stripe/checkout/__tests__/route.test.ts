import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock('@/services/subscription.service', () => ({
  createCheckoutSession: vi.fn(),
}));

import { POST } from '../route';
import { getCurrentUser } from '@/lib/auth';
import { createCheckoutSession } from '@/services/subscription.service';

function makeRequest() {
  return new NextRequest('http://localhost/api/v1/stripe/checkout', { method: 'POST' });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/v1/stripe/checkout', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const res = await POST(makeRequest());

    expect(res.status).toBe(401);
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it('returns the checkout session url on success', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(createCheckoutSession).mockResolvedValue({
      url: 'https://checkout.stripe.com/session123',
    } as never);

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.url).toBe('https://checkout.stripe.com/session123');
    expect(createCheckoutSession).toHaveBeenCalledWith('u1');
  });
});
