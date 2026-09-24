// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.
//
// Les légendes de provenance réellement rendues par les quatre figures ZRU, avec les vraies
// provenances (pas une donnée de test) : aucune phrase française en néerlandais, anglais ou
// allemand, aucune note interne (réserve à vérifier, empreintes de fichiers) dans aucune langue,
// ponctuation de la langue.

import { render, cleanup } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { ZruCarteQuartiers } from './carte-quartiers';
import { ZruCarte2020_2026 } from './carte-zru';
import { ZruCommunesRangs } from './communes-rangs';
import { ZruPointsEurope } from './points-europe';
import { PROVENANCE_QUARTIERS } from './data/quartiers';
import { PROVENANCE_GEOMETRIE } from './data/geometrie';
import { PROVENANCE_COMMUNES } from './data/communes';
import { PROVENANCE_EUROPE } from './data/europe';
import type { Locale, Provenance } from './data/types';

afterEach(() => cleanup());

const FIGURES: [string, (locale: Locale) => ReactElement, Provenance][] = [
  ['carte des quartiers', (locale) => <ZruCarteQuartiers locale={locale} />, PROVENANCE_QUARTIERS],
  ['carte ZRU 2020-2026', (locale) => <ZruCarte2020_2026 locale={locale} />, PROVENANCE_GEOMETRIE],
  ['rangs des communes', (locale) => <ZruCommunesRangs locale={locale} />, PROVENANCE_COMMUNES],
  ['points européens', (locale) => <ZruPointsEurope locale={locale} />, PROVENANCE_EUROPE],
];

/** Mots de la prose française des provenances, absents des trois autres langues. */
const MARQUEURS_FR = [
  'calcul BGM',
  'recouvrement',
  'millésime',
  'laissés vides',
  'jamais à zéro',
  'répartition',
  'paliers',
  'converties',
  'reprises telles quelles',
  'feuille',
  'fichier',
  'communes bruxelloises',
  'années de revenus',
  'arrondi',
  'région de la capitale',
  'réutilisation',
  'mention de la source',
  'jointure',
  'topologie partagée',
  'reconstitués',
];

/** Notes internes qui ne doivent jamais atteindre le lecteur, quelle que soit la langue. */
const NOTES_INTERNES = [/réserve/i, /à vérifier/i, /empreinte/i, /\b[0-9a-f]{16}\b/];

const legende = (el: ReactElement) => render(el).container.querySelector('figcaption')!.textContent!;

describe('provenance des figures ZRU, par langue', () => {
  for (const [nom, figure, provenance] of FIGURES) {
    for (const locale of ['nl', 'en', 'de'] as const) {
      it(`${nom} (${locale}) : aucune phrase ni marqueur français de la provenance`, () => {
        const texte = legende(figure(locale));
        for (const m of provenance.modifications.fr) expect(texte).not.toContain(m);
        if (provenance.licence.fr !== provenance.licence[locale]) expect(texte).not.toContain(provenance.licence.fr);
        for (const m of MARQUEURS_FR) expect(texte.toLowerCase()).not.toContain(m.toLowerCase());
        for (const m of provenance.modifications[locale]) expect(texte).toContain(m);
        // Ponctuation : pas d'espace avant « : » ni « ; » hors du français.
        expect(texte).not.toMatch(/\s[:;]/);
      });
    }

    for (const locale of ['fr', 'nl', 'en', 'de'] as const) {
      it(`${nom} (${locale}) : aucune note interne rendue`, () => {
        const texte = legende(figure(locale));
        for (const r of NOTES_INTERNES) expect(texte).not.toMatch(r);
      });
    }
  }

  it('surfaces et secteurs de la carte ZRU : confiance « estimé », méthode BGM expliquée, surface 2020 distinguée de la surface 2026', () => {
    expect(PROVENANCE_GEOMETRIE.confiance).toBe('estimated');
    const fr = legende(<ZruCarte2020_2026 locale="fr" />);
    expect(fr).toContain('estimé');
    expect(fr).toContain('recouvrement majoritaire');
    // Vérifié le 24/09/2026 (Tâche 17) : la surface 2020 est l'attribut AREA officiel de la
    // couche WFS, la surface 2026 et les secteurs entrants/sortants restent un calcul BGM.
    expect(fr).toContain('attribut AREA officiel');
    expect(fr).toContain('sans équivalent officiel');
    cleanup();
    expect(legende(<ZruCarte2020_2026 locale="nl" />)).toContain('geschat');
  });
});
