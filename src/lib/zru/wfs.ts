// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

export const URL_WFS = 'https://gis.urban.brussels/geoserver/ows';

export interface CollectionGeo {
  numberMatched?: number;
  numberReturned?: number;
  crs?: { properties?: { name?: string } };
  features: { properties: Record<string, unknown>; geometry: unknown }[];
}

export function urlCouche(typeName: string): string {
  const u = new URL(URL_WFS);
  u.search = new URLSearchParams({
    service: 'WFS', version: '2.0.0', request: 'GetFeature',
    typeNames: typeName, outputFormat: 'application/json', srsName: 'EPSG:31370',
  }).toString();
  return u.toString();
}

export async function lireCouche(typeName: string, fetchImpl: typeof fetch = fetch): Promise<CollectionGeo> {
  const r = await fetchImpl(urlCouche(typeName));
  if (r.status !== 200) throw new Error(`WFS ${typeName} : HTTP ${r.status}`);
  const texte = await r.text();
  let json: CollectionGeo;
  try { json = JSON.parse(texte); } catch { throw new Error(`WFS ${typeName} : réponse non JSON (${texte.slice(0, 60)})`); }
  if (json.numberMatched !== undefined && json.numberMatched !== json.numberReturned)
    throw new Error(`WFS ${typeName} : réponse tronquée (${json.numberReturned}/${json.numberMatched})`);
  const crs = json.crs?.properties?.name ?? '';
  if (!crs.includes('31370')) throw new Error(`WFS ${typeName} : CRS ${crs || 'absent'}, 31370 attendu`);
  return json;
}
