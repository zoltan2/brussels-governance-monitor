// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { routing } from '@/i18n/routing';
import { validSegmentsByLocale } from './internal-links';

/**
 * Un lien écrit à la main `/${locale}/changelog` sort tel quel dans toutes les
 * langues, alors que la route s'appelle `/fr/mises-a-jour` ou `/nl/wijzigingen`.
 * Le site répond alors par une redirection temporaire (307) : le lecteur arrive,
 * mais Google suit un lien interne vers une adresse qui n'est pas la canonique.
 * Relevé le 07/10/2026 sur le lien « historique » des fiches, le quiz et les
 * données structurées de la page Données.
 *
 * Le lint de contenu (scripts/content-lint/internal-links.ts) couvre `content/` ;
 * ce test couvre le code. Passer par `getPathname`, `canonicalUrl` ou `<Link>`.
 */

const SRC = join(process.cwd(), 'src');

// Les liens des emails gardent le segment interne à dessein : la redirection
// conserve les paramètres `utm_*` (mesuré le 11/09/2026).
// La page « À relire » de l'administration (non indexée) : son lien passe par la
// redirection, et `a-relire.ts` se teste sans `next/navigation`.
const TOLERES = new Set(['lib/digest-updates.ts', 'lib/a-relire.ts']);

function fichiers(dossier: string): string[] {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const chemin = join(dossier, entree.name);
    if (entree.isDirectory()) return fichiers(chemin);
    return /\.tsx?$/.test(entree.name) && !/\.test\.tsx?$/.test(entree.name) ? [chemin] : [];
  });
}

const parLangue = validSegmentsByLocale(routing.pathnames, routing.locales);
const connus = new Set(routing.locales.flatMap((l) => [...parLangue[l]!]));
for (const cle of Object.keys(routing.pathnames)) {
  const segment = cle.split('/')[1];
  if (segment) connus.add(segment);
}
/** Segment de route connu, mais qui n'est pas le bon dans toutes les langues. */
function segmentLocalise(segment: string): boolean {
  return connus.has(segment) && !routing.locales.every((l) => parLangue[l]!.has(segment));
}

describe('liens internes écrits dans le code', () => {
  it('ne colle jamais un segment de route localisé derrière `${locale}`', () => {
    const fautifs: string[] = [];
    for (const fichier of fichiers(SRC)) {
      const nom = relative(SRC, fichier);
      if (TOLERES.has(nom)) continue;
      const lignes = readFileSync(fichier, 'utf8').split('\n');
      lignes.forEach((ligne, i) => {
        for (const m of ligne.matchAll(/\$\{locale\}\/([a-z][a-z-]*)/g)) {
          if (segmentLocalise(m[1]!)) fautifs.push(`${nom}:${i + 1} /\${locale}/${m[1]}`);
        }
      });
    }
    expect(fautifs).toEqual([]);
  });

  it('reconnaît un segment localisé et laisse passer un segment commun', () => {
    expect(segmentLocalise('changelog')).toBe(true);
    expect(segmentLocalise('domaines')).toBe(true);
    expect(segmentLocalise('dossiers')).toBe(false);
    expect(segmentLocalise('admin')).toBe(false);
  });
});
