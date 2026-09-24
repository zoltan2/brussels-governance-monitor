// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.
//
// Garde : Tailwind v4 ne génère que les classes qu'il lit en toutes lettres dans le code source.
// Une classe assemblée à l'exécution (`fill-choro-${n}`, `bg-${couleur}-500`) passe les tests
// jsdom mais n'existe pas dans le CSS construit : la carte ZRU s'affichait en noir en production.
// Ce test lit chaque .tsx de src/components/dossiers/** et refuse, dans un contexte de classe
// (className={…} ou className: …), toute interpolation collée à un morceau de classe.
// Une interpolation isolée par des espaces (`${FILL[n]} stroke-neutral-50`) reste permise : elle
// insère une classe entière, écrite en toutes lettres ailleurs. Les identifiants DOM
// (`${idBase}-titre`) ne sont pas dans un contexte de classe et ne sont pas visés.

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const RACINE = join(process.cwd(), 'src/components/dossiers');

function fichiersTsx(dossier: string): string[] {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((e) => {
    const chemin = join(dossier, e.name);
    if (e.isDirectory()) return fichiersTsx(chemin);
    return e.name.endsWith('.tsx') && !e.name.includes('.test.') ? [chemin] : [];
  });
}

/**
 * Extrait l'expression qui suit `className={` ou `className:` (jusqu'à l'accolade fermante de
 * même niveau, ou jusqu'à la virgule / fin de ligne pour la forme objet), en sautant le contenu
 * des gabarits et des chaînes pour ne pas compter leurs accolades.
 */
function expressionsDeClasse(source: string): string[] {
  const out: string[] = [];
  for (const m of source.matchAll(/className\s*(=\s*\{|:)/g)) {
    const formeObjet = m[1] === ':';
    let i = m.index! + m[0].length;
    const debut = i;
    let profondeur = 0;
    let fin = -1;
    while (i < source.length && fin < 0) {
      const c = source[i];
      if (c === '`' || c === '"' || c === "'") {
        // Saute la chaîne ; dans un gabarit, saute aussi les ${…} imbriqués.
        const q = c;
        i++;
        while (i < source.length && source[i] !== q) {
          if (source[i] === '\\') i++;
          else if (q === '`' && source[i] === '$' && source[i + 1] === '{') {
            let p = 1;
            i += 2;
            while (i < source.length && p > 0) {
              if (source[i] === '{') p++;
              else if (source[i] === '}') p--;
              i++;
            }
            continue;
          }
          i++;
        }
      } else if (c === '{' || c === '(' || c === '[') profondeur++;
      else if (c === '}' || c === ')' || c === ']') {
        if (profondeur === 0) fin = i;
        else profondeur--;
      } else if (formeObjet && profondeur === 0 && (c === ',' || c === '\n')) fin = i;
      i++;
    }
    out.push(source.slice(debut, fin < 0 ? source.length : fin));
  }
  return out;
}

/** Interpolation collée à un caractère de classe, avant (`fill-${n}`) ou après (`${c}-500`). */
function classeAssemblee(expression: string): string | null {
  for (const g of expression.matchAll(/`([^`]*)`/g)) {
    const corps = g[1];
    for (const m of corps.matchAll(/\$\{[^}]*\}/g)) {
      const avant = corps[m.index! - 1];
      const apres = corps[m.index! + m[0].length];
      const isoleAvant = avant === undefined || /\s/.test(avant);
      const isoleApres = apres === undefined || /\s/.test(apres);
      if (!isoleAvant || !isoleApres) return g[0];
    }
  }
  return null;
}

describe('classes Tailwind écrites en toutes lettres (dossiers)', () => {
  it('détecte une classe assemblée et laisse passer une classe entière interpolée', () => {
    expect(classeAssemblee('`fill-choro-${n}`')).not.toBeNull();
    expect(classeAssemblee('`bg-${c}-500 p-2`')).not.toBeNull();
    expect(classeAssemblee('`${c}-500`')).not.toBeNull();
    expect(classeAssemblee('`${FILL[n]} stroke-neutral-50`')).toBeNull();
    expect(classeAssemblee("ok ? 'fill-choro-1' : 'fill-choro-2'")).toBeNull();
  });

  it('extrait les expressions de classe, pas les identifiants', () => {
    const src = 'const id = `${idBase}-titre`;\n<p id={id} className={`fill-choro-${n} x`} />';
    expect(expressionsDeClasse(src)).toEqual(['`fill-choro-${n} x`']);
  });

  it('aucun .tsx de src/components/dossiers ne construit une classe Tailwind à l’exécution', () => {
    const fautes: string[] = [];
    const fichiers = fichiersTsx(RACINE);
    expect(fichiers.length).toBeGreaterThan(5);
    for (const f of fichiers) {
      for (const expr of expressionsDeClasse(readFileSync(f, 'utf8'))) {
        const faute = classeAssemblee(expr);
        if (faute) fautes.push(`${relative(process.cwd(), f)} : ${faute}`);
      }
    }
    expect(fautes).toEqual([]);
  });
});
