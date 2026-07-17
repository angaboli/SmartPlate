import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
}));
vi.mock('@/services/cook-later.service', () => ({
  unsaveRecipe: vi.fn(),
  updateSavedRecipe: vi.fn(),
}));

import { PATCH, DELETE } from '../route';
import { requireAuth } from '@/lib/auth';
import { unsaveRecipe, updateSavedRecipe } from '@/services/cook-later.service';

function makeRequest(body?: unknown, method = 'PATCH') {
  return new NextRequest('http://localhost/api/v1/cook-later/s1', {
    method,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makeParams(id = 's1') {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PATCH /api/v1/cook-later/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error('Unauthorized'));

    const res = await PATCH(makeRequest({ isCooked: true }), makeParams());

    expect(res.status).toBe(401);
    expect(updateSavedRecipe).not.toHaveBeenCalled();
  });

  it('updates tags and isCooked on success', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(updateSavedRecipe).mockResolvedValue({
      id: 's1',
      tags: ['dinner'],
      isCooked: true,
    } as never);

    const res = await PATCH(makeRequest({ tags: ['dinner'], isCooked: true }), makeParams());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.tags).toEqual(['dinner']);
    expect(updateSavedRecipe).toHaveBeenCalledWith('u1', 's1', {
      tags: ['dinner'],
      isCooked: true,
    });
  });
});

describe('DELETE /api/v1/cook-later/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error('Unauthorized'));

    const res = await DELETE(makeRequest(undefined, 'DELETE'), makeParams());

    expect(res.status).toBe(401);
    expect(unsaveRecipe).not.toHaveBeenCalled();
  });

  it('unsaves the recipe on success', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(unsaveRecipe).mockResolvedValue(undefined as never);

    const res = await DELETE(makeRequest(undefined, 'DELETE'), makeParams());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(unsaveRecipe).toHaveBeenCalledWith('u1', 's1');
  });
});
