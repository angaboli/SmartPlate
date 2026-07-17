import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock('@/services/recipes.service', () => ({
  getRecipeById: vi.fn(),
  updateRecipe: vi.fn(),
  deleteRecipe: vi.fn(),
}));

import { GET, PUT, DELETE } from '../route';
import { getCurrentUser } from '@/lib/auth';
import { getRecipeById, updateRecipe, deleteRecipe } from '@/services/recipes.service';
import { ForbiddenError, NotFoundError } from '@/lib/errors';

function makeRequest(body?: unknown, method = 'GET') {
  return new NextRequest('http://localhost/api/v1/recipes/r1', {
    method,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makeParams(id = 'r1') {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/v1/recipes/[id]', () => {
  it('returns the recipe when found', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    vi.mocked(getRecipeById).mockResolvedValue({ id: 'r1', title: 'Test' } as never);

    const res = await GET(makeRequest(), makeParams());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.id).toBe('r1');
  });

  it('returns 404 when the recipe does not exist', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    vi.mocked(getRecipeById).mockResolvedValue(null);

    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(404);
  });
});

describe('PUT /api/v1/recipes/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const res = await PUT(makeRequest({ title: 'New' }, 'PUT'), makeParams());

    expect(res.status).toBe(401);
    expect(updateRecipe).not.toHaveBeenCalled();
  });

  it('returns 403 when the service rejects the edit permission', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(updateRecipe).mockRejectedValue(new ForbiddenError('You do not have permission'));

    const res = await PUT(makeRequest({ title: 'New' }, 'PUT'), makeParams());

    expect(res.status).toBe(403);
  });

  it('updates the recipe on success', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'admin' });
    vi.mocked(updateRecipe).mockResolvedValue({ id: 'r1', title: 'New' } as never);

    const res = await PUT(makeRequest({ title: 'New' }, 'PUT'), makeParams());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.title).toBe('New');
    expect(updateRecipe).toHaveBeenCalledWith(
      'r1',
      expect.objectContaining({ title: 'New' }),
      expect.objectContaining({ sub: 'u1' }),
    );
  });

  it('returns 400 for an invalid body', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'admin' });

    const res = await PUT(makeRequest({ title: 'a'.repeat(201) }, 'PUT'), makeParams());

    expect(res.status).toBe(400);
    expect(updateRecipe).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/v1/recipes/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const res = await DELETE(makeRequest(undefined, 'DELETE'), makeParams());

    expect(res.status).toBe(401);
    expect(deleteRecipe).not.toHaveBeenCalled();
  });

  it('returns 404 when the recipe does not exist', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'admin' });
    vi.mocked(deleteRecipe).mockRejectedValue(new NotFoundError('Recipe not found'));

    const res = await DELETE(makeRequest(undefined, 'DELETE'), makeParams());

    expect(res.status).toBe(404);
  });

  it('deletes the recipe on success', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'admin' });
    vi.mocked(deleteRecipe).mockResolvedValue(undefined as never);

    const res = await DELETE(makeRequest(undefined, 'DELETE'), makeParams());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(deleteRecipe).toHaveBeenCalledWith('r1', expect.objectContaining({ sub: 'u1' }));
  });
});
