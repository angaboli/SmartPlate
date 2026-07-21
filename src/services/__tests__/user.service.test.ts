import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => import('../../lib/__mocks__/db'));

import { db } from '../../lib/__mocks__/db';
import { changeUserRole, listUsers, getProfile, updateProfile } from '../user.service';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('changeUserRole', () => {
  it('promotes a user to editor', async () => {
    db.user.findUnique.mockResolvedValue({ id: 'target1', role: 'user' });
    db.user.update.mockResolvedValue({
      id: 'target1',
      email: 'target@test.com',
      name: 'Target',
      role: 'editor',
      createdAt: new Date(),
    });

    const result = await changeUserRole('target1', 'editor', 'admin1');

    expect(result.role).toBe('editor');
    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'target1' }, data: { role: 'editor' } }),
    );
  });

  it('rejects an admin trying to change their own role', async () => {
    await expect(changeUserRole('admin1', 'user', 'admin1')).rejects.toThrow(
      'Cannot change your own role',
    );
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects an invalid role value', async () => {
    await expect(
      changeUserRole('target1', 'superadmin' as never, 'admin1'),
    ).rejects.toThrow('Invalid role');
  });

  it('throws NotFoundError when the target user does not exist', async () => {
    db.user.findUnique.mockResolvedValue(null);

    await expect(changeUserRole('missing', 'editor', 'admin1')).rejects.toThrow(
      'User not found',
    );
  });
});

describe('listUsers', () => {
  it('returns users ordered by creation date', async () => {
    db.user.findMany.mockResolvedValue([{ id: 'u1', email: 'a@test.com', role: 'user' }]);

    const result = await listUsers();

    expect(result).toHaveLength(1);
    expect(db.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
    );
  });
});

describe('getProfile', () => {
  it('throws NotFoundError when the user does not exist', async () => {
    db.user.findUnique.mockResolvedValue(null);
    await expect(getProfile('missing')).rejects.toThrow('User not found');
  });

  it('applies defaults when settings are missing', async () => {
    db.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'u1@test.com',
      name: 'User One',
      role: 'user',
      settings: null,
    });

    const profile = await getProfile('u1');

    expect(profile.settings.goal).toBe('maintain');
    expect(profile.settings.calorieTarget).toBe(2000);
    expect(profile.settings.allergies).toEqual([]);
  });

  it('exposes avatarUrl from the user record', async () => {
    db.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'u1@test.com',
      name: 'User One',
      avatarUrl: 'https://pub-xxx.r2.dev/avatars/u1/pic.jpg',
      role: 'user',
      settings: null,
    });

    const profile = await getProfile('u1');

    expect(profile.avatarUrl).toBe('https://pub-xxx.r2.dev/avatars/u1/pic.jpg');
  });

  it('exposes subscription status and period end from the user record', async () => {
    const periodEnd = new Date('2026-08-01T00:00:00.000Z');
    db.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'u1@test.com',
      name: 'User One',
      role: 'user',
      subscriptionStatus: 'trialing',
      subscriptionCurrentPeriodEnd: periodEnd,
      settings: null,
    });

    const profile = await getProfile('u1');

    expect(profile.subscriptionStatus).toBe('trialing');
    expect(profile.subscriptionCurrentPeriodEnd).toBe(periodEnd);
  });
});

describe('updateProfile', () => {
  it('throws NotFoundError when the user does not exist', async () => {
    db.user.findUnique.mockResolvedValue(null);
    await expect(updateProfile('missing', { name: 'X' })).rejects.toThrow('User not found');
  });

  it('updates avatarUrl alongside name in a single db.user.update call', async () => {
    db.user.findUnique
      .mockResolvedValueOnce({ id: 'u1' })
      .mockResolvedValueOnce({ id: 'u1', email: 'u1@test.com', name: 'New Name', avatarUrl: 'https://pub-xxx.r2.dev/a.jpg', role: 'user', settings: null });
    db.user.update.mockResolvedValue({});

    await updateProfile('u1', { name: 'New Name', avatarUrl: 'https://pub-xxx.r2.dev/a.jpg' });

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { name: 'New Name', avatarUrl: 'https://pub-xxx.r2.dev/a.jpg' },
    });
  });

  it('allows clearing the avatar by passing null', async () => {
    db.user.findUnique
      .mockResolvedValueOnce({ id: 'u1' })
      .mockResolvedValueOnce({ id: 'u1', email: 'u1@test.com', name: 'X', avatarUrl: null, role: 'user', settings: null });
    db.user.update.mockResolvedValue({});

    await updateProfile('u1', { avatarUrl: null });

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { avatarUrl: null },
    });
  });
});
