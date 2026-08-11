// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { readFileAtRef } from './github-pr';

export interface SummaryChange {
  path: string;
  /** Nom lisible de la fiche, sans le préfixe ni le suffixe de locale. */
  label: string;
  before: string | null;
  after: string | null;
  /** Nombres présents dans la version nouvelle et absents de l'ancienne. */
  numbers: string[];
}

/** Bornes de l'en-tête YAML, au tout début du fichier uniquement. */
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;

export function extractSummary(mdx: string): string | null {
  const block = FRONTMATTER.exec(mdx);
  if (!block) return null;

  const line = /^changeSummary:\s*(.*)$/m.exec(block[1]);
  if (!line) return null;

  const raw = line[1].trim();
  if (!raw) return null;
  // Un scalaire bloc YAML (`>`, `|`, `>-`) n'a pas sa valeur sur cette ligne :
  // la rendre afficherait « Après : > ».
  if (/^[|>][-+]?$/.test(raw)) return null;

  // Les guillemets droits comme typographiques sont utilisés dans le dépôt.
  const unquoted = raw.replace(/^["'«»“”]\s?/, '').replace(/\s?["'«»“”]$/, '');
  return unquoted || null;
}

/**
 * Relève les nombres éditoriaux : entiers, décimaux, et nombres à
 * séparateur de milliers. Les dates ISO sont écartées, elles changent à
 * chaque veille sans porter d'information à relire.
 */
export function extractNumbers(text: string): string[] {
  const withoutIsoDates = text.replace(/\d{4}-\d{2}-\d{2}/g, ' ');
  // La virgule est exclue du séparateur : « En 2024, 12 communes » donnait
  // le jeton soudé « 2024, 12 », qui change dès que l'un des deux bouge et
  // produit un faux « chiffre nouveau ».
  const found = withoutIsoDates.match(/\d[\d ]*[\d]|\d/g) ?? [];
  return found
    .map((n) => n.trim())
    .filter((n) => n.length > 0);
}

function labelFor(path: string): string {
  return path.replace(/^content\//, '').replace(/\.fr\.mdx$/, '');
}

export async function collectSummaryChanges(
  paths: string[],
  baseSha: string,
  headSha: string,
): Promise<SummaryChange[]> {
  const changes = await Promise.all(
    paths.map(async (path) => {
      const [oldMdx, newMdx] = await Promise.all([
        readFileAtRef(path, baseSha),
        readFileAtRef(path, headSha),
      ]);

      const oldNumbers = new Set(oldMdx ? extractNumbers(oldMdx) : []);
      const newNumbers = newMdx ? extractNumbers(newMdx) : [];

      return {
        path,
        label: labelFor(path),
        before: oldMdx ? extractSummary(oldMdx) : null,
        after: newMdx ? extractSummary(newMdx) : null,
        numbers: newNumbers.filter((n) => !oldNumbers.has(n)),
      };
    }),
  );

  return changes;
}
