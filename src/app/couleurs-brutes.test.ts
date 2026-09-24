// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, resolve } from 'path';
import { describe, expect, it } from 'vitest';

/**
 * Garde contre les couleurs brutes de Tailwind dans le code public.
 *
 * Le mode sombre marche par tokens CSS (`neutral-*`, `brand-*`, `warning-*`,
 * `info-*`, `confirmed-*`…) redéfinis dans chaque mode par `globals.css`. Une
 * classe de la palette Tailwind (`bg-amber-50`, `text-slate-900`, `bg-white`)
 * ne change pas : posée à côté d'un token, elle rend le texte illisible en
 * sombre. Le 23/09/2026, les alertes des dossiers tombaient à 1,08:1 et la FAQ
 * de chaque dossier à 1,10:1, sur 392 occurrences dans 65 fichiers publics.
 * `globals.contrast.test.ts` ne peut pas le voir : il teste les tokens, pas
 * leur usage. Ce test-ci teste l'usage.
 *
 * Les exceptions sont nommées, fichier par fichier, avec leur raison. La liste
 * ne peut que diminuer : une exception devenue inutile fait aussi échouer.
 */

const SRC = resolve(__dirname, '..');

const RAW_COLOR = new RegExp(
  [
    // Palette Tailwind par défaut, tous préfixes d'utilitaires.
    String.raw`(?<![\w-])(?:[a-z-]+:)*(?:bg|text|border(?:-[lrtbxy])?|ring(?:-offset)?|divide|from|via|to|fill|stroke|outline|decoration|placeholder|accent|caret|shadow)-(?:amber|slate|gray|zinc|stone|teal|blue|indigo|violet|rose|emerald|sky|cyan|lime|orange|fuchsia|purple|yellow|green|red|pink)-\d{2,3}(?:\/\d+)?`,
    // Blanc et noir absolus.
    String.raw`(?<![\w-])(?:[a-z-]+:)*(?:bg|text|border|ring(?:-offset)?|from|via|to)-(?:white|black)(?:\/\d+)?(?![\w-])`,
    // Échelons de token qui n'existent pas : ils ne génèrent aucune CSS.
    String.raw`(?<![\w-])(?:[a-z-]+:)*(?:bg|text|border|ring)-(?:neutral-150|brand-(?:100|300|400|500))(?![\w-])`,
  ].join('|'),
  'g',
);

/** Dossiers hors périmètre : non publics, ou forcés en clair par leur layout. */
const EXCLUDED_DIRS = [
  'app/[locale]/admin',
  'components/admin',
  'app/[locale]/refonte', // maquettes noindex, couleurs figées volontairement
  'components/refonte',
  'app/merci-cafe-numerique', // layout en light-forced
  'app/livre', // layout en light-forced
  'emails', // e-mails : pas de mode sombre (règle maison)
];

/**
 * Exceptions justifiées. Clé : chemin relatif à src/. Valeur : classes admises
 * dans ce fichier, et pourquoi.
 */
const ALLOWED: Record<string, { classes: string[]; raison: string }> = {
  // Bandeaux volontairement sombres dans les deux modes : dégradé ardoise et
  // texte blanc, lisibles par construction.
  'app/[locale]/page.tsx': {
    classes: [
      'from-slate-800', 'to-slate-700', 'text-white', 'text-white/80', 'hover:text-white/90', 'text-white/85',
      'bg-white', 'text-slate-900', 'hover:bg-white/90', 'border-white/70', 'hover:bg-white/10',
      'border-white/15', 'bg-white/5', 'focus-visible:ring-white', 'focus-visible:ring-offset-slate-800',
    ],
    raison: 'bandeau d\'accueil sombre dans les deux modes',
  },
  'components/crisis-counter.tsx': {
    classes: [
      'from-slate-800', 'to-slate-700', 'text-white', 'text-white/75', 'text-white/85', 'border-white/10',
      'bg-white/5', 'text-white/90', 'text-white/80', 'hover:text-white',
    ],
    raison: 'bandeau sombre dans les deux modes',
  },
  'components/commitments-barometer.tsx': {
    classes: [
      'border-white/15', 'focus-visible:ring-white', 'focus-visible:ring-offset-slate-800', 'text-white/75',
      'text-white/85', 'text-white',
    ],
    raison: 'posé dans le bandeau d\'accueil sombre',
  },
  'components/government-day-counter.tsx': {
    classes: ['text-white/75', 'text-white/85'],
    raison: 'posé dans le bandeau d\'accueil sombre',
  },
  // Palettes de catégories : décisions de design, pas des couleurs de sens.
  // À trancher par un choix de palette adaptative, puis à retirer d'ici.
  'components/commitments-dashboard.tsx': {
    classes: [
      'border-l-amber-500', 'border-l-orange-500', 'border-l-violet-500', 'border-l-emerald-500',
      'border-l-rose-500', 'border-l-slate-600', 'border-l-cyan-500', 'border-l-lime-500',
      'border-l-indigo-500', 'border-l-stone-500', 'border-l-sky-500', 'border-l-fuchsia-500',
    ],
    raison: 'un liseré par domaine (12 teintes) ; emerald, lime et rose contreviennent à la règle « jamais rouge ni vert »',
  },
  'components/games-panel.tsx': { classes: ['bg-black/40'], raison: 'voile de fenêtre modale' },
  'components/search.tsx': { classes: ['bg-black/40'], raison: 'voile de fenêtre modale' },
};

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) out.push(p);
  }
  return out;
}

function scan(): Map<string, Set<string>> {
  const found = new Map<string, Set<string>>();
  for (const file of walk(SRC)) {
    const rel = relative(SRC, file);
    if (EXCLUDED_DIRS.some((d) => rel.startsWith(d))) continue;
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(RAW_COLOR)) {
      if (!found.has(rel)) found.set(rel, new Set());
      found.get(rel)!.add(m[0]);
    }
  }
  return found;
}

describe('couleurs brutes dans le code public', () => {
  const found = scan();

  it('aucune couleur brute hors exceptions justifiées', () => {
    const violations: string[] = [];
    for (const [file, classes] of found) {
      const allowed = new Set(ALLOWED[file]?.classes ?? []);
      for (const c of classes) if (!allowed.has(c)) violations.push(`${file} : ${c}`);
    }
    expect(violations, 'remplacer par un token (neutral-*, brand-*, warning-*, info-*, confirmed-*)').toEqual([]);
  });

  it('chaque exception sert encore (la liste ne peut que diminuer)', () => {
    const stale: string[] = [];
    for (const [file, { classes }] of Object.entries(ALLOWED)) {
      const present = found.get(file) ?? new Set();
      for (const c of classes) if (!present.has(c)) stale.push(`${file} : ${c}`);
    }
    expect(stale, 'retirer ces exceptions devenues inutiles').toEqual([]);
  });
});
