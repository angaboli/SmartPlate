import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock('@/services/planner.service', () => ({
  checkPlannerRateLimit: vi.fn(),
  generateAndSavePlan: vi.fn(),
}));
vi.mock('@/services/subscription.service', () => ({
  requireActiveSubscription: vi.fn(),
}));

import { POST } from '../route';
import { getCurrentUser } from '@/lib/auth';
import { checkPlannerRateLimit, generateAndSavePlan } from '@/services/planner.service';
import { requireActiveSubscription } from '@/services/subscription.service';
import { AppError, SubscriptionRequiredError } from '@/lib/errors';

function makeRequest(body: unknown = {}) {
  return new NextRequest('http://localhost/api/v1/planner/generate', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireActiveSubscription).mockResolvedValue(undefined);
});

describe('POST /api/v1/planner/generate', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const res = await POST(makeRequest());

    expect(res.status).toBe(401);
    expect(generateAndSavePlan).not.toHaveBeenCalled();
  });

  it('returns 402 when the user has no active subscription', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(requireActiveSubscription).mockRejectedValue(
      new SubscriptionRequiredError('This feature requires an active subscription.'),
    );

    const res = await POST(makeRequest());

    expect(res.status).toBe(402);
    expect(generateAndSavePlan).not.toHaveBeenCalled();
  });

  it('returns 429 when the daily generation limit is reached', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(checkPlannerRateLimit).mockRejectedValue(
      new AppError('Daily plan generation limit reached (5/day).', 429),
    );

    const res = await POST(makeRequest());

    expect(res.status).toBe(429);
    expect(generateAndSavePlan).not.toHaveBeenCalled();
  });

  it('generates and saves the plan on success, defaulting week to 0', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(checkPlannerRateLimit).mockResolvedValue(undefined);
    vi.mocked(generateAndSavePlan).mockResolvedValue({ id: 'p1' } as never);

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.plan.id).toBe('p1');
    expect(generateAndSavePlan).toHaveBeenCalledWith('u1', 0);
  });

  it('clamps the week offset to [-52, 52]', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(checkPlannerRateLimit).mockResolvedValue(undefined);
    vi.mocked(generateAndSavePlan).mockResolvedValue({ id: 'p1' } as never);

    await POST(makeRequest({ week: 999 }));

    expect(generateAndSavePlan).toHaveBeenCalledWith('u1', 52);
  });
});
