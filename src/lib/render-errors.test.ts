// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { afterEach, describe, expect, it } from 'vitest';
import { bilanErreursRendu, noterErreurRendu, viderErreursRendu } from './render-errors';

const T0 = new Date('2026-09-28T12:00:00Z');
const plus = (h: number) => new Date(T0.getTime() + h * 3_600_000);

afterEach(() => viderErreursRendu());

describe('registre des erreurs de rendu', () => {
  it('distingue les régénérations ISR des requêtes ordinaires', () => {
    noterErreurRendu({ routePath: '/[locale]', revalidateReason: 'stale' }, T0);
    noterErreurRendu({ routePath: '/[locale]/radar', revalidateReason: undefined }, plus(1));
    expect(bilanErreursRendu(plus(2))).toEqual({
      total24h: 2,
      revalidation24h: 1,
      derniere: { at: plus(1).toISOString(), routePath: '/[locale]/radar', revalidateReason: null },
    });
  });

  it('ne compte pas comme régénération une requête qui n\'est ni GET ni HEAD', () => {
    // 05/10/2026 : un robot envoie un POST au corps illisible sur une adresse
    // inexistante. Next rattache l'erreur à `/_not-found/page` avec `stale`,
    // alors qu'aucune page n'a manqué sa régénération.
    noterErreurRendu({ routePath: '/_not-found/page', revalidateReason: 'stale', method: 'POST' }, T0);
    noterErreurRendu({ routePath: '/[locale]', revalidateReason: 'stale', method: 'GET' }, plus(1));
    noterErreurRendu({ routePath: '/[locale]', revalidateReason: 'on-demand', method: 'head' }, plus(2));
    const bilan = bilanErreursRendu(plus(3));
    expect(bilan.total24h).toBe(3);
    expect(bilan.revalidation24h).toBe(2);
  });

  it('oublie ce qui a plus de 24 h', () => {
    noterErreurRendu({ routePath: '/[locale]', revalidateReason: 'stale' }, T0);
    expect(bilanErreursRendu(plus(23)).revalidation24h).toBe(1);
    expect(bilanErreursRendu(plus(25))).toEqual({ total24h: 0, revalidation24h: 0, derniere: null });
  });

  it('reste borné sous une rafale (robot qui provoque des erreurs en boucle)', () => {
    for (let i = 0; i < 500; i++) noterErreurRendu({ routePath: '/x', revalidateReason: undefined }, T0);
    expect(bilanErreursRendu(T0).total24h).toBe(50);
  });

  it('partage le registre entre deux copies du module (instrumentation et route sont deux paquets)', async () => {
    noterErreurRendu({ routePath: '/[locale]', revalidateReason: 'stale' }, T0);
    const url = new URL('./render-errors.ts', import.meta.url).href;
    const copie = (await import(/* @vite-ignore */ `${url}?copie=1`)) as typeof import('./render-errors');
    expect(copie.bilanErreursRendu(T0).revalidation24h).toBe(1);
  });
});
