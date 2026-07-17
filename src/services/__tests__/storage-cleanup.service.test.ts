import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => import('../../lib/__mocks__/db'));
vi.mock('@/lib/storage', () => ({
  listObjects: vi.fn(),
  deleteObject: vi.fn(),
  extractKeyFromPublicUrl: vi.fn((url: string) =>
    url.startsWith('https://pub-xxx.r2.dev/') ? url.replace('https://pub-xxx.r2.dev/', '') : null,
  ),
}));

import { db } from '../../lib/__mocks__/db';
import { cleanupOrphanedUploads } from '../storage-cleanup.service';
import { listObjects, deleteObject } from '@/lib/storage';

const DAY_MS = 24 * 60 * 60 * 1000;
const old = (ms: number) => new Date(Date.now() - ms);

beforeEach(() => {
  vi.clearAllMocks();
  db.recipe.findMany.mockResolvedValue([]);
  db.user.findMany.mockResolvedValue([]);
});

describe('cleanupOrphanedUploads', () => {
  it('deletes an old, unreferenced recipe image', async () => {
    vi.mocked(listObjects).mockImplementation(async (prefix: string) =>
      prefix === 'recipes/'
        ? [{ key: 'recipes/pending/u1-abc.jpg', lastModified: old(DAY_MS * 2) }]
        : [],
    );

    const result = await cleanupOrphanedUploads();

    expect(deleteObject).toHaveBeenCalledWith('recipes/pending/u1-abc.jpg');
    expect(result).toEqual({ scanned: 1, deleted: 1 });
  });

  it('does not delete an object still referenced by a recipe', async () => {
    db.recipe.findMany.mockResolvedValue([
      { imageUrl: 'https://pub-xxx.r2.dev/recipes/r1/keep.jpg' },
    ]);
    vi.mocked(listObjects).mockImplementation(async (prefix: string) =>
      prefix === 'recipes/'
        ? [{ key: 'recipes/r1/keep.jpg', lastModified: old(DAY_MS * 2) }]
        : [],
    );

    const result = await cleanupOrphanedUploads();

    expect(deleteObject).not.toHaveBeenCalled();
    expect(result).toEqual({ scanned: 1, deleted: 0 });
  });

  it('does not delete an object still referenced by a user avatar', async () => {
    db.user.findMany.mockResolvedValue([
      { avatarUrl: 'https://pub-xxx.r2.dev/avatars/u1/keep.jpg' },
    ]);
    vi.mocked(listObjects).mockImplementation(async (prefix: string) =>
      prefix === 'avatars/'
        ? [{ key: 'avatars/u1/keep.jpg', lastModified: old(DAY_MS * 2) }]
        : [],
    );

    const result = await cleanupOrphanedUploads();

    expect(deleteObject).not.toHaveBeenCalled();
    expect(result.deleted).toBe(0);
  });

  it('skips an unreferenced object younger than the 24h grace period', async () => {
    vi.mocked(listObjects).mockImplementation(async (prefix: string) =>
      prefix === 'recipes/'
        ? [{ key: 'recipes/imports/fresh.jpg', lastModified: old(60 * 60 * 1000) }]
        : [],
    );

    const result = await cleanupOrphanedUploads();

    expect(deleteObject).not.toHaveBeenCalled();
    expect(result).toEqual({ scanned: 1, deleted: 0 });
  });

  it('deletes an old avatar left behind after being replaced', async () => {
    db.user.findMany.mockResolvedValue([
      { avatarUrl: 'https://pub-xxx.r2.dev/avatars/u1/new.jpg' },
    ]);
    vi.mocked(listObjects).mockImplementation(async (prefix: string) =>
      prefix === 'avatars/'
        ? [{ key: 'avatars/u1/old.jpg', lastModified: old(DAY_MS * 3) }]
        : [],
    );

    const result = await cleanupOrphanedUploads();

    expect(deleteObject).toHaveBeenCalledWith('avatars/u1/old.jpg');
    expect(result.deleted).toBe(1);
  });

  it('ignores recipes whose imageUrl is not an R2 object (external/manual URL)', async () => {
    db.recipe.findMany.mockResolvedValue([
      { imageUrl: 'https://images.unsplash.com/some-photo.jpg' },
    ]);
    vi.mocked(listObjects).mockImplementation(async (prefix: string) =>
      prefix === 'recipes/'
        ? [{ key: 'recipes/pending/orphan.jpg', lastModified: old(DAY_MS * 2) }]
        : [],
    );

    const result = await cleanupOrphanedUploads();

    expect(deleteObject).toHaveBeenCalledWith('recipes/pending/orphan.jpg');
    expect(result.deleted).toBe(1);
  });
});
