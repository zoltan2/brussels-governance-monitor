// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Page Presse & données : chaque clé existe dans les quatre langues, avec les
 * mêmes paramètres ICU, et chaque clé lue par la vue existe.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import fr from '../../messages/fr.json';
import nl from '../../messages/nl.json';
import en from '../../messages/en.json';
import de from '../../messages/de.json';
import { PRESS_KINDS } from '@/lib/press';

const LANGUES = { fr, nl, en, de } as const;

function feuilles(obj: unknown, prefixe = ''): Map<string, string> {
  const res = new Map<string, string>();
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      const chemin = prefixe ? `${prefixe}.${k}` : k;
      if (typeof v === 'string') res.set(chemin, v);
      else for (const [c, s] of feuilles(v, chemin)) res.set(c, s);
    }
  }
  return res;
}

const parametres = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('messages « press »', () => {
  const reference = feuilles(fr.press);

  it.each(['nl', 'en', 'de'] as const)('%s a exactement les clés du français, non vides, mêmes paramètres', (l) => {
    const cible = feuilles(LANGUES[l].press);
    expect([...cible.keys()].sort()).toEqual([...reference.keys()].sort());
    for (const [cle, texte] of cible) {
      expect(texte.trim().length, `${l} ${cle}`).toBeGreaterThan(0);
      expect(parametres(texte), `${l} ${cle}`).toEqual(parametres(reference.get(cle)!));
    }
  });

  it.each(Object.keys(LANGUES))('%s nomme la page dans le menu, le pied de page et le fil d’Ariane', (l) => {
    const m = LANGUES[l as keyof typeof LANGUES];
    expect(m.nav.press).toBeTruthy();
    expect(m.footer.press).toBe(m.nav.press);
    expect(m.breadcrumb.press).toBe(m.nav.press);
    expect(m.press.pageTitle).toBe(m.nav.press);
  });

  it('couvre chaque clé lue par la vue', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/presse/presse-view.tsx'), 'utf8');
    const statiques = [...source.matchAll(/\bt\('([\w.]+)'/g)].map((m) => m[1]);
    const provide = [...source.matchAll(/'(provide\d)'/g)].map((m) => m[1]);
    const familles = PRESS_KINDS.flatMap((k) => [`kinds.${k}.title`, `kinds.${k}.description`]);
    const lues = [...statiques, ...provide, ...familles];
    expect(statiques.length).toBeGreaterThan(20);
    for (const cle of lues) expect(reference.has(cle), cle).toBe(true);
  });

  it('ne promet pas d’interview en allemand', () => {
    for (const [l, m] of Object.entries(LANGUES)) {
      const interviews = m.press.contactInterviews.toLowerCase();
      expect(interviews, l).not.toMatch(/allemand|duits|german|deutsch/);
    }
  });
});
