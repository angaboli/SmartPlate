import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
}));
vi.mock('@/services/import.service', () => ({
  extractFromUrl: vi.fn(),
  checkRateLimit: vi.fn(),
}));

import { POST } from '../route';
import { requireAuth } from '@/lib/auth';
import { extractFromUrl, checkRateLimit } from '@/services/import.service';
import { AppError } from '@/lib/errors';

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/v1/imports/extract', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/v1/imports/extract', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error('Unauthorized'));

    const res = await POST(makeRequest({ url: 'https://example.com/recipe' }));

    expect(res.status).toBe(401);
    expect(extractFromUrl).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid URL', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });

    const res = await POST(makeRequest({ url: 'not-a-url' }));

    expect(res.status).toBe(400);
    expect(extractFromUrl).not.toHaveBeenCalled();
  });

  it('returns 429 when the rate limit is exceeded', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(checkRateLimit).mockRejectedValue(new AppError('Rate limit exceeded.', 429));

    const res = await POST(makeRequest({ url: 'https://example.com/recipe' }));

    expect(res.status).toBe(429);
    expect(extractFromUrl).not.toHaveBeenCalled();
  });

  it('returns the extracted recipe on success', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(checkRateLimit).mockResolvedValue(undefined);
    vi.mocked(extractFromUrl).mockResolvedValue({ title: 'Test Recipe', isPartial: false } as never);

    const res = await POST(makeRequest({ url: 'https://example.com/recipe' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.title).toBe('Test Recipe');
    expect(extractFromUrl).toHaveBeenCalledWith('https://example.com/recipe');
  });
});
