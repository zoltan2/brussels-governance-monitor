// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { lireCouche, urlCouche } from './wfs';

const rep = (body: unknown, init: { status?: number; type?: string } = {}) =>
  (async () =>
    new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      status: init.status ?? 200,
      headers: { 'content-type': init.type ?? 'application/json' },
    })) as unknown as typeof fetch;

const bon = {
  type: 'FeatureCollection', numberMatched: 1, numberReturned: 1,
  crs: { properties: { name: 'urn:ogc:def:crs:EPSG::31370' } },
  features: [{ properties: { MD_ID: 1 }, geometry: { type: 'Polygon', coordinates: [] } }],
};

describe('lireCouche', () => {
  it('demande Lambert 72 et du GeoJSON', () => {
    const u = new URL(urlCouche('PERSPECTIVE:A10_ZRU_2026'));
    expect(u.searchParams.get('srsName')).toBe('EPSG:31370');
    expect(u.searchParams.get('outputFormat')).toBe('application/json');
  });
  it('rend les entités d\'une réponse conforme', async () => {
    expect((await lireCouche('X', rep(bon))).features).toHaveLength(1);
  });
  it('échoue sur un code HTTP non 200 en nommant la couche', async () => {
    await expect(lireCouche('COUCHE_X', rep('<xml/>', { status: 400, type: 'text/xml' }))).rejects.toThrow(/COUCHE_X.*400/);
  });
  it('échoue sur une réponse XML servie en 200', async () => {
    await expect(lireCouche('X', rep('<ows:ExceptionReport/>', { type: 'text/xml' }))).rejects.toThrow(/JSON/);
  });
  it('échoue sur une réponse tronquée', async () => {
    await expect(lireCouche('X', rep({ ...bon, numberMatched: 750 }))).rejects.toThrow(/tronqu/);
  });
  it('échoue sur un autre système de coordonnées', async () => {
    await expect(lireCouche('X', rep({ ...bon, crs: { properties: { name: 'EPSG:4326' } } }))).rejects.toThrow(/31370/);
  });
});
