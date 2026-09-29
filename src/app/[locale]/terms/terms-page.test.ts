// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Conditions de vente (29/09/2026) : les chiffres promis doivent suivre le code
 * qui les applique, dans les quatre langues. Une page de conditions qui promet
 * 90 jours ou 300 questions quand le serveur en donne autrement est une
 * information précontractuelle fausse.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { routing } from '@/i18n/routing';

const code = (p: string) => readFileSync(p, 'utf8');
const nombre = (src: string, re: RegExp) => Number(src.match(re)?.[1]);

const JOURS = nombre(code('src/lib/chat-access.ts'), /const ACCESS_DAYS = (\d+);/);
const QUESTIONS = nombre(code('src/app/api/chat/route.ts'), /const PAID_DAILY_MAX = (\d+);/);
const LANGUES = ['fr', 'nl', 'en', 'de'] as const;
const terms = (l: string) => JSON.parse(code(`messages/${l}.json`)).terms as Record<string, string>;

describe('page des conditions de vente', () => {
  it('témoin : les constantes du code sont lues', () => {
    expect(JOURS).toBe(90);
    expect(QUESTIONS).toBe(300);
  });

  it.each(LANGUES)('%s : durée et quota conformes au code', (l) => {
    const s2 = terms(l).s2;
    expect(s2).toContain(String(JOURS));
    expect(s2).toContain(String(QUESTIONS));
    expect(terms(l).s5).toContain(String(JOURS));
  });

  it('mêmes clés dans les quatre langues', () => {
    const cles = Object.keys(terms('fr')).sort();
    for (const l of LANGUES) expect(Object.keys(terms(l)).sort()).toEqual(cles);
  });

  it('route déclarée dans les quatre langues', () => {
    const p = routing.pathnames['/terms'] as Record<string, string>;
    expect(Object.keys(p).sort()).toEqual([...LANGUES].sort());
  });
});
