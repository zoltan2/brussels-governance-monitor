// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Lecture des sorties de Velite (`.velite/<collection>.json`) SUR DISQUE.
 *
 * Pourquoi pas un import : un JSON importé est recopié par le bundler dans le
 * code serveur, sous la forme `JSON.parse('…')`, une fois par couche (pages,
 * routes). Jusqu'au 02/10/2026, `content.ts` faisait `require('../../.velite')` :
 * deux modules de 20 Mo. Node garde le texte source de tout module chargé, et
 * ce texte, qui contient des caractères hors Latin-1, occupe deux octets par
 * caractère : 2 x 39 Mo de tas, plus deux copies décodées des mêmes données.
 * Mesuré sur un instantané du tas : 240 Mo utilisés pour 259 Mo disponibles
 * sous le plafond de 512 Mo, d'où 41 arrêts « heap out of memory » en 11 h 30
 * le 01/10/2026.
 *
 * Ici, chaque collection est lue à sa première utilisation, décodée une fois,
 * et partagée par toutes les instances du module au travers de `globalThis`
 * (les couches du bundle ont chacune la leur). Le texte lu n'est pas retenu.
 *
 * - Production (`next build`, serveur) : lu une fois, jamais relu. Un fichier
 *   absent est une PANNE : des listes vides régénéreraient un site vide, sans
 *   erreur. La sortie autonome reçoit une copie de `.velite/` (traçage de
 *   Turbopack, doublé par `outputFileTracingIncludes` dans next.config.ts) ;
 *   `scripts/controle-apres-build.ts` fait échouer le build si elle manque.
 * - Ailleurs (`next dev`, vitest) : relu quand Velite a réécrit le fichier ;
 *   un fichier absent rend une liste vide, les tests tournant avant le build.
 *
 * Serveur seulement (`node:fs`) : `client-bundle-boundary.test.ts` interdit ce
 * module aux composants `'use client'`. `donnees-hors-bundle.test.ts` interdit
 * de revenir à un import.
 */

import fs from 'node:fs';
import path from 'node:path';

interface Entree {
  donnees: unknown[];
  mtimeMs: number;
}

const CLE_CACHE = Symbol.for('bgm.collections-velite');

function cache(): Map<string, Entree> {
  const g = globalThis as typeof globalThis & { [CLE_CACHE]?: Map<string, Entree> };
  return (g[CLE_CACHE] ??= new Map());
}

function lire(nom: string): unknown[] {
  const fichier = path.join(process.cwd(), '.velite', `${nom}.json`);
  const enProduction = process.env.NODE_ENV === 'production';
  const connue = cache().get(fichier);

  let mtimeMs = 0;
  if (enProduction) {
    if (connue) return connue.donnees;
  } else {
    try {
      mtimeMs = fs.statSync(fichier).mtimeMs;
    } catch {
      return [];
    }
    if (connue && connue.mtimeMs === mtimeMs) return connue.donnees;
  }

  let texte: string;
  try {
    texte = fs.readFileSync(fichier, 'utf8');
  } catch (cause) {
    throw new Error(
      `Collection Velite introuvable : ${fichier}. Le build a-t-il produit .velite/, ` +
        'et la sortie autonome le contient-elle (outputFileTracingIncludes) ?',
      { cause },
    );
  }

  let donnees: unknown;
  try {
    donnees = JSON.parse(texte);
  } catch (cause) {
    throw new Error(`Collection Velite illisible : ${fichier}`, { cause });
  }
  if (!Array.isArray(donnees)) {
    throw new Error(`Collection Velite inattendue : ${fichier} n'est pas un tableau`);
  }

  cache().set(fichier, { donnees, mtimeMs });
  return donnees;
}

/**
 * Rend un objet dont chaque propriété lit sa collection à la demande :
 * `const { dossierCards } = collectionsVelite(NOMS)` n'ouvre que ce fichier-là.
 */
export function collectionsVelite<T extends object>(noms: readonly (keyof T & string)[]): T {
  const collections = {} as T;
  for (const nom of noms) {
    Object.defineProperty(collections, nom, { enumerable: true, get: () => lire(nom) });
  }
  return collections;
}
