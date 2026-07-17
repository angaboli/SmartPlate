import { describe, it, expect } from 'vitest';
import { createMealLogSchema, scanMealPhotoSchema } from '../meal-log';

describe('createMealLogSchema', () => {
  it('accepts valid meal log input', () => {
    const result = createMealLogSchema.parse({ mealText: 'Chicken salad', mealType: 'lunch' });
    expect(result.mealText).toBe('Chicken salad');
    expect(result.mealType).toBe('lunch');
  });

  it('trims mealText', () => {
    const result = createMealLogSchema.parse({ mealText: '  Pasta  ', mealType: 'dinner' });
    expect(result.mealText).toBe('Pasta');
  });

  it('rejects empty mealText', () => {
    expect(() => createMealLogSchema.parse({ mealText: '', mealType: 'lunch' })).toThrow();
  });

  it('rejects mealText with only whitespace', () => {
    expect(() => createMealLogSchema.parse({ mealText: '   ', mealType: 'lunch' })).toThrow();
  });

  it('rejects mealText exceeding 2000 characters', () => {
    expect(() =>
      createMealLogSchema.parse({ mealText: 'a'.repeat(2001), mealType: 'lunch' }),
    ).toThrow();
  });

  it('transforms mealType to lowercase', () => {
    const result = createMealLogSchema.parse({ mealText: 'food', mealType: 'BREAKFAST' });
    expect(result.mealType).toBe('breakfast');
  });

  it('transforms snacks to snack', () => {
    const result = createMealLogSchema.parse({ mealText: 'food', mealType: 'snacks' });
    expect(result.mealType).toBe('snack');
  });

  it('transforms Snacks to snack (case-insensitive)', () => {
    const result = createMealLogSchema.parse({ mealText: 'food', mealType: 'Snacks' });
    expect(result.mealType).toBe('snack');
  });

  it('rejects invalid mealType', () => {
    expect(() => createMealLogSchema.parse({ mealText: 'food', mealType: 'brunch' })).toThrow();
  });

  it('accepts all valid meal types', () => {
    for (const type of ['breakfast', 'lunch', 'dinner', 'snack']) {
      expect(() => createMealLogSchema.parse({ mealText: 'food', mealType: type })).not.toThrow();
    }
  });
});

describe('scanMealPhotoSchema', () => {
  it('accepts a valid data URL and meal type', () => {
    const result = scanMealPhotoSchema.parse({
      imageDataUrl: 'data:image/jpeg;base64,abc123',
      mealType: 'lunch',
    });
    expect(result.imageDataUrl).toBe('data:image/jpeg;base64,abc123');
    expect(result.mealType).toBe('lunch');
  });

  it('rejects an empty imageDataUrl', () => {
    expect(() =>
      scanMealPhotoSchema.parse({ imageDataUrl: '', mealType: 'lunch' }),
    ).toThrow();
  });

  it('rejects an imageDataUrl exceeding the ceiling length', () => {
    expect(() =>
      scanMealPhotoSchema.parse({
        imageDataUrl: 'a'.repeat(4_000_001),
        mealType: 'lunch',
      }),
    ).toThrow();
  });

  it('normalizes mealType the same way as createMealLogSchema', () => {
    const result = scanMealPhotoSchema.parse({
      imageDataUrl: 'data:image/png;base64,abc',
      mealType: 'Snacks',
    });
    expect(result.mealType).toBe('snack');
  });

  it('rejects an invalid mealType', () => {
    expect(() =>
      scanMealPhotoSchema.parse({ imageDataUrl: 'data:image/png;base64,abc', mealType: 'brunch' }),
    ).toThrow();
  });
});
