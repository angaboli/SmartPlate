import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => import('../../lib/__mocks__/db'));
vi.mock('bcryptjs', () => ({
  hash: vi.fn().mockResolvedValue('hashed_password'),
  compare: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({
  signAccessToken: vi.fn().mockResolvedValue('access_token'),
  signRefreshToken: vi.fn().mockResolvedValue('refresh_token'),
  verifyRefreshToken: vi.fn(),
}));

import { db } from '../../lib/__mocks__/db';
import { register, login, logout } from '../auth.service';
import { compare } from 'bcryptjs';
import { verifyRefreshToken } from '@/lib/auth';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('register', () => {
  it('creates user and returns tokens', async () => {
    db.user.findUnique.mockResolvedValue(null);
    db.user.create.mockResolvedValue({
      id: 'u1',
      email: 'test@test.com',
      name: 'Test',
      role: 'user',
    });
    db.refreshToken.create.mockResolvedValue({});

    const result = await register({
      email: 'test@test.com',
      password: 'password123',
      name: 'Test',
    });

    expect(result.user.email).toBe('test@test.com');
    expect(result.tokens.accessToken).toBe('access_token');
    expect(result.tokens.refreshToken).toBe('refresh_token');
  });

  it('throws ConflictError when email already exists', async () => {
    db.user.findUnique.mockResolvedValue({ id: 'existing' });

    await expect(
      register({ email: 'test@test.com', password: 'password123', name: 'Test' }),
    ).rejects.toThrow('Email already registered');
  });
});

describe('login', () => {
  it('returns tokens on valid credentials', async () => {
    db.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'test@test.com',
      passwordHash: 'hashed',
      name: 'Test',
      role: 'user',
    });
    vi.mocked(compare).mockResolvedValue(true as never);
    db.refreshToken.create.mockResolvedValue({});

    const result = await login({ email: 'test@test.com', password: 'password123' });
    expect(result.tokens.accessToken).toBe('access_token');
  });

  it('throws AuthError on invalid email', async () => {
    db.user.findUnique.mockResolvedValue(null);
    await expect(login({ email: 'bad@test.com', password: 'pw' })).rejects.toThrow(
      'Invalid email or password',
    );
  });

  it('throws AuthError on invalid password', async () => {
    db.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'test@test.com',
      passwordHash: 'hashed',
    });
    vi.mocked(compare).mockResolvedValue(false as never);

    await expect(login({ email: 'test@test.com', password: 'wrong' })).rejects.toThrow(
      'Invalid email or password',
    );
  });
});

describe('logout', () => {
  it('deletes refresh tokens', async () => {
    db.refreshToken.deleteMany.mockResolvedValue({ count: 1 });
    await logout('some_token');
    expect(db.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { token: 'some_token' },
    });
  });
});
