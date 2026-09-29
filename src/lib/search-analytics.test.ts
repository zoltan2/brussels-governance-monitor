// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { trancheResultats, typeDeResultat } from './search-analytics';

describe('trancheResultats', () => {
  it('ramène le nombre à une tranche, jamais au nombre exact', () => {
    expect(trancheResultats(0)).toBe('0');
    expect(trancheResultats(1)).toBe('1-4');
    expect(trancheResultats(4)).toBe('1-4');
    expect(trancheResultats(5)).toBe('5+');
    expect(trancheResultats(8)).toBe('5+');
  });
});

describe('typeDeResultat', () => {
  it('reconnaît les fiches dans les quatre langues, segments localisés', () => {
    expect(typeDeResultat('/fr/dossiers/taxis')).toBe('dossier');
    expect(typeDeResultat('/nl/dossiers/taxis')).toBe('dossier');
    expect(typeDeResultat('/fr/domaines/mobilite')).toBe('domaine');
    expect(typeDeResultat('/nl/domeinen/mobilite')).toBe('domaine');
    expect(typeDeResultat('/en/domains/mobilite')).toBe('domaine');
    expect(typeDeResultat('/de/bereiche/mobilite')).toBe('domaine');
    expect(typeDeResultat('/fr/secteurs/horeca')).toBe('secteur');
    expect(typeDeResultat('/de/sektoren/horeca')).toBe('secteur');
    expect(typeDeResultat('/fr/communes/ixelles')).toBe('commune');
    expect(typeDeResultat('/nl/gemeenten/elsene')).toBe('commune');
    expect(typeDeResultat('/en/municipalities/ixelles')).toBe('commune');
  });

  it('tolère le suffixe .html et une URL absolue', () => {
    expect(typeDeResultat('/fr/domaines/mobilite.html')).toBe('domaine');
    expect(typeDeResultat('https://governance.brussels/fr/communes/ixelles')).toBe('commune');
  });

  it('classe en « autre » les pages d’index et le reste du site', () => {
    expect(typeDeResultat('/fr/domaines')).toBe('autre');
    expect(typeDeResultat('/fr/radar')).toBe('autre');
    expect(typeDeResultat('/fr/comprendre/cocof')).toBe('autre');
    expect(typeDeResultat('/fr/')).toBe('autre');
  });
});
