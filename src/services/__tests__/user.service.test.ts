import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => import('../../lib/__mocks__/db'));

import { db } from '../../lib/__mocks__/db';
import { changeUserRole, listUsers, getProfile } from '../user.service';

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
});
