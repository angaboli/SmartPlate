import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
}));
vi.mock('@/services/import.service', () => ({
  saveImport: vi.fn(),
  listImports: vi.fn(),
  checkRateLimit: vi.fn(),
}));
vi.mock('@/services/subscription.service', () => ({
  checkImportQuota: vi.fn(),
}));

import { POST, GET } from '../route';
import { requireAuth } from '@/lib/auth';
import { saveImport, listImports, checkRateLimit } from '@/services/import.service';
import { checkImportQuota } from '@/services/subscription.service';
import { AppError, SubscriptionRequiredError } from '@/lib/errors';

function makePostRequest(body: unknown) {
  return new NextRequest('http://localhost/api/v1/imports', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function makeGetRequest() {
  return new NextRequest('http://localhost/api/v1/imports');
}

const validBody = {
  url: 'https://example.com/recipe',
  title: 'Test Recipe',
  ingredients: ['flour'],
  steps: ['mix'],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(checkImportQuota).mockResolvedValue(undefined);
});

describe('POST /api/v1/imports', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error('Unauthorized'));

    const res = await POST(makePostRequest(validBody));

    expect(res.status).toBe(401);
    expect(saveImport).not.toHaveBeenCalled();
  });

  it('returns 400 for a missing title', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });

    const res = await POST(makePostRequest({ ...validBody, title: '' }));

    expect(res.status).toBe(400);
    expect(saveImport).not.toHaveBeenCalled();
  });

  it('returns 429 when the rate limit is exceeded', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(checkRateLimit).mockRejectedValue(new AppError('Rate limit exceeded.', 429));

    const res = await POST(makePostRequest(validBody));

    expect(res.status).toBe(429);
    expect(saveImport).not.toHaveBeenCalled();
  });

  it('returns 402 when the free import quota is reached', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(checkRateLimit).mockResolvedValue(undefined);
    vi.mocked(checkImportQuota).mockRejectedValue(
      new SubscriptionRequiredError('Free plan is limited to 5 imports.'),
    );

    const res = await POST(makePostRequest(validBody));

    expect(res.status).toBe(402);
    expect(saveImport).not.toHaveBeenCalled();
  });

  it('saves the import with tags on success', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(checkRateLimit).mockResolvedValue(undefined);
    vi.mocked(saveImport).mockResolvedValue({ recipe: { id: 'r1' } } as never);

    const res = await POST(makePostRequest({ ...validBody, tags: ['lunch'] }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.recipe.id).toBe('r1');
    expect(saveImport).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ title: 'Test Recipe', tags: ['lunch'] }),
    );
  });
});

describe('GET /api/v1/imports', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error('Unauthorized'));

    const res = await GET(makeGetRequest());

    expect(res.status).toBe(401);
    expect(listImports).not.toHaveBeenCalled();
  });

  it('lists imports for the authenticated user', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(listImports).mockResolvedValue([{ id: 'i1' }] as never);

    const res = await GET(makeGetRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(listImports).toHaveBeenCalledWith('u1');
  });
});
