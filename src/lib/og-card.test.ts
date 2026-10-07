// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { isOgCardType, ogCardContent, ogCardParams } from './og-card';

const fiche = {
  title: 'Mobilité : nouveau plan régional',
  lastModified: '2026-10-06',
  confidenceLevel: 'estimated',
  status: 'ongoing',
  metrics: [
    { label: 'Rues cyclables', value: '~130' },
    { label: 'Voiries', value: '50', unit: 'km' },
    { label: 'Places vélo', value: '4 700' },
    { label: 'Quatrième chiffre', value: '1' },
  ],
};

describe("URL de l'image sociale d'une fiche", () => {
  /**
   * Le défaut du 07/10/2026 : l'URL portait la date et les chiffres clés, donc
   * elle changeait à chaque veille. Elle ne doit dépendre que du type et du slug.
   */
  it('ne change pas quand le contenu de la fiche change', () => {
    expect(ogCardParams('domain', 'mobility')).toBe('type=domain&slug=mobility');
    expect(ogCardParams('dossier', 'good-move')).toBe('type=dossier&slug=good-move');
  });

  it('encode le slug', () => {
    expect(ogCardParams('dossier', 'a&b=c')).toBe('type=dossier&slug=a%26b%3Dc');
  });

  it('ne reconnaît que les types relus côté serveur', () => {
    expect(isOgCardType('domain')).toBe(true);
    expect(isOgCardType('dossier')).toBe(true);
    expect(isOgCardType('sector')).toBe(false);
    expect(isOgCardType(null)).toBe(false);
  });
});

describe("contenu de l'image sociale d'une fiche", () => {
  it('reprend titre, statut, date et niveau de confiance de la fiche', () => {
    expect(ogCardContent(fiche)).toMatchObject({
      title: 'Mobilité : nouveau plan régional',
      status: 'ongoing',
      date: '2026-10-06',
      confidence: 'estimated',
    });
  });

  it("garde les trois premiers chiffres clés et accole l'unité", () => {
    expect(ogCardContent(fiche).stats).toEqual([
      { label: 'Rues cyclables', value: '~130' },
      { label: 'Voiries', value: '50 km' },
      { label: 'Places vélo', value: '4 700' },
    ]);
  });

  it('accepte une fiche sans statut ni chiffre (dossier)', () => {
    const dossier = { title: 'Good Move', lastModified: '2026-09-28', confidenceLevel: 'official', metrics: [] };
    expect(ogCardContent(dossier)).toMatchObject({ status: null, stats: [] });
  });
});
