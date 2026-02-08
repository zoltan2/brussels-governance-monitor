import { describe, it, expect, vi, afterEach } from 'vitest';
import { daysSinceElections, formatDate, cn } from '../utils';

describe('daysSinceElections', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 0 on election day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-09T12:00:00+02:00'));
    expect(daysSinceElections()).toBe(0);
  });

  it('returns 1 the day after elections', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-10T12:00:00+02:00'));
    expect(daysSinceElections()).toBe(1);
  });

  it('returns 365 after one year', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-09T12:00:00+02:00'));
    expect(daysSinceElections()).toBe(365);
  });

  it('returns a positive number for any date after elections', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-07T10:00:00+01:00'));
    expect(daysSinceElections()).toBeGreaterThan(600);
  });
});

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
