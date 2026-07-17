import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock('@/services/recipes.service', () => ({
  reviewRecipe: vi.fn(),
}));

import { POST } from '../route';
import { getCurrentUser } from '@/lib/auth';
import { reviewRecipe } from '@/services/recipes.service';
import { ForbiddenError } from '@/lib/errors';

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/v1/recipes/r1/review', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function makeParams(id = 'r1') {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/v1/recipes/[id]/review', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const res = await POST(makeRequest({ status: 'published' }), makeParams());

    expect(res.status).toBe(401);
    expect(reviewRecipe).not.toHaveBeenCalled();
  });

  it('returns 403 when the caller cannot review recipes', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(reviewRecipe).mockRejectedValue(
      new ForbiddenError('Only editors and admins can review recipes'),
    );

    const res = await POST(makeRequest({ status: 'published' }), makeParams());

    expect(res.status).toBe(403);
  });

  it('returns 400 for an invalid decision', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'e1', email: 'e@test.com', role: 'editor' });

    const res = await POST(makeRequest({ status: 'draft' }), makeParams());

    expect(res.status).toBe(400);
    expect(reviewRecipe).not.toHaveBeenCalled();
  });

  it('publishes the recipe on success', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'e1', email: 'e@test.com', role: 'editor' });
    vi.mocked(reviewRecipe).mockResolvedValue({ id: 'r1', status: 'published' } as never);

    const res = await POST(makeRequest({ status: 'published' }), makeParams());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('published');
    expect(reviewRecipe).toHaveBeenCalledWith(
      'r1',
      'published',
      undefined,
      expect.objectContaining({ sub: 'e1' }),
    );
  });

  it('rejects the recipe with a review note', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'e1', email: 'e@test.com', role: 'editor' });
    vi.mocked(reviewRecipe).mockResolvedValue({ id: 'r1', status: 'rejected' } as never);

    await POST(makeRequest({ status: 'rejected', reviewNote: 'Needs more detail' }), makeParams());

    expect(reviewRecipe).toHaveBeenCalledWith(
      'r1',
      'rejected',
      'Needs more detail',
      expect.objectContaining({ sub: 'e1' }),
    );
  });
});
