import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => import('../../lib/__mocks__/db'));
vi.mock('../import-extractor', () => ({
  extractRecipeFromUrl: vi.fn().mockResolvedValue({
    title: 'Extracted Recipe',
    ingredients: ['flour'],
    steps: ['Mix'],
  }),
}));

import { db } from '../../lib/__mocks__/db';
import { checkRateLimit, extractFromUrl, saveImport, listImports } from '../import.service';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('checkRateLimit', () => {
  it('does not throw when under limit', async () => {
    db.import.count.mockResolvedValue(5);
    await expect(checkRateLimit('u1')).resolves.toBeUndefined();
  });

  it('throws 429 when at limit', async () => {
    db.import.count.mockResolvedValue(10);
    await expect(checkRateLimit('u1')).rejects.toThrow('Rate limit exceeded');
  });
});

describe('extractFromUrl', () => {
  it('returns extracted recipe data', async () => {
    const result = await extractFromUrl('https://example.com/recipe');
    expect(result.title).toBe('Extracted Recipe');
  });
});

describe('saveImport', () => {
  it('creates recipe, import record, and saved recipe in transaction', async () => {
    db.recipe.create.mockResolvedValue({ id: 'r1', title: 'Test' });
    db.import.create.mockResolvedValue({ id: 'i1' });
    db.savedRecipe.create.mockResolvedValue({ id: 's1' });

    const result = await saveImport('u1', {
      url: 'https://example.com/recipe',
      title: 'Test',
      ingredients: ['flour'],
      steps: ['Mix'],
    });

    expect(result.recipe.id).toBe('r1');
    expect(result.import.id).toBe('i1');
  });

  it('throws on empty title', async () => {
    await expect(
      saveImport('u1', {
        url: 'https://example.com',
        title: '  ',
        ingredients: [],
        steps: [],
      }),
    ).rejects.toThrow('Title is required');
  });
});

describe('listImports', () => {
  it('returns imports for user', async () => {
    db.import.findMany.mockResolvedValue([{ id: 'i1' }]);
    const result = await listImports('u1');
    expect(result).toHaveLength(1);
  });
});
