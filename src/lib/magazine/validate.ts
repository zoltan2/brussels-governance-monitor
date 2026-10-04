import type { Magazine, MagazineItem, ValidationError } from './types';

// Le `stat` est le grand chiffre affiché sur une carte du magazine. La seule
// exigence de fond est qu'il commence par un nombre, éventuellement signé :
// c'est ce qui empêche un mot comme « toutes » d'atterrir en gros caractères.
// Ce qui suit le nombre est libre (unité, devise, rapport, mois), la longueur
// étant déjà bornée par le schéma Velite. Une liste blanche d'unités rejetait
// des valeurs légitimes comme « 131 000 000 EUR », « +82,6 % » ou « 12 sur 26 ».
// Le gabarit v2 accepte aussi un signe « environ » devant (« ≈ 12 000 »).
const STAT_PATTERN = /^(?:≈ ?)?[+\-−]?\d[^\n]*$/;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CONFIDENCES = new Set(['official', 'estimated', 'unconfirmed']);
const SOURCE_KINDS = new Set(['primaire', 'secondaire', 'tierce']);
const MAX_COVER = 3;
const MAX_FACTS = 2;
const MAX_NUANCE_TITLE = 80;

export function isV2(mag: Magazine): boolean {
  return mag.version === 2;
}

function validateItemV2(item: MagazineItem, i: number, errors: ValidationError[]): void {
  if (!item.nuance_title || item.nuance_title.trim().length === 0) {
    errors.push({ itemIndex: i, field: 'nuance_title', reason: 'le titre de la nuance manque' });
  } else if (item.nuance_title.length > MAX_NUANCE_TITLE) {
    errors.push({
      itemIndex: i,
      field: 'nuance_title',
      reason: `le titre de la nuance fait ${item.nuance_title.length} caractères, ${MAX_NUANCE_TITLE} au plus`,
    });
  }
  if (!item.confidence || !CONFIDENCES.has(item.confidence)) {
    errors.push({
      itemIndex: i,
      field: 'confidence',
      reason: `confidence doit valoir official, estimated ou unconfirmed (reçu « ${item.confidence ?? ''} »)`,
    });
  }
  // Les sources ne sont pas affichées (décision du 04/10/2026 : le magazine renvoie
  // au site, où elles vivent). Facultatives, elles restent vérifiées quand elles
  // sont données : forme de l'URL ici, présence dans la fiche par sources-check.
  if (item.sources && item.sources.length > 0) {
    item.sources.forEach((src, j) => {
      if (!/^https?:\/\//.test(src.url ?? '')) {
        errors.push({ itemIndex: i, field: 'sources', reason: `source ${j + 1} : URL http(s) attendue (reçu « ${src.url ?? ''} »)` });
      }
      if (!SOURCE_KINDS.has(src.kind)) {
        errors.push({ itemIndex: i, field: 'sources', reason: `source ${j + 1} : kind doit valoir primaire, secondaire ou tierce (reçu « ${src.kind ?? ''} »)` });
      }
      if (!src.label || src.label.trim().length === 0) {
        errors.push({ itemIndex: i, field: 'sources', reason: `source ${j + 1} : libellé vide` });
      }
    });
  }
  if (item.facts && item.facts.length > MAX_FACTS) {
    errors.push({ itemIndex: i, field: 'facts', reason: `${item.facts.length} repères, ${MAX_FACTS} au plus` });
  }
}

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
    if (isV2(mag)) validateItemV2(item, i, errors);
  });

  if (isV2(mag)) {
    if (!mag.period || mag.period.trim().length === 0) {
      errors.push({ itemIndex: null, field: 'period', reason: 'la période couverte manque (« 21 au 27 septembre 2026 »)' });
    }
    if (!mag.consulted || !DAY_PATTERN.test(mag.consulted)) {
      errors.push({ itemIndex: null, field: 'consulted', reason: `consulted doit être un jour AAAA-MM-JJ (reçu « ${mag.consulted ?? ''} »)` });
    }
    const covers = mag.items.filter((it) => it.cover).length;
    if (covers > MAX_COVER) {
      errors.push({ itemIndex: null, field: 'cover', reason: `${covers} sujets en couverture, ${MAX_COVER} au plus` });
    }
  }

  return errors;
}
