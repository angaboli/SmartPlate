import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
}));
vi.mock('@/services/meal-log.service', () => ({
  checkAnalysisRateLimit: vi.fn(),
  createMealLogFromPhoto: vi.fn(),
}));

import { POST } from '../route';
import { requireAuth } from '@/lib/auth';
import { checkAnalysisRateLimit, createMealLogFromPhoto } from '@/services/meal-log.service';
import { AppError, ValidationError } from '@/lib/errors';

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/v1/meal-logs/scan', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

const validBody = { imageDataUrl: 'data:image/jpeg;base64,abc123', mealType: 'lunch' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/v1/meal-logs/scan', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error('Unauthorized'));

    const res = await POST(makeRequest(validBody));

    expect(res.status).toBe(401);
    expect(createMealLogFromPhoto).not.toHaveBeenCalled();
  });

  it('returns 400 for a missing imageDataUrl', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });

    const res = await POST(makeRequest({ mealType: 'lunch' }));

    expect(res.status).toBe(400);
    expect(createMealLogFromPhoto).not.toHaveBeenCalled();
  });

  it('returns 400 when the service rejects a malformed/oversized image', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(checkAnalysisRateLimit).mockResolvedValue(undefined);
    vi.mocked(createMealLogFromPhoto).mockRejectedValue(
      new ValidationError('Only JPEG, PNG, and WebP images are allowed'),
    );

    const res = await POST(makeRequest(validBody));

    expect(res.status).toBe(400);
  });

  it('returns 429 when the daily analysis limit is reached', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(checkAnalysisRateLimit).mockRejectedValue(
      new AppError('Daily analysis limit reached.', 429),
    );

    const res = await POST(makeRequest(validBody));

    expect(res.status).toBe(429);
    expect(createMealLogFromPhoto).not.toHaveBeenCalled();
  });

  it('creates the meal log from the photo on success', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(checkAnalysisRateLimit).mockResolvedValue(undefined);
    vi.mocked(createMealLogFromPhoto).mockResolvedValue({
      id: 'ml1',
      mealText: 'Grilled chicken',
    } as never);

    const res = await POST(makeRequest(validBody));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.id).toBe('ml1');
    expect(createMealLogFromPhoto).toHaveBeenCalledWith('u1', {
      imageDataUrl: validBody.imageDataUrl,
      mealType: 'lunch',
    });
  });
});
