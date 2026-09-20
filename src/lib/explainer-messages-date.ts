// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Un contenu `explainers.<clé>` réécrit dans messages/*.json doit faire bouger
 * l'entrée correspondante de EXPLAINER_LAST_MODIFIED (src/lib/explainer-dates.ts).
 *
 * Constat du 20/09/2026 : la table a été seedée la veille avec SITE_LAUNCH_DATE
 * partout sauf « brussels-paradox », et « brussels-overview » a été réécrite
 * le jour même (commit eb552ae4, PIB/navetteurs/institutions internationales)
 * sans que la table bouge. Conséquence mesurée : le rapport SEO signalait la
 * page comme non mise à jour depuis sept mois alors qu'elle l'avait été la
 * veille. Une table tenue à la main pourrit dès qu'on oublie de la mettre à
 * jour — c'est exactement ce qui vient d'arriver, un jour après sa création.
 *
 * Module sans accès disque ni exécution de code : l'appelant (le script CLI)
 * fournit le texte des deux versions (avant/après) et les objets JSON déjà
 * parsés. `readExplainerDateExpr` ne fait que lire du texte, jamais l'exécuter
 * — src/lib/explainer-dates.ts n'est jamais importé avec deux git-blobs
 * différents en tête, seulement grep-lu comme n'importe quel frontmatter.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Représentation stable (clés triées) d'une valeur JSON quelconque, pour
 * comparer deux sous-arbres sans être trompé par un simple réordonnancement
 * de clés qui ne change rien au contenu affiché.
 */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/**
 * Le contenu `explainers.<clé>` a-t-il changé entre les deux versions ?
 * `undefined`/`null` (clé absente du fichier à cette révision) comptent comme
 * une valeur à part entière : une page qui apparaît ou disparaît compte comme
 * un changement.
 */
export function explainerContentChanged(before: unknown, after: unknown): boolean {
  return stableStringify(before ?? null) !== stableStringify(after ?? null);
}

/**
 * Lit et résout la date associée à `slug` dans le texte source de
 * src/lib/explainer-dates.ts (avant OU après — même fonction pour les deux
 * révisions). Résout le symbole `SITE_LAUNCH_DATE` vers sa valeur littérale
 * trouvée dans le même texte, pour que deux entrées valant toutes deux
 * `SITE_LAUNCH_DATE` comparent égales même si la constante elle-même a changé.
 *
 * Renvoie null si l'entrée est absente ou illisible (échec fermé : appelant
 * doit traiter null comme "date inconnue", jamais deviner).
 */
export function readExplainerDateExpr(source: string, slug: string): string | null {
  const escaped = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const entryRe = new RegExp(`^\\s*(?:'${escaped}'|${escaped}):\\s*([^,\\n]+?),?\\s*$`, 'm');
  const entryMatch = entryRe.exec(source);
  if (!entryMatch) return null;
  const raw = entryMatch[1].trim();

  if (raw === 'SITE_LAUNCH_DATE') {
    const launchRe = /SITE_LAUNCH_DATE\s*=\s*'(\d{4}-\d{2}-\d{2})'/;
    const launchMatch = launchRe.exec(source);
    return launchMatch ? launchMatch[1] : null;
  }

  const literalMatch = /^'(\d{4}-\d{2}-\d{2})'$/.exec(raw);
  return literalMatch ? literalMatch[1] : null;
}

/**
 * Numéro de ligne (1-based) de l'entrée `slug` dans le texte source de
 * src/lib/explainer-dates.ts, pour que le message d'erreur pointe dessus
 * directement plutôt que de laisser chercher.
 */
export function findExplainerDateLine(source: string, slug: string): number | null {
  const escaped = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const entryRe = new RegExp(`^\\s*(?:'${escaped}'|${escaped}):\\s*([^,\\n]+?),?\\s*$`);
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (entryRe.test(lines[i])) return i + 1;
  }
  return null;
}

export interface ExplainerDateCheckInput {
  /** Slug de la route, ex. "brussels-overview". */
  slug: string;
  /** Clé i18n, ex. "brusselsOverview" (pour le message d'erreur). */
  key: string;
  contentChanged: boolean;
  dateBefore: string | null;
  dateAfter: string | null;
}

/** Message d'erreur, ou null si l'entrée est en règle. */
export function explainerMessagesDateProblem(input: ExplainerDateCheckInput): string | null {
  const { slug, key, contentChanged, dateBefore, dateAfter } = input;
  if (!contentChanged) return null;

  if (dateAfter === null) {
    return (
      `explainers.${key} (page "${slug}") modifiée, mais EXPLAINER_LAST_MODIFIED['${slug}'] ` +
      `est illisible dans src/lib/explainer-dates.ts (entrée absente ou date mal formée).`
    );
  }
  if (!ISO_DATE.test(dateAfter)) {
    return `EXPLAINER_LAST_MODIFIED['${slug}'] résout vers "${dateAfter}", format attendu AAAA-MM-JJ.`;
  }
  if (dateAfter === dateBefore) {
    return (
      `explainers.${key} (page "${slug}") modifiée dans messages/*.json, mais ` +
      `EXPLAINER_LAST_MODIFIED['${slug}'] est resté à ${dateAfter} dans src/lib/explainer-dates.ts.`
    );
  }
  if (dateBefore !== null && ISO_DATE.test(dateBefore) && dateAfter < dateBefore) {
    return `EXPLAINER_LAST_MODIFIED['${slug}'] recule : ${dateBefore} → ${dateAfter}.`;
  }
  return null;
}
