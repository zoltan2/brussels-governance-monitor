// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  changedChangelogTexts,
  changedRadarTexts,
  findTemporal,
  parseTemporalPatterns,
  temporalHits,
} from './data-temporal';

// La vraie liste de motifs, celle des MDX : une seule source.
const PATTERNS = parseTemporalPatterns(
  fs.readFileSync(path.join(process.cwd(), 'scripts/content-lint/temporal-patterns.txt'), 'utf8'),
);

// Texte réel de data/radar.json (2026-03-27-lez-fracture-bim, nextStep.fr).
const LEZ_NEXT = 'Amendes 350 EUR dès le 1er avril. Première lecture arrêté dans les semaines à venir. Cadre réformé visé janvier 2027.';

const i18n = (fr: string) => ({ fr, nl: 'Tekst.', en: 'Text.', de: 'Text.' });

describe('motifs temporels appliqués aux données', () => {
  it('lit la liste partagée sans ses commentaires', () => {
    expect(PATTERNS.length).toBeGreaterThan(10);
    expect(PATTERNS.some((p) => p.source.startsWith('#'))).toBe(false);
  });

  it('attrape le nextStep réel du signal LEZ (« dans les semaines à venir »)', () => {
    expect(temporalHits(LEZ_NEXT, PATTERNS)).toContain('à venir');
  });

  it("ignore un motif cité entre « » (grève des profs, « in the coming days »)", () => {
    const t = 'Le Vif, 18 May (« the movement is expected to grow in scale in the coming days »). Context: strike.';
    expect(temporalHits(t, PATTERNS)).toEqual([]);
    expect(temporalHits(t, PATTERNS, { keepQuotations: true })).toHaveLength(1);
  });

  it('passe une date absolue', () => {
    expect(temporalHits('Arrêté attendu avant le 15 juin 2026.', PATTERNS)).toEqual([]);
  });
});

describe('textes ajoutés ou réécrits', () => {
  it('radar : signal nouveau, champ réécrit, champ inchangé', () => {
    const base = [{ id: 'lez', descriptions: i18n('Ancien.'), nextStep: i18n(LEZ_NEXT) }];
    const head = [
      { id: 'lez', descriptions: i18n('Récrit récemment.'), nextStep: i18n(LEZ_NEXT) },
      { id: 'neuf', summary: i18n('Décision attendue prochainement.'), descriptions: i18n('Texte.') },
    ];
    const found = findTemporal(changedRadarTexts(base, head), PATTERNS);
    // Le nextStep LEZ, dette inchangée, n'est pas bloqué ; les deux textes neufs le sont.
    expect(found.map((f) => `${f.where} ${f.field}`)).toEqual(['lez descriptions.fr', 'neuf summary.fr']);
  });

  it('changelog : clé (date, section, slug), doublons du même jour tolérés', () => {
    const e = (fr: string) => ({ date: '2026-08-09', section: 'domains', targetSlug: 'mobility', descriptions: i18n(fr) });
    const base = [e('Fait A.'), e('Fait B.')];
    expect(changedChangelogTexts(base, [e('Fait B.'), e('Fait A.')])).toEqual([]);
    const added = changedChangelogTexts(base, [e('Nouvelle étape bientôt.'), e('Fait A.'), e('Fait B.')]);
    expect(findTemporal(added, PATTERNS).map((f) => f.hits[0])).toEqual(['bientôt']);
  });

  it('sans base, tout est nouveau (fichier créé)', () => {
    expect(changedRadarTexts(null, [{ id: 'x', descriptions: i18n('a') }])).toHaveLength(4);
  });
});
