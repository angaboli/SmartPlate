import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
}));
vi.mock('@/services/meal-log.service', () => ({
  getDailySummary: vi.fn(),
}));

import { GET } from '../route';
import { requireAuth } from '@/lib/auth';
import { getDailySummary } from '@/services/meal-log.service';

function makeRequest() {
  return new NextRequest('http://localhost/api/v1/meal-logs/summary');
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/v1/meal-logs/summary', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error('Unauthorized'));

    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
    expect(getDailySummary).not.toHaveBeenCalled();
  });

  it('returns the daily summary for the authenticated user', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(getDailySummary).mockResolvedValue({
      today: { totalCalories: 500, mealCount: 1, calorieTarget: 2000 },
      weekDaysLogged: 1,
      weeklyData: [],
    } as never);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.today.totalCalories).toBe(500);
    expect(getDailySummary).toHaveBeenCalledWith('u1');
  });
});
