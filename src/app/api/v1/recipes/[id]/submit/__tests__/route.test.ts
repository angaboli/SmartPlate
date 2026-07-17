import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock('@/services/recipes.service', () => ({
  submitForReview: vi.fn(),
}));

import { POST } from '../route';
import { getCurrentUser } from '@/lib/auth';
import { submitForReview } from '@/services/recipes.service';
import { ForbiddenError, ValidationError } from '@/lib/errors';

function makeRequest() {
  return new NextRequest('http://localhost/api/v1/recipes/r1/submit', { method: 'POST' });
}

function makeParams(id = 'r1') {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/v1/recipes/[id]/submit', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const res = await POST(makeRequest(), makeParams());

    expect(res.status).toBe(401);
    expect(submitForReview).not.toHaveBeenCalled();
  });

  it('returns 403 when the caller is not the author', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(submitForReview).mockRejectedValue(
      new ForbiddenError('Only the author can submit for review'),
    );

    const res = await POST(makeRequest(), makeParams());

    expect(res.status).toBe(403);
  });

  it('returns 400 when the recipe is not in a submittable status', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(submitForReview).mockRejectedValue(
      new ValidationError('Cannot submit recipe with status "published" for review'),
    );

    const res = await POST(makeRequest(), makeParams());

    expect(res.status).toBe(400);
  });

  it('submits the recipe for review on success', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(submitForReview).mockResolvedValue({ id: 'r1', status: 'pending_review' } as never);

    const res = await POST(makeRequest(), makeParams());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('pending_review');
    expect(submitForReview).toHaveBeenCalledWith('r1', expect.objectContaining({ sub: 'u1' }));
  });
});
