import { describe, it, expect } from 'vitest';
import {
  createRecipeSchema,
  updateRecipeSchema,
  reviewRecipeSchema,
  changeRecipeStatusSchema,
} from '../recipe';

describe('createRecipeSchema', () => {
  it('accepts valid data with title', () => {
    const data = { title: 'My Recipe', ingredients: ['flour', 'sugar'] };
    expect(() => createRecipeSchema.parse(data)).not.toThrow();
  });

  it('accepts valid data with titleFr only', () => {
    const data = { titleFr: 'Ma Recette' };
    expect(() => createRecipeSchema.parse(data)).not.toThrow();
  });

  it('rejects when neither title nor titleFr is provided', () => {
    expect(() => createRecipeSchema.parse({})).toThrow();
  });

  it('rejects when both titles are empty strings', () => {
    expect(() => createRecipeSchema.parse({ title: '  ', titleFr: '  ' })).toThrow();
  });

  it('trims whitespace from title', () => {
    const result = createRecipeSchema.parse({ title: '  My Recipe  ' });
    expect(result.title).toBe('My Recipe');
  });

  it('rejects title exceeding 200 characters', () => {
    const data = { title: 'a'.repeat(201) };
    expect(() => createRecipeSchema.parse(data)).toThrow();
  });

  it('rejects prepTimeMin exceeding 1440', () => {
    const data = { title: 'Test', prepTimeMin: 1441 };
    expect(() => createRecipeSchema.parse(data)).toThrow();
  });

  it('rejects negative prepTimeMin', () => {
    const data = { title: 'Test', prepTimeMin: -1 };
    expect(() => createRecipeSchema.parse(data)).toThrow();
  });

  it('rejects non-integer servings', () => {
    const data = { title: 'Test', servings: 2.5 };
    expect(() => createRecipeSchema.parse(data)).toThrow();
  });

  it('rejects servings of 0', () => {
    const data = { title: 'Test', servings: 0 };
    expect(() => createRecipeSchema.parse(data)).toThrow();
  });

  it('rejects invalid imageUrl', () => {
    const data = { title: 'Test', imageUrl: 'not-a-url' };
    expect(() => createRecipeSchema.parse(data)).toThrow();
  });

  it('accepts valid imageUrl', () => {
    const data = { title: 'Test', imageUrl: 'https://example.com/img.jpg' };
    expect(() => createRecipeSchema.parse(data)).not.toThrow();
  });

  it('rejects ingredients array exceeding 100 items', () => {
    const data = { title: 'Test', ingredients: Array(101).fill('item') };
    expect(() => createRecipeSchema.parse(data)).toThrow();
  });

  it('rejects steps array exceeding 50 items', () => {
    const data = { title: 'Test', steps: Array(51).fill('step') };
    expect(() => createRecipeSchema.parse(data)).toThrow();
  });

  it('accepts calories at boundary values', () => {
    expect(() => createRecipeSchema.parse({ title: 'Test', calories: 0 })).not.toThrow();
    expect(() => createRecipeSchema.parse({ title: 'Test', calories: 10000 })).not.toThrow();
  });

  it('rejects calories exceeding 10000', () => {
    expect(() => createRecipeSchema.parse({ title: 'Test', calories: 10001 })).toThrow();
  });
});

describe('updateRecipeSchema', () => {
  it('accepts empty object', () => {
    expect(() => updateRecipeSchema.parse({})).not.toThrow();
  });

  it('accepts nullable numeric fields', () => {
    const data = { prepTimeMin: null, cookTimeMin: null, servings: null, calories: null };
    expect(() => updateRecipeSchema.parse(data)).not.toThrow();
  });

  it('accepts valid partial update', () => {
    const data = { title: 'Updated', calories: 500 };
    expect(() => updateRecipeSchema.parse(data)).not.toThrow();
  });

  it('rejects invalid values same as create', () => {
    expect(() => updateRecipeSchema.parse({ title: 'a'.repeat(201) })).toThrow();
  });
});

describe('reviewRecipeSchema', () => {
  it('accepts published status', () => {
    const result = reviewRecipeSchema.parse({ status: 'published' });
    expect(result.status).toBe('published');
  });

  it('accepts rejected status with reviewNote', () => {
    const result = reviewRecipeSchema.parse({ status: 'rejected', reviewNote: 'Needs work' });
    expect(result.status).toBe('rejected');
    expect(result.reviewNote).toBe('Needs work');
  });

  it('rejects invalid status', () => {
    expect(() => reviewRecipeSchema.parse({ status: 'draft' })).toThrow();
  });

  it('rejects reviewNote exceeding 1000 characters', () => {
    expect(() =>
      reviewRecipeSchema.parse({ status: 'rejected', reviewNote: 'a'.repeat(1001) }),
    ).toThrow();
  });
});

describe('changeRecipeStatusSchema', () => {
  it('accepts all valid statuses', () => {
    for (const status of ['draft', 'pending_review', 'published', 'rejected']) {
      expect(() => changeRecipeStatusSchema.parse({ status })).not.toThrow();
    }
  });

  it('rejects invalid status', () => {
    expect(() => changeRecipeStatusSchema.parse({ status: 'unknown' })).toThrow();
  });
});
