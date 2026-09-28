// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Revue red team du 28/09/2026 : le plafond de taille ne lisait que
 * `Content-Length`. Un envoi en `Transfer-Encoding: chunked` n'en porte pas et
 * passait le garde, puis `request.json()` mettait tout le corps en memoire.
 */
import { describe, it, expect } from 'vitest';
import { readJsonCapped, readTextCapped } from './request-guards';

/** Requete dont le corps est un flux : `new Request` ne pose AUCUN Content-Length. */
function requeteEnFlux(morceaux: string[], compteur?: { lus: number }): Request {
  const enc = new TextEncoder();
  let i = 0;
  const flux = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i >= morceaux.length) {
        controller.close();
        return;
      }
      if (compteur) compteur.lus++;
      controller.enqueue(enc.encode(morceaux[i++]));
    },
  });
  return new Request('https://governance.brussels/api/x', {
    method: 'POST',
    body: flux,
    // @ts-expect-error `duplex` est exige par undici pour un corps en flux
    duplex: 'half',
  });
}

describe('readTextCapped', () => {
  it("refuse un corps en flux sans Content-Length qui depasse la limite", async () => {
    const req = requeteEnFlux(['a'.repeat(600), 'b'.repeat(600)]);
    expect(req.headers.get('content-length')).toBeNull();
    const lu = await readTextCapped(req, 1000);
    expect(lu).toEqual({ ok: false, status: 413, error: 'Payload too large' });
  });

  it("cesse de lire des le premier morceau de trop", async () => {
    const compteur = { lus: 0 };
    const morceaux = Array.from({ length: 50 }, () => 'x'.repeat(100));
    const lu = await readTextCapped(requeteEnFlux(morceaux, compteur), 250);
    expect(lu.ok).toBe(false);
    expect(compteur.lus).toBeLessThan(10);
  });

  it('accepte un corps en flux sous la limite, octets multiples compris', async () => {
    const lu = await readTextCapped(requeteEnFlux(['{"a":"é', 'té"}']), 1000);
    expect(lu).toEqual({ ok: true, value: '{"a":"été"}' });
  });

  it('refuse sans lire un Content-Length annonce trop grand', async () => {
    const req = new Request('https://governance.brussels/api/x', {
      method: 'POST',
      headers: { 'content-length': '999999' },
      body: 'court',
    });
    expect(await readTextCapped(req, 1000)).toMatchObject({ ok: false, status: 413 });
  });
});

describe('readJsonCapped', () => {
  it('rend la valeur analysee', async () => {
    expect(await readJsonCapped(requeteEnFlux(['{"email":', '"a@b.be"}']))).toEqual({
      ok: true,
      value: { email: 'a@b.be' },
    });
  });

  it('rend 400 sur un JSON invalide', async () => {
    expect(await readJsonCapped(requeteEnFlux(['{pas du json']))).toMatchObject({
      ok: false,
      status: 400,
    });
  });
});
