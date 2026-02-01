import { describe, it, expect } from 'vitest';
import { saveCookLaterSchema, updateCookLaterSchema } from '../cook-later';

describe('saveCookLaterSchema', () => {
  it('accepts valid input with recipeId', () => {
    const result = saveCookLaterSchema.parse({ recipeId: 'abc123' });
    expect(result.recipeId).toBe('abc123');
  });

  it('accepts input with tag', () => {
    const result = saveCookLaterSchema.parse({ recipeId: 'abc123', tag: 'favorites' });
    expect(result.tag).toBe('favorites');
  });

  it('accepts null tag', () => {
    const result = saveCookLaterSchema.parse({ recipeId: 'abc123', tag: null });
    expect(result.tag).toBeNull();
  });

  it('rejects empty recipeId', () => {
    expect(() => saveCookLaterSchema.parse({ recipeId: '' })).toThrow();
  });

  it('rejects missing recipeId', () => {
    expect(() => saveCookLaterSchema.parse({})).toThrow();
  });

  it('rejects tag exceeding 50 characters', () => {
    expect(() =>
      saveCookLaterSchema.parse({ recipeId: 'abc', tag: 'a'.repeat(51) }),
    ).toThrow();
  });

  it('trims tag whitespace', () => {
    const result = saveCookLaterSchema.parse({ recipeId: 'abc', tag: '  favorites  ' });
    expect(result.tag).toBe('favorites');
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

  it('accepts tag update', () => {
    const result = updateCookLaterSchema.parse({ tag: 'weeknight' });
    expect(result.tag).toBe('weeknight');
  });

  it('accepts null tag', () => {
    const result = updateCookLaterSchema.parse({ tag: null });
    expect(result.tag).toBeNull();
  });

  it('rejects tag exceeding 50 characters', () => {
    expect(() => updateCookLaterSchema.parse({ tag: 'a'.repeat(51) })).toThrow();
  });
});
