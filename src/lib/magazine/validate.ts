import type { Magazine, ValidationError } from './types';

const STAT_PATTERN = /^[\d\s.,]+[KM€%]*$/;

export function validateMagazine(mag: Magazine): ValidationError[] {
  const errors: ValidationError[] = [];

  if (mag.items.length < 3) {
    errors.push({
      itemIndex: null,
      field: 'items',
      reason: `Magazine needs at least 3 items, found ${mag.items.length}`,
    });
  }

  mag.items.forEach((item, i) => {
    if (!item.headline || item.headline.trim().length === 0) {
      errors.push({ itemIndex: i, field: 'headline', reason: 'headline is empty or whitespace' });
    }
    if (!STAT_PATTERN.test(item.stat)) {
      errors.push({
        itemIndex: i,
        field: 'stat',
        reason: `stat "${item.stat}" must be numeric with optional spaces/decimals/units (K, M, €, %)`,
      });
    }
    if (item.description.length < 100) {
      errors.push({
        itemIndex: i,
        field: 'description',
        reason: `description must be at least 100 characters, got ${item.description.length}`,
      });
    }
    if (item.howto.length < 80) {
      errors.push({
        itemIndex: i,
        field: 'howto',
        reason: `howto must be at least 80 characters, got ${item.howto.length}`,
      });
    }
  });

  return errors;
}
