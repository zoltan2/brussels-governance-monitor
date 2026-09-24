// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Jours de calendrier écoulés depuis une date, comptés à l'heure de Bruxelles.
 *
 * Le compteur de l'accueil (« N jours depuis la prestation de serment ») comptait
 * en jours UTC : entre minuit et 1 h (hiver) ou 2 h (été) à Bruxelles, la journée
 * belge avait déjà changé mais pas la journée UTC, et le compteur affichait la
 * veille. On lit donc le quantième dans le fuseau Europe/Brussels, via `Intl`,
 * puis on compare deux dates de calendrier.
 *
 * Convention inchangée : 0 le jour de la date de départ, 1 le lendemain.
 * Fonction pure : l'instant `now` est toujours fourni par l'appelant, si bien que
 * le serveur et le navigateur calculent la même valeur pour le même instant.
 */

const DAY_MS = 86_400_000;
export const FUSEAU_BRUXELLES = 'Europe/Brussels';

// `en-CA` rend AAAA-MM-JJ, mais on lit les parties une à une plutôt que de se
// fier au format d'une locale.
const QUANTIEME_BRUXELLES = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSEAU_BRUXELLES,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Date de calendrier (AAAA-MM-JJ) de l'instant `now` à Bruxelles. */
export function jourABruxelles(now: Date): string {
  const parts = QUANTIEME_BRUXELLES.formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/**
 * Jours de calendrier entre `isoDate` (AAAA-MM-JJ) et le jour bruxellois de `now`.
 * Jamais négatif : une date future donne 0.
 */
export function joursEcoulesDepuis(isoDate: string, now: Date): number {
  const debut = Date.parse(`${isoDate}T00:00:00Z`);
  const aujourdhui = Date.parse(`${jourABruxelles(now)}T00:00:00Z`);
  // Deux minuits UTC : l'écart est un multiple exact de 24 h, sans heure d'été.
  return Math.max(0, Math.round((aujourdhui - debut) / DAY_MS));
}
