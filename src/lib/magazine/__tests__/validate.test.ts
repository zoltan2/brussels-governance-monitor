import { describe, it, expect } from 'vitest';
import { validateMagazine } from '../validate';
import type { Magazine } from '../types';

function validFixture(): Magazine {
  return {
    tagline: 'Tagline',
    closing_line: 'Close',
    items: [1, 2, 3].map((i) => ({
      category: `Cat ${i}`,
      headline: `Headline ${i}.`,
      path: `/fr/${i}`,
      stat: `${i * 100}`,
      stat_label: `Label ${i}`,
      pill: `Pill ${i}`,
      description: 'A test description long enough to pass validation. '.repeat(3),
      howto: 'A test how-to long enough to pass validation. '.repeat(3),
    })),
  };
}

describe('validateMagazine', () => {
  it('returns no errors for a valid magazine', () => {
    expect(validateMagazine(validFixture())).toEqual([]);
  });

  it('flags fewer than 3 items', () => {
    const mag = validFixture();
    mag.items = mag.items.slice(0, 2);
    const errors = validateMagazine(mag);
    expect(errors).toContainEqual({
      itemIndex: null,
      field: 'items',
      reason: 'Magazine needs at least 3 items, found 2',
    });
  });

  it('flags empty headline', () => {
    const mag = validFixture();
    mag.items[1].headline = '   ';
    const errors = validateMagazine(mag);
    expect(errors).toContainEqual({
      itemIndex: 1,
      field: 'headline',
      reason: 'headline is empty or whitespace',
    });
  });

  it('flags non-numeric stat', () => {
    const mag = validFixture();
    mag.items[0].stat = 'lots';
    const errors = validateMagazine(mag);
    expect(errors.find((e) => e.field === 'stat' && e.itemIndex === 0)).toBeDefined();
  });

  it('accepts stat with spaces, decimals, and units', () => {
    const mag = validFixture();
    mag.items[0].stat = '4 386';
    mag.items[1].stat = '120 K€';
    mag.items[2].stat = '12,7 %';
    expect(validateMagazine(mag).filter((e) => e.field === 'stat')).toEqual([]);
  });

  it('flags description shorter than 100 chars', () => {
    const mag = validFixture();
    mag.items[2].description = 'Too short.';
    const errors = validateMagazine(mag);
    expect(errors.find((e) => e.field === 'description' && e.itemIndex === 2)).toBeDefined();
  });

  it('flags howto shorter than 80 chars', () => {
    const mag = validFixture();
    mag.items[0].howto = 'Nope.';
    const errors = validateMagazine(mag);
    expect(errors.find((e) => e.field === 'howto' && e.itemIndex === 0)).toBeDefined();
  });
});
