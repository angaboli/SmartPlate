import { describe, it, expect } from 'vitest';
import { bi } from '../bilingual';

describe('bi', () => {
  it('returns English text when language is en', () => {
    expect(bi('Hello', 'Bonjour', 'en')).toBe('Hello');
  });

  it('returns French text when language is fr', () => {
    expect(bi('Hello', 'Bonjour', 'fr')).toBe('Bonjour');
  });

  it('falls back to French when English is empty and language is en', () => {
    expect(bi('', 'Bonjour', 'en')).toBe('Bonjour');
  });

  it('falls back to English when French is empty and language is fr', () => {
    expect(bi('Hello', '', 'fr')).toBe('Hello');
  });

  it('falls back to French when English is null', () => {
    expect(bi(null, 'Bonjour', 'en')).toBe('Bonjour');
  });

  it('falls back to English when French is null', () => {
    expect(bi('Hello', null, 'fr')).toBe('Hello');
  });

  it('returns empty string when both are null and language is en', () => {
    expect(bi(null, null, 'en')).toBe('');
  });

  it('returns empty string when both are null and language is fr', () => {
    expect(bi(null, null, 'fr')).toBe('');
  });

  it('falls back when preferred text is only whitespace', () => {
    expect(bi('  ', 'Bonjour', 'en')).toBe('Bonjour');
    expect(bi('Hello', '  ', 'fr')).toBe('Hello');
  });
});
