import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock('@/services/recipes.service', () => ({
  changeRecipeStatus: vi.fn(),
}));

import { PATCH } from '../route';
import { getCurrentUser } from '@/lib/auth';
import { changeRecipeStatus } from '@/services/recipes.service';
import { ForbiddenError } from '@/lib/errors';

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/v1/recipes/r1/status', {
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

describe('PATCH /api/v1/recipes/[id]/status', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const res = await PATCH(makeRequest({ status: 'draft' }), makeParams());

    expect(res.status).toBe(401);
    expect(changeRecipeStatus).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid status value', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'admin' });

    const res = await PATCH(makeRequest({ status: 'archived' }), makeParams());

    expect(res.status).toBe(400);
    expect(changeRecipeStatus).not.toHaveBeenCalled();
  });

  it('returns 403 when the service rejects the permission', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(changeRecipeStatus).mockRejectedValue(new ForbiddenError());

    const res = await PATCH(makeRequest({ status: 'draft' }), makeParams());

    expect(res.status).toBe(403);
  });

  it('changes the status on success', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'admin' });
    vi.mocked(changeRecipeStatus).mockResolvedValue({ id: 'r1', status: 'draft' } as never);

    const res = await PATCH(makeRequest({ status: 'draft' }), makeParams());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('draft');
    expect(changeRecipeStatus).toHaveBeenCalledWith(
      'r1',
      'draft',
      expect.objectContaining({ sub: 'u1' }),
    );
  });
});
