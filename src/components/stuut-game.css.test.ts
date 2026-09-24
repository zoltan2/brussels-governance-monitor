// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

// iOS zoome à la mise au point d'un champ dont la police fait moins de 16 px, et ne
// dézoome pas : la page reste agrandie pour la session, et les jeux paraissent trop
// larges sur iPhone. globals.css pose un plancher de 16 px sur `input` en mobile,
// mais une classe de module l'emporte sur un sélecteur d'élément : `.champ` ramenait
// les champs du Stuut (inscription, défi) à 14 px. jsdom n'applique pas les feuilles
// de style, d'où une lecture du CSS lui-même.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ici = join(process.cwd(), 'src/components');
const css = readFileSync(join(ici, 'stuut-game.module.css'), 'utf8');

/** Taille de police de `.champ` dans le bloc média mobile, ou null. */
function tailleMobileChamp(source: string): string | null {
  const media = /@media\s*\(max-width:\s*767px\)\s*\{([\s\S]*?)\n\}/g;
  for (const [, corps] of source.matchAll(media)) {
    const regle = /\.champ\s*\{([^}]*)\}/.exec(corps);
    const taille = regle && /font-size:\s*([^;]+);/.exec(regle[1]);
    if (taille) return taille[1].trim();
  }
  return null;
}

describe('champs du Stuut en mobile', () => {
  it('ont une police d’au moins 16 px sous 768 px', () => {
    const taille = tailleMobileChamp(css);
    expect(taille).not.toBeNull();
    const ok = taille === 'max(1rem, 16px)' || (/^(\d+)px$/.test(taille!) && parseInt(taille!, 10) >= 16);
    expect(ok, `font-size mobile de .champ : ${taille}`).toBe(true);
  });

  it('portent tous la classe .champ', () => {
    for (const fichier of ['stuut-game.tsx', 'stuut-inscription.tsx']) {
      const source = readFileSync(join(ici, fichier), 'utf8');
      const champs = source.match(/<(input|textarea|select)\b[\s\S]*?\/>/g) ?? [];
      expect(champs.length, fichier).toBeGreaterThan(0);
      for (const balise of champs) expect(balise, fichier).toContain('s.champ');
    }
  });
});
