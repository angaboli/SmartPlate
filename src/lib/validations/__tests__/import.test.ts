import { describe, it, expect } from 'vitest';
import { extractImportSchema, saveImportSchema } from '../import';

describe('extractImportSchema', () => {
  it('accepts valid URL', () => {
    const result = extractImportSchema.parse({ url: 'https://example.com/recipe' });
    expect(result.url).toBe('https://example.com/recipe');
  });

  it('rejects invalid URL', () => {
    expect(() => extractImportSchema.parse({ url: 'not-a-url' })).toThrow();
  });

  it('rejects URL exceeding 2048 characters', () => {
    const url = 'https://example.com/' + 'a'.repeat(2030);
    expect(() => extractImportSchema.parse({ url })).toThrow();
  });

  it('rejects missing url', () => {
    expect(() => extractImportSchema.parse({})).toThrow();
  });
});

describe('saveImportSchema', () => {
  const validInput = {
    url: 'https://example.com/recipe',
    title: 'Test Recipe',
    ingredients: ['flour', 'sugar'],
    steps: ['Mix', 'Bake'],
  };

  it('accepts valid input', () => {
    const result = saveImportSchema.parse(validInput);
    expect(result.title).toBe('Test Recipe');
    expect(result.ingredients).toHaveLength(2);
  });

  it('trims title', () => {
    const result = saveImportSchema.parse({ ...validInput, title: '  Test  ' });
    expect(result.title).toBe('Test');
  });

  it('rejects empty title', () => {
    expect(() => saveImportSchema.parse({ ...validInput, title: '' })).toThrow();
  });

  it('rejects title exceeding 200 characters', () => {
    expect(() =>
      saveImportSchema.parse({ ...validInput, title: 'a'.repeat(201) }),
    ).toThrow();
  });

  it('accepts nullable optional fields', () => {
    const result = saveImportSchema.parse({
      ...validInput,
      description: null,
      imageUrl: null,
      prepTimeMin: null,
      cookTimeMin: null,
      servings: null,
      calories: null,
      tag: null,
    });
    expect(result.description).toBeNull();
  });

  it('rejects ingredients array exceeding 100 items', () => {
    expect(() =>
      saveImportSchema.parse({ ...validInput, ingredients: Array(101).fill('item') }),
    ).toThrow();
  });

  it('rejects steps array exceeding 50 items', () => {
    expect(() =>
      saveImportSchema.parse({ ...validInput, steps: Array(51).fill('step') }),
    ).toThrow();
  });

  it('rejects invalid imageUrl', () => {
    expect(() =>
      saveImportSchema.parse({ ...validInput, imageUrl: 'not-url' }),
    ).toThrow();
  });

  it('accepts valid imageUrl', () => {
    const result = saveImportSchema.parse({
      ...validInput,
      imageUrl: 'https://example.com/img.jpg',
    });
    expect(result.imageUrl).toBe('https://example.com/img.jpg');
  });
});
