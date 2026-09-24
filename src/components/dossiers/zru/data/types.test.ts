// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { validerProvenance, type Provenance } from './types';

const ok: Provenance = {
  producteur: 'Eurostat',
  url: 'https://ec.europa.eu/eurostat/databrowser/view/ilc_peps11n/default/table',
  sourceMiseAJour: '2026-07-08',
  extraitLe: '2026-09-24',
  licence: 'Réutilisation autorisée avec mention de la source (Décision de la Commission du 12/12/2011)',
  modifications: ['ratio région-capitale / pays calculé par BGM'],
  confiance: 'official',
};

describe('validerProvenance', () => {
  it('accepte une provenance complète', () => {
    expect(validerProvenance(ok)).toEqual([]);
  });
  it('refuse une URL non https', () => {
    expect(validerProvenance({ ...ok, url: 'http://x' })).toContain('url : https requis');
  });
  it('refuse une date non ISO', () => {
    expect(validerProvenance({ ...ok, extraitLe: '24/09/2026' })).toContain('extraitLe : date ISO AAAA-MM-JJ requise');
  });
  it('accepte une date de mise à jour source inconnue (null) mais pas vide', () => {
    expect(validerProvenance({ ...ok, sourceMiseAJour: null })).toEqual([]);
    expect(validerProvenance({ ...ok, sourceMiseAJour: '' })).toContain('sourceMiseAJour : date ISO ou null');
  });
  it('refuse une licence vide', () => {
    expect(validerProvenance({ ...ok, licence: ' ' })).toContain('licence : requise');
  });
});
