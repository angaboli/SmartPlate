import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
}));
vi.mock('@/services/cook-later.service', () => ({
  listSavedRecipes: vi.fn(),
  saveRecipe: vi.fn(),
}));

import { GET, POST } from '../route';
import { requireAuth } from '@/lib/auth';
import { listSavedRecipes, saveRecipe } from '@/services/cook-later.service';
import { NotFoundError } from '@/lib/errors';

function makeGetRequest() {
  return new NextRequest('http://localhost/api/v1/cook-later');
}

function makePostRequest(body: unknown) {
  return new NextRequest('http://localhost/api/v1/cook-later', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/v1/cook-later', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error('Unauthorized'));

    const res = await GET(makeGetRequest());

    expect(res.status).toBe(401);
    expect(listSavedRecipes).not.toHaveBeenCalled();
  });

  it('lists the saved recipes for the authenticated user', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(listSavedRecipes).mockResolvedValue([{ id: 's1' }] as never);

    const res = await GET(makeGetRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(listSavedRecipes).toHaveBeenCalledWith('u1');
  });
});

describe('POST /api/v1/cook-later', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error('Unauthorized'));

    const res = await POST(makePostRequest({ recipeId: 'r1' }));

    expect(res.status).toBe(401);
    expect(saveRecipe).not.toHaveBeenCalled();
  });

  it('returns 400 when recipeId is missing', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });

    const res = await POST(makePostRequest({}));

    expect(res.status).toBe(400);
    expect(saveRecipe).not.toHaveBeenCalled();
  });

  it('returns 404 when the recipe is not published', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(saveRecipe).mockRejectedValue(new NotFoundError('Recipe not found'));

    const res = await POST(makePostRequest({ recipeId: 'r1' }));

    expect(res.status).toBe(404);
  });

  it('saves the recipe with tags on success', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(saveRecipe).mockResolvedValue({ id: 's1', recipeId: 'r1', tags: ['lunch'] } as never);

    const res = await POST(makePostRequest({ recipeId: 'r1', tags: ['lunch'] }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.tags).toEqual(['lunch']);
    expect(saveRecipe).toHaveBeenCalledWith('u1', 'r1', ['lunch']);
  });
});
