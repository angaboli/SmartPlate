import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock('@/services/user.service', () => ({
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
}));

import { GET, PATCH } from '../route';
import { getCurrentUser } from '@/lib/auth';
import { getProfile, updateProfile } from '@/services/user.service';

function makeGetRequest() {
  return new NextRequest('http://localhost/api/v1/me');
}

function makePatchRequest(body: unknown) {
  return new NextRequest('http://localhost/api/v1/me', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/v1/me', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const res = await GET(makeGetRequest());

    expect(res.status).toBe(401);
    expect(getProfile).not.toHaveBeenCalled();
  });

  it('returns the profile for the authenticated user', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(getProfile).mockResolvedValue({ id: 'u1', email: 'a@test.com' } as never);

    const res = await GET(makeGetRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.id).toBe('u1');
    expect(getProfile).toHaveBeenCalledWith('u1');
  });
});

describe('PATCH /api/v1/me', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const res = await PATCH(makePatchRequest({ name: 'New Name' }));

    expect(res.status).toBe(401);
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid avatarUrl', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });

    const res = await PATCH(makePatchRequest({ avatarUrl: 'not-a-url' }));

    expect(res.status).toBe(400);
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('updates the profile on success', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(updateProfile).mockResolvedValue({ id: 'u1', name: 'New Name' } as never);

    const res = await PATCH(makePatchRequest({ name: 'New Name' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.name).toBe('New Name');
    expect(updateProfile).toHaveBeenCalledWith('u1', { name: 'New Name' });
  });

  it('allows clearing the avatar with null', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: 'user' });
    vi.mocked(updateProfile).mockResolvedValue({ id: 'u1', avatarUrl: null } as never);

    await PATCH(makePatchRequest({ avatarUrl: null }));

    expect(updateProfile).toHaveBeenCalledWith('u1', { avatarUrl: null });
  });
});
