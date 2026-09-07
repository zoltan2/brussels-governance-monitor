import type { Magazine, ValidationError } from './types';

// Le `stat` est le grand chiffre affiché sur une carte du magazine. La seule
// exigence de fond est qu'il commence par un nombre, éventuellement signé :
// c'est ce qui empêche un mot comme « toutes » d'atterrir en gros caractères.
// Ce qui suit le nombre est libre (unité, devise, rapport, mois), la longueur
// étant déjà bornée par le schéma Velite. Une liste blanche d'unités rejetait
// des valeurs légitimes comme « 131 000 000 EUR », « +82,6 % » ou « 12 sur 26 ».
const STAT_PATTERN = /^[+\-−]?\d[^\n]*$/;

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
        reason: `stat "${item.stat}" must start with a number (optionally signed)`,
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
