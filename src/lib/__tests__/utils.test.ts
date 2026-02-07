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

  it('returns positive number for dates after election', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-09T12:00:00+02:00'));
    expect(daysSinceElections()).toBe(365);
  });

  it('returns correct value for a known date', () => {
    vi.useFakeTimers();
    // 2026-02-07 is 608 days after 2024-06-09
    vi.setSystemTime(new Date('2026-02-07T12:00:00+01:00'));
    expect(daysSinceElections()).toBe(608);
  });
});

describe('formatDate', () => {
  it('formats date in French locale', () => {
    const result = formatDate('2024-06-09', 'fr');
    expect(result).toContain('2024');
    expect(result).toContain('9');
  });

  it('formats date in Dutch locale', () => {
    const result = formatDate('2024-06-09', 'nl');
    expect(result).toContain('2024');
  });

  it('formats date in English locale', () => {
    const result = formatDate('2024-06-09', 'en');
    expect(result).toContain('2024');
  });

  it('formats date in German locale', () => {
    const result = formatDate('2024-06-09', 'de');
    expect(result).toContain('2024');
  });

  it('handles different date strings', () => {
    const result = formatDate('2025-12-25', 'fr');
    expect(result).toContain('2025');
    expect(result).toContain('25');
  });
});

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('filters out falsy values', () => {
    expect(cn('foo', false, 'bar', null, undefined, '')).toBe('foo bar');
  });

  it('returns empty string for no classes', () => {
    expect(cn()).toBe('');
  });

  it('returns single class', () => {
    expect(cn('foo')).toBe('foo');
  });

  it('handles all falsy values', () => {
    expect(cn(false, null, undefined)).toBe('');
  });
});
