import { describe, it, expect } from 'vitest';
import { formatDate, cn } from '../utils';

describe('formatDate', () => {
  it('formats date in French (Belgian)', () => {
    const result = formatDate('2024-06-09', 'fr');
    expect(result).toContain('2024');
    expect(result).toMatch(/juin|June/i);
  });

  it('formats date in Dutch (Belgian)', () => {
    const result = formatDate('2024-06-09', 'nl');
    expect(result).toContain('2024');
  });

  it('formats date in English', () => {
    const result = formatDate('2024-06-09', 'en');
    expect(result).toContain('2024');
  });

  it('formats date in German', () => {
    const result = formatDate('2024-06-09', 'de');
    expect(result).toContain('2024');
  });
});

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('filters out falsy values', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b');
  });

  it('returns empty string for no truthy values', () => {
    expect(cn(false, undefined, null)).toBe('');
  });

  it('handles single class', () => {
    expect(cn('only')).toBe('only');
  });
});
