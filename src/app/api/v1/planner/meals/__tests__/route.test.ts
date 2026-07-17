import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock('@/services/planner.service', () => ({
  addMealToPlan: vi.fn(),
}));

import { POST } from '../route';
import { getCurrentUser } from '@/lib/auth';
import { addMealToPlan } from '@/services/planner.service';

const validBody = { dayIndex: 0, mealType: 'lunch', name: 'Chicken salad', calories: 500 };

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/v1/planner/meals', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/v1/planner/meals', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const res = await POST(makeRequest(validBody));

    expect(res.status).toBe(401);
    expect(addMealToPlan).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid dayIndex', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });

    const res = await POST(makeRequest({ ...validBody, dayIndex: 7 }));

    expect(res.status).toBe(400);
    expect(addMealToPlan).not.toHaveBeenCalled();
  });

  it('adds the meal on success, defaulting week to 0', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(addMealToPlan).mockResolvedValue({ id: 'p1' } as never);

    const res = await POST(makeRequest(validBody));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.plan.id).toBe('p1');
    expect(addMealToPlan).toHaveBeenCalledWith(
      'u1',
      { dayIndex: 0, mealType: 'lunch', name: 'Chicken salad', calories: 500 },
      0,
    );
  });

  it('passes a non-default week through', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(addMealToPlan).mockResolvedValue({ id: 'p1' } as never);

    await POST(makeRequest({ ...validBody, week: 2 }));

    expect(addMealToPlan).toHaveBeenCalledWith('u1', expect.any(Object), 2);
  });
});
