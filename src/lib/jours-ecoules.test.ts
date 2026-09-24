// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { jourABruxelles, joursEcoulesDepuis } from './jours-ecoules';

/**
 * Vecteurs figés : instant UTC en entrée, nombre attendu en dur. Les attendus
 * ont été calculés à la main (écart entre deux dates de calendrier), sans
 * réutiliser la formule du module.
 *
 * Les cas « minuit passé à Bruxelles » sont ceux que la version UTC ratait :
 * entre 00:00 et 01:00 (hiver) ou 02:00 (été) à Bruxelles, la date UTC est
 * encore la veille.
 */
const SERMENT = '2026-02-14';

describe('joursEcoulesDepuis — jours de calendrier à Bruxelles', () => {
  it.each<[string, number, string]>([
    // [instant UTC, attendu, commentaire]
    ['2026-02-14T10:00:00Z', 0, 'le jour même du serment'],
    ['2026-02-13T12:00:00Z', 0, 'la veille : jamais négatif'],
    ['2026-02-15T12:00:00Z', 1, 'le lendemain'],
    ['2026-09-24T08:00:00Z', 222, 'convention actuelle : 222 le 24/09/2026'],
    ['2026-09-24T21:30:00Z', 222, '23 h 30 à Bruxelles, toujours le 24'],
  ])('%s → %i (%s)', (instant, attendu) => {
    expect(joursEcoulesDepuis(SERMENT, new Date(instant))).toBe(attendu);
  });

  it.each<[string, number, string]>([
    // Minuit passé à Bruxelles, veille en UTC.
    ['2026-02-14T23:30:00Z', 1, '15/02 00:30 à Bruxelles (hiver, UTC+1)'],
    ['2026-09-23T22:30:00Z', 222, '24/09 00:30 à Bruxelles (été, UTC+2)'],
    ['2026-09-23T23:59:00Z', 222, '24/09 01:59 à Bruxelles (été)'],
    // Passage à l'heure d'été : dimanche 29/03/2026, 02:00 CET → 03:00 CEST (01:00 UTC).
    ['2026-03-28T23:30:00Z', 43, '29/03 00:30 CET, avant le changement'],
    ['2026-03-29T00:30:00Z', 43, '29/03 01:30 CET, juste avant le changement'],
    ['2026-03-29T01:30:00Z', 43, '29/03 03:30 CEST, juste après'],
    ['2026-03-29T22:30:00Z', 44, '30/03 00:30 CEST, premier minuit en heure d’été'],
    // Retour à l'heure d'hiver : dimanche 25/10/2026, 03:00 CEST → 02:00 CET (01:00 UTC).
    ['2026-10-24T22:30:00Z', 253, '25/10 00:30 CEST'],
    ['2026-10-25T00:30:00Z', 253, '25/10 02:30 CEST, avant le changement'],
    ['2026-10-25T01:30:00Z', 253, '25/10 02:30 CET, après'],
    ['2026-10-25T23:30:00Z', 254, '26/10 00:30 CET, premier minuit en heure d’hiver'],
    // Fins de mois et d'année.
    ['2026-02-28T23:30:00Z', 15, '01/03 00:30 CET (fin février)'],
    ['2026-04-30T22:30:00Z', 76, '01/05 00:30 CEST (fin avril)'],
    ['2026-12-31T12:00:00Z', 320, '31/12 13:00 CET'],
    ['2026-12-31T23:30:00Z', 321, '01/01/2027 00:30 CET'],
  ])('%s → %i (%s)', (instant, attendu) => {
    expect(joursEcoulesDepuis(SERMENT, new Date(instant))).toBe(attendu);
  });
});

describe('jourABruxelles', () => {
  it('donne la date de calendrier belge, pas la date UTC', () => {
    expect(jourABruxelles(new Date('2026-12-31T23:30:00Z'))).toBe('2027-01-01');
    expect(jourABruxelles(new Date('2026-12-31T22:59:00Z'))).toBe('2026-12-31');
  });

  it('ne dépend pas du fuseau de la machine qui calcule', () => {
    // Le serveur tourne en UTC, le navigateur dans le fuseau du lecteur : seul
    // l'instant compte. `process.env.TZ` modifié en cours de route ne change rien.
    const avant = process.env.TZ;
    try {
      process.env.TZ = 'America/Los_Angeles';
      expect(joursEcoulesDepuis(SERMENT, new Date('2026-09-23T22:30:00Z'))).toBe(222);
      process.env.TZ = 'Asia/Tokyo';
      expect(joursEcoulesDepuis(SERMENT, new Date('2026-09-23T22:30:00Z'))).toBe(222);
    } finally {
      if (avant === undefined) delete process.env.TZ;
      else process.env.TZ = avant;
    }
  });
});
