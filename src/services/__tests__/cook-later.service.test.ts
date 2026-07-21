import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => import('../../lib/__mocks__/db'));
vi.mock('../subscription.service', () => ({
  checkFavoritesQuota: vi.fn(),
}));

import { db } from '../../lib/__mocks__/db';
import { listSavedRecipes, saveRecipe, unsaveRecipe, updateSavedRecipe } from '../cook-later.service';
import { checkFavoritesQuota } from '../subscription.service';
import { SubscriptionRequiredError } from '@/lib/errors';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(checkFavoritesQuota).mockResolvedValue(undefined);
});

describe('listSavedRecipes', () => {
  it('returns saved recipes for user', async () => {
    db.savedRecipe.findMany.mockResolvedValue([{ id: 's1' }]);
    const result = await listSavedRecipes('u1');
    expect(result).toHaveLength(1);
    expect(db.savedRecipe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1' } }),
    );
  });
});

describe('saveRecipe', () => {
  it('saves a published recipe', async () => {
    db.recipe.findUnique.mockResolvedValue({ status: 'published' });
    db.savedRecipe.create.mockResolvedValue({ id: 's1', recipeId: 'r1' });

    const result = await saveRecipe('u1', 'r1', ['favorites']);
    expect(result.id).toBe('s1');
  });

  it('throws NotFoundError for non-published recipe', async () => {
    db.recipe.findUnique.mockResolvedValue({ status: 'draft' });
    await expect(saveRecipe('u1', 'r1')).rejects.toThrow('not found');
  });

  it('throws NotFoundError when recipe does not exist', async () => {
    db.recipe.findUnique.mockResolvedValue(null);
    await expect(saveRecipe('u1', 'r1')).rejects.toThrow('not found');
  });

  it('throws SubscriptionRequiredError when the free favorites quota is reached', async () => {
    db.recipe.findUnique.mockResolvedValue({ status: 'published' });
    vi.mocked(checkFavoritesQuota).mockRejectedValue(
      new SubscriptionRequiredError('Free plan is limited to 3 saved recipes.'),
    );

    await expect(saveRecipe('u1', 'r1')).rejects.toThrow(SubscriptionRequiredError);
    expect(db.savedRecipe.create).not.toHaveBeenCalled();
  });
});

describe('unsaveRecipe', () => {
  it('deletes saved recipe by composite key', async () => {
    db.savedRecipe.delete.mockResolvedValue({});
    await unsaveRecipe('u1', 'r1');
    expect(db.savedRecipe.delete).toHaveBeenCalledWith({
      where: { userId_recipeId: { userId: 'u1', recipeId: 'r1' } },
    });
  });
});

describe('updateSavedRecipe', () => {
  it('updates tags and isCooked', async () => {
    db.savedRecipe.update.mockResolvedValue({ id: 's1', tags: ['weeknight'], isCooked: true });

    const result = await updateSavedRecipe('u1', 's1', { tags: ['weeknight'], isCooked: true });
    expect(result.tags).toEqual(['weeknight']);
    expect(db.savedRecipe.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 's1', userId: 'u1' },
        data: { tags: ['weeknight'], isCooked: true },
      }),
    );
  });
});
