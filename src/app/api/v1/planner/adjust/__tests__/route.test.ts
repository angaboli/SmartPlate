import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock('@/services/planner.service', () => ({
  checkPlannerRateLimit: vi.fn(),
  adjustPlanWithAI: vi.fn(),
}));

import { POST } from '../route';
import { getCurrentUser } from '@/lib/auth';
import { checkPlannerRateLimit, adjustPlanWithAI } from '@/services/planner.service';
import { AppError } from '@/lib/errors';

function makeRequest(body: unknown = {}) {
  return new NextRequest('http://localhost/api/v1/planner/adjust', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/v1/planner/adjust', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const res = await POST(makeRequest());

    expect(res.status).toBe(401);
    expect(adjustPlanWithAI).not.toHaveBeenCalled();
  });

  it('returns 429 when the daily generation limit is reached', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(checkPlannerRateLimit).mockRejectedValue(
      new AppError('Daily plan generation limit reached (5/day).', 429),
    );

    const res = await POST(makeRequest());

    expect(res.status).toBe(429);
    expect(adjustPlanWithAI).not.toHaveBeenCalled();
  });

  it('adjusts the plan on success, defaulting week to 0', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(checkPlannerRateLimit).mockResolvedValue(undefined);
    vi.mocked(adjustPlanWithAI).mockResolvedValue({ id: 'p1' } as never);

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.plan.id).toBe('p1');
    expect(adjustPlanWithAI).toHaveBeenCalledWith('u1', 0);
  });
});
