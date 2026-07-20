import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock('@/services/recipes.service', () => ({
  setRecipeFeatured: vi.fn(),
}));

import { PATCH } from '../route';
import { getCurrentUser } from '@/lib/auth';
import { setRecipeFeatured } from '@/services/recipes.service';
import { ForbiddenError, ValidationError } from '@/lib/errors';

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/v1/recipes/r1/featured', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

function makeParams(id = 'r1') {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PATCH /api/v1/recipes/[id]/featured', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const res = await PATCH(makeRequest({ featured: true }), makeParams());

    expect(res.status).toBe(401);
    expect(setRecipeFeatured).not.toHaveBeenCalled();
  });

  it('returns 400 for a non-boolean featured value', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'admin' });

    const res = await PATCH(makeRequest({ featured: 'yes' }), makeParams());

    expect(res.status).toBe(400);
    expect(setRecipeFeatured).not.toHaveBeenCalled();
  });

  it('returns 403 when the service rejects the permission', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(setRecipeFeatured).mockRejectedValue(new ForbiddenError());

    const res = await PATCH(makeRequest({ featured: true }), makeParams());

    expect(res.status).toBe(403);
  });

  it('returns 400 when the featured cap is reached', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'admin' });
    vi.mocked(setRecipeFeatured).mockRejectedValue(new ValidationError('Cannot feature more than 8 recipes at once'));

    const res = await PATCH(makeRequest({ featured: true }), makeParams());

    expect(res.status).toBe(400);
  });

  it('sets featured on success', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'admin' });
    vi.mocked(setRecipeFeatured).mockResolvedValue({ id: 'r1', featured: true } as never);

    const res = await PATCH(makeRequest({ featured: true }), makeParams());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.featured).toBe(true);
    expect(setRecipeFeatured).toHaveBeenCalledWith(
      'r1',
      true,
      expect.objectContaining({ sub: 'u1' }),
    );
  });
});
