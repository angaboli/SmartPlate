import { describe, it, expect } from 'vitest';
import { saveCookLaterSchema, updateCookLaterSchema } from '../cook-later';

describe('saveCookLaterSchema', () => {
  it('accepts valid input with recipeId', () => {
    const result = saveCookLaterSchema.parse({ recipeId: 'abc123' });
    expect(result.recipeId).toBe('abc123');
  });

  it('accepts input with tags', () => {
    const result = saveCookLaterSchema.parse({ recipeId: 'abc123', tags: ['favorites'] });
    expect(result.tags).toEqual(['favorites']);
  });

  it('accepts multiple tags', () => {
    const result = saveCookLaterSchema.parse({ recipeId: 'abc123', tags: ['lunch', 'dinner'] });
    expect(result.tags).toEqual(['lunch', 'dinner']);
  });

  it('accepts an empty tags array', () => {
    const result = saveCookLaterSchema.parse({ recipeId: 'abc123', tags: [] });
    expect(result.tags).toEqual([]);
  });

  it('rejects empty recipeId', () => {
    expect(() => saveCookLaterSchema.parse({ recipeId: '' })).toThrow();
  });

  it('rejects missing recipeId', () => {
    expect(() => saveCookLaterSchema.parse({})).toThrow();
  });

  it('rejects a tag exceeding 50 characters', () => {
    expect(() =>
      saveCookLaterSchema.parse({ recipeId: 'abc', tags: ['a'.repeat(51)] }),
    ).toThrow();
  });

  it('rejects more than 10 tags', () => {
    expect(() =>
      saveCookLaterSchema.parse({ recipeId: 'abc', tags: Array(11).fill('x') }),
    ).toThrow();
  });

  it('trims tag whitespace', () => {
    const result = saveCookLaterSchema.parse({ recipeId: 'abc', tags: ['  favorites  '] });
    expect(result.tags).toEqual(['favorites']);
  });
});

describe('updateCookLaterSchema', () => {
  it('accepts empty object', () => {
    expect(() => updateCookLaterSchema.parse({})).not.toThrow();
  });

  it('accepts isCooked boolean', () => {
    const result = updateCookLaterSchema.parse({ isCooked: true });
    expect(result.isCooked).toBe(true);
  });

  it('accepts tags update', () => {
    const result = updateCookLaterSchema.parse({ tags: ['weeknight'] });
    expect(result.tags).toEqual(['weeknight']);
  });

  it('accepts an empty tags array (clearing)', () => {
    const result = updateCookLaterSchema.parse({ tags: [] });
    expect(result.tags).toEqual([]);
  });

  it('rejects a tag exceeding 50 characters', () => {
    expect(() => updateCookLaterSchema.parse({ tags: ['a'.repeat(51)] })).toThrow();
  });
});
