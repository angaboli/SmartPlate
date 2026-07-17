import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
}));
vi.mock('@/services/meal-log.service', () => ({
  checkAnalysisRateLimit: vi.fn(),
  createMealLog: vi.fn(),
  listMealLogs: vi.fn(),
}));

import { POST, GET } from '../route';
import { requireAuth } from '@/lib/auth';
import {
  checkAnalysisRateLimit,
  createMealLog,
  listMealLogs,
} from '@/services/meal-log.service';
import { AppError } from '@/lib/errors';

function makePostRequest(body: unknown) {
  return new NextRequest('http://localhost/api/v1/meal-logs', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function makeGetRequest(query = '') {
  return new NextRequest(`http://localhost/api/v1/meal-logs${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/v1/meal-logs', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error('Unauthorized'));

    const res = await POST(makePostRequest({ mealText: 'Pasta', mealType: 'lunch' }));

    expect(res.status).toBe(401);
    expect(createMealLog).not.toHaveBeenCalled();
  });

  it('returns 400 for an empty mealText', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });

    const res = await POST(makePostRequest({ mealText: '', mealType: 'lunch' }));

    expect(res.status).toBe(400);
    expect(createMealLog).not.toHaveBeenCalled();
  });

  it('returns 429 when the daily analysis limit is reached', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(checkAnalysisRateLimit).mockRejectedValue(
      new AppError('Daily analysis limit reached.', 429),
    );

    const res = await POST(makePostRequest({ mealText: 'Pasta', mealType: 'lunch' }));

    expect(res.status).toBe(429);
    expect(createMealLog).not.toHaveBeenCalled();
  });

  it('creates the meal log on success', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(checkAnalysisRateLimit).mockResolvedValue(undefined);
    vi.mocked(createMealLog).mockResolvedValue({ id: 'ml1', mealText: 'Pasta' } as never);

    const res = await POST(makePostRequest({ mealText: 'Pasta', mealType: 'lunch' }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.id).toBe('ml1');
    expect(createMealLog).toHaveBeenCalledWith('u1', { mealText: 'Pasta', mealType: 'lunch' });
  });
});

describe('GET /api/v1/meal-logs', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error('Unauthorized'));

    const res = await GET(makeGetRequest());

    expect(res.status).toBe(401);
    expect(listMealLogs).not.toHaveBeenCalled();
  });

  it('lists meal logs without a date filter', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(listMealLogs).mockResolvedValue([{ id: 'ml1' }] as never);

    const res = await GET(makeGetRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(listMealLogs).toHaveBeenCalledWith('u1', { date: undefined });
  });

  it('passes the date filter through', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(listMealLogs).mockResolvedValue([]);

    await GET(makeGetRequest('?date=2026-07-17'));

    expect(listMealLogs).toHaveBeenCalledWith('u1', { date: '2026-07-17' });
  });
});
