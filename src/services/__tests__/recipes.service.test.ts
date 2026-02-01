import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => import('../../lib/__mocks__/db'));

import { db } from '../../lib/__mocks__/db';
import {
  listRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  submitForReview,
  reviewRecipe,
  deleteRecipe,
} from '../recipes.service';
import type { JwtPayload } from '@/lib/auth';

beforeEach(() => {
  vi.clearAllMocks();
});

const adminUser: JwtPayload = { sub: 'u1', email: 'admin@test.com', role: 'admin' };
const editorUser: JwtPayload = { sub: 'u2', email: 'editor@test.com', role: 'editor' };
const regularUser: JwtPayload = { sub: 'u3', email: 'user@test.com', role: 'user' };

describe('listRecipes', () => {
  it('filters to published only for regular users', async () => {
    db.recipe.findMany.mockResolvedValue([]);
    await listRecipes({}, regularUser);

    expect(db.recipe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'published' }),
      }),
    );
  });

  it('does not filter status for admins', async () => {
    db.recipe.findMany.mockResolvedValue([]);
    await listRecipes({}, adminUser);

    const callArgs = db.recipe.findMany.mock.calls[0][0];
    expect(callArgs.where.status).toBeUndefined();
  });

  it('applies search filter', async () => {
    db.recipe.findMany.mockResolvedValue([]);
    await listRecipes({ search: 'chicken' }, adminUser);

    const callArgs = db.recipe.findMany.mock.calls[0][0];
    expect(callArgs.where.OR).toBeDefined();
  });
});

describe('getRecipeById', () => {
  it('returns published recipe for anonymous user', async () => {
    const recipe = { id: 'r1', status: 'published', authorId: 'u1' };
    db.recipe.findUnique.mockResolvedValue(recipe);

    const result = await getRecipeById('r1', null);
    expect(result).toEqual(recipe);
  });

  it('returns null for draft recipe with anonymous user', async () => {
    db.recipe.findUnique.mockResolvedValue({ id: 'r1', status: 'draft', authorId: 'u1' });
    const result = await getRecipeById('r1', null);
    expect(result).toBeNull();
  });

  it('returns draft recipe to its author', async () => {
    const recipe = { id: 'r1', status: 'draft', authorId: 'u3' };
    db.recipe.findUnique.mockResolvedValue(recipe);
    const result = await getRecipeById('r1', regularUser);
    expect(result).toEqual(recipe);
  });

  it('returns null when recipe not found', async () => {
    db.recipe.findUnique.mockResolvedValue(null);
    const result = await getRecipeById('nonexistent', adminUser);
    expect(result).toBeNull();
  });
});

describe('createRecipe', () => {
  it('creates recipe with draft status', async () => {
    const input = { title: 'Test', ingredients: ['flour'] };
    db.recipe.create.mockResolvedValue({ id: 'r1', ...input, status: 'draft' });

    await createRecipe(input, 'u1');

    expect(db.recipe.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'draft', authorId: 'u1' }),
      }),
    );
  });
});

describe('updateRecipe', () => {
  it('throws ForbiddenError when user cannot edit', async () => {
    db.recipe.findUnique.mockResolvedValue({ id: 'r1', authorId: 'other', status: 'draft' });

    await expect(updateRecipe('r1', { title: 'New' }, regularUser)).rejects.toThrow('permission');
  });

  it('resets rejected recipe to draft on edit', async () => {
    db.recipe.findUnique.mockResolvedValue({ id: 'r1', authorId: 'u1', status: 'rejected' });
    db.recipe.update.mockResolvedValue({ id: 'r1', status: 'draft' });

    await updateRecipe('r1', { title: 'Fixed' }, adminUser);

    expect(db.recipe.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'draft' }),
      }),
    );
  });
});

describe('submitForReview', () => {
  it('submits draft recipe for review', async () => {
    db.recipe.findUnique.mockResolvedValue({ id: 'r1', authorId: 'u3', status: 'draft' });
    db.recipe.update.mockResolvedValue({ id: 'r1', status: 'pending_review' });

    await submitForReview('r1', regularUser);

    expect(db.recipe.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'pending_review' }),
      }),
    );
  });

  it('throws when non-author tries to submit', async () => {
    db.recipe.findUnique.mockResolvedValue({ id: 'r1', authorId: 'other', status: 'draft' });
    await expect(submitForReview('r1', regularUser)).rejects.toThrow('author');
  });

  it('throws when recipe is already published', async () => {
    db.recipe.findUnique.mockResolvedValue({ id: 'r1', authorId: 'u3', status: 'published' });
    await expect(submitForReview('r1', regularUser)).rejects.toThrow();
  });
});

describe('reviewRecipe', () => {
  it('publishes a pending_review recipe', async () => {
    db.recipe.findUnique.mockResolvedValue({ id: 'r1', status: 'pending_review' });
    db.recipe.update.mockResolvedValue({ id: 'r1', status: 'published' });

    await reviewRecipe('r1', 'published', undefined, editorUser);

    expect(db.recipe.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'published' }),
      }),
    );
  });

  it('throws when regular user tries to review', async () => {
    await expect(reviewRecipe('r1', 'published', undefined, regularUser)).rejects.toThrow();
  });
});

describe('deleteRecipe', () => {
  it('deletes recipe when user is author', async () => {
    db.recipe.findUnique.mockResolvedValue({ id: 'r1', authorId: 'u3', status: 'draft' });
    db.recipe.delete.mockResolvedValue({});

    await deleteRecipe('r1', regularUser);
    expect(db.recipe.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
  });

  it('throws NotFoundError when recipe does not exist', async () => {
    db.recipe.findUnique.mockResolvedValue(null);
    await expect(deleteRecipe('r1', adminUser)).rejects.toThrow('not found');
  });
});
