import { describe, it, expect } from 'vitest';
import { updateProfileSchema } from '../profile';

describe('updateProfileSchema', () => {
  it('accepts empty object', () => {
    expect(() => updateProfileSchema.parse({})).not.toThrow();
  });

  it('accepts valid name', () => {
    const result = updateProfileSchema.parse({ name: 'John Doe' });
    expect(result.name).toBe('John Doe');
  });

  it('trims name', () => {
    const result = updateProfileSchema.parse({ name: '  John  ' });
    expect(result.name).toBe('John');
  });

  it('rejects name exceeding 100 characters', () => {
    expect(() => updateProfileSchema.parse({ name: 'a'.repeat(101) })).toThrow();
  });

  it('accepts valid settings', () => {
    const result = updateProfileSchema.parse({
      settings: {
        language: 'fr',
        calorieTarget: 2500,
        proteinTargetG: 80,
        vegetarian: true,
      },
    });
    expect(result.settings?.language).toBe('fr');
    expect(result.settings?.calorieTarget).toBe(2500);
  });

  it('rejects invalid language', () => {
    expect(() =>
      updateProfileSchema.parse({ settings: { language: 'de' } }),
    ).toThrow();
  });

  it('accepts en and fr languages', () => {
    expect(() => updateProfileSchema.parse({ settings: { language: 'en' } })).not.toThrow();
    expect(() => updateProfileSchema.parse({ settings: { language: 'fr' } })).not.toThrow();
  });

  it('rejects age out of range', () => {
    expect(() => updateProfileSchema.parse({ settings: { age: 0 } })).toThrow();
    expect(() => updateProfileSchema.parse({ settings: { age: 151 } })).toThrow();
  });

  it('accepts nullable age', () => {
    const result = updateProfileSchema.parse({ settings: { age: null } });
    expect(result.settings?.age).toBeNull();
  });

  it('rejects calorieTarget below 500', () => {
    expect(() =>
      updateProfileSchema.parse({ settings: { calorieTarget: 499 } }),
    ).toThrow();
  });

  it('rejects calorieTarget above 10000', () => {
    expect(() =>
      updateProfileSchema.parse({ settings: { calorieTarget: 10001 } }),
    ).toThrow();
  });

  it('rejects weightKg out of range', () => {
    expect(() => updateProfileSchema.parse({ settings: { weightKg: 0.5 } })).toThrow();
    expect(() => updateProfileSchema.parse({ settings: { weightKg: 501 } })).toThrow();
  });

  it('rejects heightCm out of range', () => {
    expect(() => updateProfileSchema.parse({ settings: { heightCm: 29 } })).toThrow();
    expect(() => updateProfileSchema.parse({ settings: { heightCm: 301 } })).toThrow();
  });

  it('rejects allergies array exceeding 20 items', () => {
    expect(() =>
      updateProfileSchema.parse({ settings: { allergies: Array(21).fill('nut') } }),
    ).toThrow();
  });

  it('rejects allergy string exceeding 100 characters', () => {
    expect(() =>
      updateProfileSchema.parse({ settings: { allergies: ['a'.repeat(101)] } }),
    ).toThrow();
  });
});
