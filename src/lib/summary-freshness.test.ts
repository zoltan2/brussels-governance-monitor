// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import {
  SUMMARY_MAX_AGE_DAYS,
  checkSummaryFreshness,
  readFrontmatterScalar,
} from './summary-freshness';

describe('checkSummaryFreshness', () => {
  it('accepte un chapeau relu le jour même', () => {
    const r = checkSummaryFreshness({
      lastModified: '2026-08-30',
      summaryReviewed: '2026-08-30',
    });
    expect(r.verdict).toBe('ok');
    expect(r.ageDays).toBe(0);
    expect(r.reason).toBe('');
  });

  it('accepte un chapeau pile sur la limite', () => {
    const r = checkSummaryFreshness({
      lastModified: '2026-08-30',
      summaryReviewed: '2026-06-01',
    });
    expect(r.ageDays).toBe(90);
    expect(r.verdict).toBe('ok');
  });

  it('refuse un chapeau un jour au-delà de la limite', () => {
    const r = checkSummaryFreshness({
      lastModified: '2026-08-30',
      summaryReviewed: '2026-05-31',
    });
    expect(r.ageDays).toBe(91);
    expect(r.verdict).toBe('stale');
    expect(r.reason).toContain('91');
  });

  it('reproduit le cas security du 30 août 2026', () => {
    // Le summary datait du 19 avril, la fiche était republiée le 30 août.
    const r = checkSummaryFreshness({
      lastModified: '2026-08-30',
      summaryReviewed: '2026-04-19',
    });
    expect(r.verdict).toBe('stale');
    expect(r.ageDays).toBe(133);
  });

  it('traite un summaryReviewed absent comme une dette, pas comme un succès', () => {
    const r = checkSummaryFreshness({
      lastModified: '2026-08-30',
      summaryReviewed: undefined,
    });
    expect(r.verdict).toBe('missing');
    expect(r.reason).toContain('summaryReviewed');
  });

  it('signale une date illisible plutôt que de la traiter comme absente', () => {
    const r = checkSummaryFreshness({
      lastModified: '2026-08-30',
      summaryReviewed: '30/08/2026',
    });
    expect(r.verdict).toBe('unparsable');
  });

  it('accepte un chapeau relu après la dernière publication de la fiche', () => {
    // Cas d'une reprise éditoriale qui relit les chapeaux sans republier les
    // fiches : l'écart est négatif, il est ramené à zéro et le verdict est ok.
    const r = checkSummaryFreshness({
      lastModified: '2026-07-09',
      summaryReviewed: '2026-08-30',
    });
    expect(r.verdict).toBe('ok');
    expect(r.ageDays).toBe(0);
  });

  it('ne double pas le message quand lastModified manque', () => {
    // Le check lastModified de la CI a déjà échoué sur cette fiche.
    const r = checkSummaryFreshness({
      lastModified: undefined,
      summaryReviewed: '2026-01-01',
    });
    expect(r.verdict).toBe('ok');
  });

  it('respecte un seuil passé explicitement', () => {
    const r = checkSummaryFreshness({
      lastModified: '2026-08-30',
      summaryReviewed: '2026-08-01',
      maxAgeDays: 7,
    });
    expect(r.verdict).toBe('stale');
  });

  it('expose une limite par défaut de nonante jours', () => {
    expect(SUMMARY_MAX_AGE_DAYS).toBe(90);
  });
});

describe('readFrontmatterScalar', () => {
  const file = [
    '---',
    'title: "Sécurité"',
    'slug: security',
    'summary: "Un chapeau."',
    'sources:',
    '  - label: "BX1"',
    '    accessedAt: "2026-08-30"',
    'summaryReviewed: "2026-08-30"',
    'lastModified: "2026-08-30"',
    '---',
    '',
    '## Corps',
    'lastModified: "2020-01-01"',
  ].join('\n');

  it('lit une clé de premier niveau', () => {
    expect(readFrontmatterScalar(file, 'summaryReviewed')).toBe('2026-08-30');
    expect(readFrontmatterScalar(file, 'slug')).toBe('security');
  });

  it('retire les guillemets', () => {
    expect(readFrontmatterScalar(file, 'title')).toBe('Sécurité');
  });

  it('ignore les clés imbriquées dans un bloc', () => {
    // accessedAt est indenté sous sources[], il ne doit pas remonter.
    expect(readFrontmatterScalar(file, 'accessedAt')).toBeUndefined();
  });

  it('ne lit pas au-delà du frontmatter', () => {
    expect(readFrontmatterScalar(file, 'lastModified')).toBe('2026-08-30');
  });

  it('renvoie undefined sur un fichier sans frontmatter', () => {
    expect(readFrontmatterScalar('# Titre\n\ntexte', 'summaryReviewed')).toBeUndefined();
  });

  it('renvoie undefined sur une clé absente', () => {
    expect(readFrontmatterScalar(file, 'digestHeadline')).toBeUndefined();
  });
});
