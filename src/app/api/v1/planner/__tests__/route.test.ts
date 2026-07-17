import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock('@/services/planner.service', () => ({
  getPlan: vi.fn(),
}));

import { GET } from '../route';
import { getCurrentUser } from '@/lib/auth';
import { getPlan } from '@/services/planner.service';

function makeRequest(query = '') {
  return new NextRequest(`http://localhost/api/v1/planner${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/v1/planner', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
    expect(getPlan).not.toHaveBeenCalled();
  });

  it('defaults week offset to 0', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(getPlan).mockResolvedValue({ id: 'p1' } as never);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.plan.id).toBe('p1');
    expect(getPlan).toHaveBeenCalledWith('u1', 0);
  });

  it('clamps the week offset to [-52, 52]', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(getPlan).mockResolvedValue(null);

    await GET(makeRequest('?week=999'));

    expect(getPlan).toHaveBeenCalledWith('u1', 52);
  });

  it('parses a valid week offset from the query string', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(getPlan).mockResolvedValue(null);

    await GET(makeRequest('?week=-3'));

    expect(getPlan).toHaveBeenCalledWith('u1', -3);
  });
});
