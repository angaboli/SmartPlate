import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock('@/services/recipes.service', () => ({
  getRecipeById: vi.fn(),
}));
vi.mock('@/lib/storage', () => ({
  getUploadUrl: vi.fn(),
  getPublicUrl: vi.fn(),
}));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(),
  recordAttempt: vi.fn(),
}));

import { POST } from '../route';
import { getCurrentUser } from '@/lib/auth';
import { getRecipeById } from '@/services/recipes.service';
import { getUploadUrl, getPublicUrl } from '@/lib/storage';
import { checkRateLimit } from '@/lib/rate-limit';
import { AppError } from '@/lib/errors';

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/v1/uploads/presign', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getUploadUrl).mockResolvedValue('https://r2.example/upload-url');
  vi.mocked(getPublicUrl).mockReturnValue('https://pub-xxx.r2.dev/some/key.jpg');
});

describe('POST /api/v1/uploads/presign', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const res = await POST(makeRequest({ contentType: 'image/jpeg', purpose: 'avatar' }));

    expect(res.status).toBe(401);
  });

  it('returns 400 for a disallowed content type', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });

    const res = await POST(makeRequest({ contentType: 'image/gif', purpose: 'avatar' }));

    expect(res.status).toBe(400);
    expect(getUploadUrl).not.toHaveBeenCalled();
  });

  it('allows any authenticated user to presign an avatar upload', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });

    const res = await POST(makeRequest({ contentType: 'image/png', purpose: 'avatar' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.publicUrl).toBe('https://pub-xxx.r2.dev/some/key.jpg');
    expect(vi.mocked(getUploadUrl).mock.calls[0][0]).toMatch(/^avatars\/u1\//);
  });

  it('returns 403 when a regular user tries to presign a new recipe image (no recipeId)', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });

    const res = await POST(makeRequest({ contentType: 'image/jpeg', purpose: 'recipe-image' }));

    expect(res.status).toBe(403);
    expect(getUploadUrl).not.toHaveBeenCalled();
  });

  it('allows an editor to presign a new recipe image (no recipeId)', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'e1', email: 'e@test.com', role: 'editor' });

    const res = await POST(makeRequest({ contentType: 'image/jpeg', purpose: 'recipe-image' }));

    expect(res.status).toBe(200);
    expect(vi.mocked(getUploadUrl).mock.calls[0][0]).toMatch(/^recipes\/pending\/e1-/);
  });

  it('returns 404 when the target recipe does not exist', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(getRecipeById).mockResolvedValue(null);

    const res = await POST(
      makeRequest({ contentType: 'image/jpeg', purpose: 'recipe-image', recipeId: 'r1' }),
    );

    expect(res.status).toBe(404);
  });

  it('returns 403 when the user cannot edit the target recipe', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(getRecipeById).mockResolvedValue({ id: 'r1', authorId: 'someone-else' } as never);

    const res = await POST(
      makeRequest({ contentType: 'image/jpeg', purpose: 'recipe-image', recipeId: 'r1' }),
    );

    expect(res.status).toBe(403);
  });

  it('allows the recipe author to presign an image for their own recipe', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(getRecipeById).mockResolvedValue({ id: 'r1', authorId: 'u1' } as never);

    const res = await POST(
      makeRequest({ contentType: 'image/jpeg', purpose: 'recipe-image', recipeId: 'r1' }),
    );

    expect(res.status).toBe(200);
    expect(vi.mocked(getUploadUrl).mock.calls[0][0]).toMatch(/^recipes\/r1\//);
  });

  it('returns 429 when the upload rate limit is exceeded', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(checkRateLimit).mockRejectedValue(
      new AppError('Too many requests. Please try again later.', 429),
    );

    const res = await POST(makeRequest({ contentType: 'image/jpeg', purpose: 'avatar' }));

    expect(res.status).toBe(429);
    expect(getUploadUrl).not.toHaveBeenCalled();
  });
});
