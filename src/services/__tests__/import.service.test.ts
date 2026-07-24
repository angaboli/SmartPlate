import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => import('../../lib/__mocks__/db'));
vi.mock('../import-extractor', () => ({
  extractRecipeFromUrl: vi.fn().mockResolvedValue({
    title: 'Extracted Recipe',
    ingredients: ['flour'],
    steps: ['Mix'],
  }),
}));
vi.mock('../ai.service', () => ({
  translateRecipeContent: vi.fn(),
}));

import { db } from '../../lib/__mocks__/db';
import { checkRateLimit, extractFromUrl, saveImport, listImports } from '../import.service';
import { translateRecipeContent } from '../ai.service';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(translateRecipeContent).mockRejectedValue(new Error('AI unavailable'));
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

  it('always creates the imported recipe pending review, never auto-published', async () => {
    db.recipe.create.mockResolvedValue({ id: 'r1', title: 'Test' });
    db.import.create.mockResolvedValue({ id: 'i1' });
    db.savedRecipe.create.mockResolvedValue({ id: 's1' });

    await saveImport('u1', {
      url: 'https://example.com/recipe',
      title: 'Test',
      ingredients: ['flour'],
      steps: ['Mix'],
    });

    expect(db.recipe.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'pending_review', publishedAt: null }),
      }),
    );
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

  it('backfills titleFr/descriptionFr/textFr when the source is English', async () => {
    db.recipe.create.mockResolvedValue({ id: 'r1' });
    db.import.create.mockResolvedValue({ id: 'i1' });
    db.savedRecipe.create.mockResolvedValue({ id: 's1' });
    vi.mocked(translateRecipeContent).mockResolvedValue({
      sourceLanguage: 'en',
      titleEn: 'Pancakes',
      titleFr: 'Crêpes',
      descriptionEn: 'Fluffy pancakes',
      descriptionFr: 'Crêpes moelleuses',
      ingredientsEn: ['flour', 'milk'],
      ingredientsFr: ['farine', 'lait'],
      stepsEn: ['Mix', 'Cook'],
      stepsFr: ['Mélanger', 'Cuire'],
    });

    await saveImport('u1', {
      url: 'https://example.com/recipe',
      title: 'Pancakes',
      description: 'Fluffy pancakes',
      ingredients: ['flour', 'milk'],
      steps: ['Mix', 'Cook'],
    });

    expect(db.recipe.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Pancakes',
          titleFr: 'Crêpes',
          description: 'Fluffy pancakes',
          descriptionFr: 'Crêpes moelleuses',
          ingredients: {
            create: [
              { text: 'flour', textFr: 'farine', sortOrder: 0 },
              { text: 'milk', textFr: 'lait', sortOrder: 1 },
            ],
          },
          steps: {
            create: [
              { text: 'Mix', textFr: 'Mélanger', sortOrder: 0 },
              { text: 'Cook', textFr: 'Cuire', sortOrder: 1 },
            ],
          },
        }),
      }),
    );
  });

  it('swaps title/titleFr so title always ends up English when the source is French', async () => {
    db.recipe.create.mockResolvedValue({ id: 'r1' });
    db.import.create.mockResolvedValue({ id: 'i1' });
    db.savedRecipe.create.mockResolvedValue({ id: 's1' });
    vi.mocked(translateRecipeContent).mockResolvedValue({
      sourceLanguage: 'fr',
      titleEn: 'Pancakes',
      titleFr: 'Crêpes',
      descriptionEn: null,
      descriptionFr: null,
      ingredientsEn: ['flour'],
      ingredientsFr: ['farine'],
      stepsEn: ['Mix'],
      stepsFr: ['Mélanger'],
    });

    await saveImport('u1', {
      url: 'https://example.com/recipe',
      title: 'Crêpes',
      ingredients: ['farine'],
      steps: ['Mélanger'],
    });

    expect(db.recipe.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Pancakes',
          titleFr: 'Crêpes',
          ingredients: { create: [{ text: 'flour', textFr: 'farine', sortOrder: 0 }] },
          steps: { create: [{ text: 'Mix', textFr: 'Mélanger', sortOrder: 0 }] },
        }),
      }),
    );
  });

  it('saves with only the original language when translation fails', async () => {
    db.recipe.create.mockResolvedValue({ id: 'r1' });
    db.import.create.mockResolvedValue({ id: 'i1' });
    db.savedRecipe.create.mockResolvedValue({ id: 's1' });
    vi.mocked(translateRecipeContent).mockRejectedValue(new Error('timeout'));

    await saveImport('u1', {
      url: 'https://example.com/recipe',
      title: 'Test',
      ingredients: ['flour'],
      steps: ['Mix'],
    });

    expect(db.recipe.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Test',
          titleFr: null,
          ingredients: { create: [{ text: 'flour', textFr: null, sortOrder: 0 }] },
        }),
      }),
    );
  });

  it('ignores mismatched-length ingredient/step translations but still applies title/description', async () => {
    db.recipe.create.mockResolvedValue({ id: 'r1' });
    db.import.create.mockResolvedValue({ id: 'i1' });
    db.savedRecipe.create.mockResolvedValue({ id: 's1' });
    vi.mocked(translateRecipeContent).mockResolvedValue({
      sourceLanguage: 'en',
      titleEn: 'Pancakes',
      titleFr: 'Crêpes',
      descriptionEn: null,
      descriptionFr: null,
      ingredientsEn: ['flour'],
      ingredientsFr: ['farine', 'extra'],
      stepsEn: ['Mix'],
      stepsFr: ['Mélanger'],
    });

    await saveImport('u1', {
      url: 'https://example.com/recipe',
      title: 'Pancakes',
      ingredients: ['flour'],
      steps: ['Mix'],
    });

    expect(db.recipe.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          titleFr: 'Crêpes',
          ingredients: { create: [{ text: 'flour', textFr: null, sortOrder: 0 }] },
        }),
      }),
    );
  });
});

describe('listImports', () => {
  it('returns imports for user', async () => {
    db.import.findMany.mockResolvedValue([{ id: 'i1' }]);
    const result = await listImports('u1');
    expect(result).toHaveLength(1);
  });
});
