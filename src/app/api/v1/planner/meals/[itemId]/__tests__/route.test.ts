import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock('@/services/planner.service', () => ({
  updateMealItem: vi.fn(),
  deleteMealItem: vi.fn(),
}));

import { PATCH, DELETE } from '../route';
import { getCurrentUser } from '@/lib/auth';
import { updateMealItem, deleteMealItem } from '@/services/planner.service';
import { NotFoundError } from '@/lib/errors';

function makeRequest(body?: unknown, method = 'PATCH') {
  return new NextRequest('http://localhost/api/v1/planner/meals/item1', {
    method,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makeParams(itemId = 'item1') {
  return { params: Promise.resolve({ itemId }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PATCH /api/v1/planner/meals/[itemId]', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const res = await PATCH(makeRequest({ name: 'New name' }), makeParams());

    expect(res.status).toBe(401);
    expect(updateMealItem).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid dayIndex', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });

    const res = await PATCH(makeRequest({ dayIndex: 9 }), makeParams());

    expect(res.status).toBe(400);
    expect(updateMealItem).not.toHaveBeenCalled();
  });

  it('returns 404 when the meal item does not belong to the user', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(updateMealItem).mockRejectedValue(new NotFoundError('Meal item not found'));

    const res = await PATCH(makeRequest({ name: 'New name' }), makeParams());

    expect(res.status).toBe(404);
  });

  it('updates the meal item on success', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(updateMealItem).mockResolvedValue({ id: 'p1' } as never);

    const res = await PATCH(makeRequest({ name: 'New name', dayIndex: 2 }), makeParams());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.plan.id).toBe('p1');
    expect(updateMealItem).toHaveBeenCalledWith('u1', 'item1', { name: 'New name', dayIndex: 2 });
  });
});

describe('DELETE /api/v1/planner/meals/[itemId]', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const res = await DELETE(makeRequest(undefined, 'DELETE'), makeParams());

    expect(res.status).toBe(401);
    expect(deleteMealItem).not.toHaveBeenCalled();
  });

  it('deletes the meal item on success', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(deleteMealItem).mockResolvedValue({ id: 'p1' } as never);

    const res = await DELETE(makeRequest(undefined, 'DELETE'), makeParams());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.plan.id).toBe('p1');
    expect(deleteMealItem).toHaveBeenCalledWith('u1', 'item1');
  });
});
