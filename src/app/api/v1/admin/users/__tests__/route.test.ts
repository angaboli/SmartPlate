import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock('@/services/user.service', () => ({
  listUsers: vi.fn(),
}));

import { GET } from '../route';
import { getCurrentUser } from '@/lib/auth';
import { listUsers } from '@/services/user.service';

function makeRequest() {
  return new NextRequest('http://localhost/api/v1/admin/users');
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/v1/admin/users', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
    expect(listUsers).not.toHaveBeenCalled();
  });

  it('returns 403 when the caller is not an admin', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'e1', email: 'e@test.com', role: 'editor' });

    const res = await GET(makeRequest());

    expect(res.status).toBe(403);
    expect(listUsers).not.toHaveBeenCalled();
  });

  it('lists all users for an admin', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'a1', email: 'a@test.com', role: 'admin' });
    vi.mocked(listUsers).mockResolvedValue([{ id: 'u1' }, { id: 'u2' }] as never);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveLength(2);
    expect(listUsers).toHaveBeenCalled();
  });
});
