import { cardRefForPath, SOURCE_LOCALE, type MagazineLocale } from './locales';
import type { Magazine, ValidationError } from './types';

/**
 * Garde de parité (spec magazine trilingue, §4.2) : une édition traduite ne
 * dit jamais autre chose que le français validé. Contrôle la structure et les
 * chiffres, sujet par sujet ; le sens des phrases reste affaire de relecture.
 */

/**
 * Ce qu'un grand chiffre affirme, indépendamment de la langue : ses nombres,
 * dans l'ordre, et ses marques (environ, signe, pour cent). Le champ est libre
 * (« 48,7 % », « ≈ 12 000 », « +82,6 % », « 12 sur 26 », « 131 000 000 EUR ») :
 * les mots et les unités se traduisent, les nombres non.
 * fr et nl : virgule décimale, espace ou point pour les milliers.
 * en : point décimal, virgule ou espace pour les milliers.
 */
export function statSignature(stat: string, locale: MagazineLocale): string {
  const text = stat.replace(/[  ]/g, ' ');
  const numbers = (text.match(/\d(?:[\d .,]*\d)?/g) ?? []).map((raw) => {
    const compact = raw.replace(/ /g, '');
    const normal = locale === 'en' ? compact.replace(/,/g, '') : compact.replace(/\./g, '').replace(',', '.');
    return String(Number(normal));
  });
  const marks = [/[≈~]/.test(text) ? '≈' : '', /^\s*(?:≈ ?)?\+/.test(text) ? '+' : '', /^\s*(?:≈ ?)?[-−]/.test(text) ? '-' : '', text.includes('%') ? '%' : ''];
  return `${marks.join('')}|${numbers.join('|')}`;
}

function sameStat(a: string, b: string, locale: MagazineLocale): boolean {
  return statSignature(a, SOURCE_LOCALE) === statSignature(b, locale);
}

export function checkParity(source: Magazine, edition: Magazine, locale: MagazineLocale): ValidationError[] {
  const errors: ValidationError[] = [];
  const err = (itemIndex: number | null, field: string, reason: string) =>
    errors.push({ itemIndex, field, reason: `édition ${locale} : ${reason}` });

  if ((source.version ?? 1) !== (edition.version ?? 1)) {
    err(null, 'version', `gabarit ${edition.version ?? 1}, le français est en ${source.version ?? 1}`);
  }
  if (source.items.length !== edition.items.length) {
    err(null, 'items', `${edition.items.length} sujet(s), le français en compte ${source.items.length}`);
    return errors;
  }

  source.items.forEach((fr, i) => {
    const tr = edition.items[i]!;
    const frCard = cardRefForPath(fr.path);
    const trCard = cardRefForPath(tr.path);
    if (trCard && trCard.locale !== locale) {
      err(i, 'path', `le lien ${tr.path} mène à la fiche d'une autre langue (${trCard.locale})`);
    }
    if (frCard?.kind !== trCard?.kind || frCard?.slug !== trCard?.slug) {
      err(i, 'path', `fiche visée différente du français (${tr.path ?? 'aucune'} au lieu de ${fr.path ?? 'aucune'})`);
    }
    if (!sameStat(fr.stat, tr.stat, locale)) {
      err(i, 'stat', `chiffre « ${tr.stat} », le français dit « ${fr.stat} »`);
    }
    if (fr.confidence !== tr.confidence) {
      err(i, 'confidence', `statut ${tr.confidence ?? 'absent'}, le français dit ${fr.confidence ?? 'absent'}`);
    }
    if (Boolean(fr.cover) !== Boolean(tr.cover)) {
      err(i, 'cover', `mise en couverture différente du français`);
    }
    if ((fr.facts ?? []).length !== (tr.facts ?? []).length) {
      err(i, 'facts', `${(tr.facts ?? []).length} repère(s), le français en compte ${(fr.facts ?? []).length}`);
    }
  });
  return errors;
}
