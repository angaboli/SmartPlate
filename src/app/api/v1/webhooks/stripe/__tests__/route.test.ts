import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: { constructEvent: vi.fn() },
  },
}));
vi.mock('@/services/subscription.service', () => ({
  syncSubscriptionFromStripeEvent: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { POST } from '../route';
import { stripe } from '@/lib/stripe';
import { syncSubscriptionFromStripeEvent } from '@/services/subscription.service';

function makeRequest(body: string, signature?: string) {
  const headers: Record<string, string> = {};
  if (signature) headers['stripe-signature'] = signature;
  return new NextRequest('http://localhost/api/v1/webhooks/stripe', {
    method: 'POST',
    body,
    headers,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
});

describe('POST /api/v1/webhooks/stripe', () => {
  it('returns 400 when the signature header is missing', async () => {
    const res = await POST(makeRequest('{}'));
    expect(res.status).toBe(400);
    expect(stripe.webhooks.constructEvent).not.toHaveBeenCalled();
  });

  it('returns 400 when signature verification fails', async () => {
    vi.mocked(stripe.webhooks.constructEvent).mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const res = await POST(makeRequest('{}', 'bad_sig'));

    expect(res.status).toBe(400);
    expect(syncSubscriptionFromStripeEvent).not.toHaveBeenCalled();
  });

  it('processes a verified event and returns 200', async () => {
    const event = { type: 'checkout.session.completed', data: { object: {} } };
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(event as never);
    vi.mocked(syncSubscriptionFromStripeEvent).mockResolvedValue(undefined);

    const res = await POST(makeRequest(JSON.stringify(event), 'good_sig'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.received).toBe(true);
    expect(syncSubscriptionFromStripeEvent).toHaveBeenCalledWith(event);
  });

  it('returns 500 when the sync handler throws', async () => {
    const event = { type: 'customer.subscription.updated', data: { object: {} } };
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(event as never);
    vi.mocked(syncSubscriptionFromStripeEvent).mockRejectedValue(new Error('db down'));

    const res = await POST(makeRequest(JSON.stringify(event), 'good_sig'));

    expect(res.status).toBe(500);
  });
});
