import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock('@/services/planner.service', () => ({
  getGroceryListForPlan: vi.fn(),
}));

import { GET } from '../route';
import { getCurrentUser } from '@/lib/auth';
import { getGroceryListForPlan } from '@/services/planner.service';
import { NotFoundError } from '@/lib/errors';

function makeRequest() {
  return new NextRequest('http://localhost/api/v1/planner/p1/groceries');
}

function makeParams(id = 'p1') {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/v1/planner/[id]/groceries', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(401);
    expect(getGroceryListForPlan).not.toHaveBeenCalled();
  });

  it('returns 404 when the plan does not belong to the user', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(getGroceryListForPlan).mockRejectedValue(new NotFoundError('Plan not found'));

    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(404);
  });

  it('returns the grocery list on success', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(getGroceryListForPlan).mockResolvedValue({ items: [{ name: 'Chicken' }] } as never);

    const res = await GET(makeRequest(), makeParams());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(getGroceryListForPlan).toHaveBeenCalledWith('u1', 'p1');
  });
});
