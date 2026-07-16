import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock('@/services/user.service', () => ({
  changeUserRole: vi.fn(),
}));

import { PATCH } from '../route';
import { getCurrentUser } from '@/lib/auth';
import { changeUserRole } from '@/services/user.service';

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/v1/admin/users/target1/role', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PATCH /api/v1/admin/users/[id]/role', () => {
  it('returns 401 when there is no authenticated user', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const res = await PATCH(makeRequest({ role: 'editor' }), makeParams('target1'));

    expect(res.status).toBe(401);
    expect(changeUserRole).not.toHaveBeenCalled();
  });

  it('returns 403 when the caller is not an admin', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      sub: 'editor1',
      email: 'e@test.com',
      role: 'editor',
    });

    const res = await PATCH(makeRequest({ role: 'editor' }), makeParams('target1'));

    expect(res.status).toBe(403);
    expect(changeUserRole).not.toHaveBeenCalled();
  });

  it('allows an admin to change another user\'s role', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      sub: 'admin1',
      email: 'admin@test.com',
      role: 'admin',
    });
    vi.mocked(changeUserRole).mockResolvedValue({
      id: 'target1',
      email: 't@test.com',
      name: null,
      role: 'editor',
      createdAt: new Date(),
    } as never);

    const res = await PATCH(makeRequest({ role: 'editor' }), makeParams('target1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.role).toBe('editor');
    expect(changeUserRole).toHaveBeenCalledWith('target1', 'editor', 'admin1');
  });

  it('returns 400 for an invalid role value in the body', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      sub: 'admin1',
      email: 'admin@test.com',
      role: 'admin',
    });

    const res = await PATCH(makeRequest({ role: 'superadmin' }), makeParams('target1'));

    expect(res.status).toBe(400);
    expect(changeUserRole).not.toHaveBeenCalled();
  });
});
