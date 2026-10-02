// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Instantané des thèmes en silence, gardé dans le dossier de données du site
 * (déduit de DB_PATH, comme `infra-status.ts`). Écrit une fois par jour par la
 * tâche planifiée `themes-muets`, lu par la tuile de l'administration : lire
 * les thèmes de chaque abonné coûte un appel Resend par contact, près d'une
 * minute pour une centaine, ce qu'une tuile ne peut pas faire à l'affichage.
 */
import { readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { InstantaneThemesMuets } from './themes-muets';

const FICHIER = 'themes-muets.json';

function chemin(): string | null {
  const dbPath = process.env.DB_PATH;
  return dbPath ? join(dirname(dbPath), FICHIER) : null;
}

/** `null` si le fichier est absent, illisible, ou s'il n'y a pas de dossier de données. */
export async function lireFichierThemesMuets(): Promise<unknown> {
  const c = chemin();
  if (!c) return null;
  try {
    return JSON.parse(await readFile(c, 'utf8'));
  } catch {
    return null;
  }
}

/** Écriture entière ou pas du tout : fichier voisin, puis renommage. */
export async function ecrireFichierThemesMuets(instantane: InstantaneThemesMuets): Promise<void> {
  const c = chemin();
  if (!c) throw new Error('DB_PATH absent : aucun dossier de données où écrire');
  const provisoire = `${c}.tmp`;
  await writeFile(provisoire, `${JSON.stringify(instantane, null, 2)}\n`, 'utf8');
  await rename(provisoire, c);
}
