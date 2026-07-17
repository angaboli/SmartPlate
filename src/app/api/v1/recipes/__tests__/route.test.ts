import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock('@/services/recipes.service', () => ({
  listRecipes: vi.fn(),
  createRecipe: vi.fn(),
}));

import { GET, POST } from '../route';
import { getCurrentUser } from '@/lib/auth';
import { listRecipes, createRecipe } from '@/services/recipes.service';

function makeGetRequest(query = '') {
  return new NextRequest(`http://localhost/api/v1/recipes${query}`);
}

function makePostRequest(body: unknown) {
  return new NextRequest('http://localhost/api/v1/recipes', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/v1/recipes', () => {
  it('lists recipes with default pagination for an anonymous visitor', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    vi.mocked(listRecipes).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    } as never);

    const res = await GET(makeGetRequest());

    expect(res.status).toBe(200);
    expect(listRecipes).toHaveBeenCalledWith(
      expect.objectContaining({ search: undefined, category: undefined }),
      null,
      { page: 1, limit: 20 },
    );
  });

  it('parses search/category/goal/aiRecommended/status filters from the query string', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'admin' });
    vi.mocked(listRecipes).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    } as never);

    await GET(
      makeGetRequest(
        '?search=pasta&category=Dessert&goal=balanced&aiRecommended=true&status=draft',
      ),
    );

    expect(listRecipes).toHaveBeenCalledWith(
      {
        search: 'pasta',
        category: 'Dessert',
        goal: 'balanced',
        aiRecommended: true,
        status: 'draft',
      },
      expect.any(Object),
      { page: 1, limit: 20 },
    );
  });

  it('clamps limit to 100 and page to a minimum of 1', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    vi.mocked(listRecipes).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 100, total: 0, totalPages: 0 },
    } as never);

    await GET(makeGetRequest('?page=0&limit=500'));

    expect(listRecipes).toHaveBeenCalledWith(expect.any(Object), null, {
      page: 1,
      limit: 100,
    });
  });
});

describe('POST /api/v1/recipes', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const res = await POST(makePostRequest({ title: 'Test' }));

    expect(res.status).toBe(401);
    expect(createRecipe).not.toHaveBeenCalled();
  });

  it('returns 403 when a regular user tries to create a recipe', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });

    const res = await POST(makePostRequest({ title: 'Test' }));

    expect(res.status).toBe(403);
    expect(createRecipe).not.toHaveBeenCalled();
  });

  it('allows an editor to create a recipe', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'e1', email: 'e@test.com', role: 'editor' });
    vi.mocked(createRecipe).mockResolvedValue({ id: 'r1', title: 'Test' } as never);

    const res = await POST(makePostRequest({ title: 'Test' }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.id).toBe('r1');
    expect(createRecipe).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Test' }),
      'e1',
    );
  });

  it('falls back to titleFr when title is empty', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'e1', email: 'e@test.com', role: 'editor' });
    vi.mocked(createRecipe).mockResolvedValue({ id: 'r1' } as never);

    await POST(makePostRequest({ titleFr: 'Recette Test' }));

    expect(createRecipe).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Recette Test' }),
      'e1',
    );
  });

  it('returns 400 when neither title nor titleFr is provided', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'e1', email: 'e@test.com', role: 'editor' });

    const res = await POST(makePostRequest({}));

    expect(res.status).toBe(400);
    expect(createRecipe).not.toHaveBeenCalled();
  });
});
