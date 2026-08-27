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
  /**
   * La fiche n'a pas pu être lue — quota, panne, chemin refusé. À afficher :
   * « résumé illisible » n'est PAS « aucun résumé », et les confondre rend un
   * panneau de relecture silencieusement vide indiscernable d'une veille sans
   * résumé.
   */
  unreadable: boolean;
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
 * Mois écrits, dans les quatre langues du site. Sert à écarter les dates en
 * toutes lettres, dont le quantième et l'année sont du bruit exactement comme
 * ceux d'une date ISO.
 */
const MONTHS = [
  'janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre',
  'januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december',
  'january|february|march|may|june|july|august|october',
  'januar|februar|märz|marz|mai|juni|juli|august|oktober|dezember',
].join('|');

/** « 26 août 2026 », « 1er septembre 2026 », « 15 juni 2026 », « August 2026 ». */
const DATED_YEAR = new RegExp(
  String.raw`\b(?:\d{1,2}(?:er|e|ste|de|th|st|nd|rd|\.)?\s+)?(?:${MONTHS})\s+\d{4}`,
  'gi',
);

/**
 * « le 29 juillet », « op 25 augustus » : même bruit, sans l'année. Fréquent
 * dans le corps des fiches, où l'année est portée par le titre de section.
 */
const DATED_NO_YEAR = new RegExp(
  String.raw`\b\d{1,2}(?:er|e|ste|de|th|st|nd|rd|\.)?\s+(?:${MONTHS})\b`,
  'gi',
);

/** Heure d'horloge : « vers 15h20 », « om 18u10 ». */
const CLOCK_TIME = /\b\d{1,2}\s?[hu]\s?\d{2}\b/gi;

/**
 * Relève les nombres éditoriaux : entiers, décimaux, et nombres à
 * séparateur de milliers. Sont écartés, dans cet ordre :
 *
 *  - les **URL**, parce qu'un identifiant d'article y ressemble à un nombre.
 *    Constaté sur la veille du 2026-08-27, où le panneau annonçait
 *    « 11764332 » et « 11773596 » comme chiffres nouveaux : c'étaient les
 *    identifiants RTBF de deux articles cités en source. Un panneau de
 *    relecture qui affiche ce genre de jeton apprend à ne plus le lire, ce
 *    qui est pire que de ne rien afficher ;
 *  - les **dates ISO**, qui changent à chaque veille sans rien apprendre ;
 *  - les **dates en toutes lettres**, pour la même raison : « le 26 août
 *    2026 » produisait « 26 » et « 2026 » à chaque fiche touchée.
 *
 * Une année citée seule reste relevée : « En 2024, 12 communes » porte une
 * information éditoriale, contrairement au quantième d'une date de publication.
 */
export function extractNumbers(text: string): string[] {
  const withoutUrls = text
    // Cible d'un lien markdown, y compris quand le libellé contient un chiffre.
    .replace(/\]\([^)\s]*\)/g, ' ')
    // URL nue, en frontmatter (`url: "https://…"`) comme en prose.
    .replace(/\bhttps?:\/\/\S+/gi, ' ');
  const withoutIsoDates = withoutUrls
    .replace(/\d{4}-\d{2}-\d{2}/g, ' ')
    .replace(DATED_YEAR, ' ')
    .replace(DATED_NO_YEAR, ' ')
    .replace(CLOCK_TIME, ' ');
  // Trois formes coexistent dans le contenu réel, et deux versions
  // antérieures de cette fonction en cassaient une :
  //   - milliers séparés par une espace : « 1 250 000 » reste un seul jeton ;
  //   - décimale à la virgule : « 7,4 % », « +60,9 % » — la virgule fait
  //     partie du nombre **seulement** si un chiffre la suit immédiatement ;
  //   - énumération : « En 2024, 12 communes » — virgule suivie d'une espace,
  //     donc deux jetons, jamais « 2024, 12 » soudé.
  // Sans la décimale, un passage de « 3,1 % » à « 1,3 % » ne signalait AUCUN
  // chiffre nouveau : une fausse assurance, exactement ce que ce panneau doit
  // éviter.
  const found = withoutIsoDates.match(/\d+(?: \d{3})*(?:,\d+)?/g) ?? [];
  // Dédoublonné en conservant l'ordre d'apparition : un panneau de relecture
  // qui annonce « 26, 26, 26, 26 » ne dit rien de plus que « 26 », et noie les
  // jetons voisins qui, eux, méritaient un regard.
  return [...new Set(found.filter((n) => n.length > 0))];
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
      // `readFileAtRef` rend `null` sur 404 — cas nominal d'une fiche créée
      // par la veille, qui n'a pas d'état antérieur — et LÈVE sur tout autre
      // échec. On remonte le drapeau par fiche plutôt que de laisser une
      // panne se lire comme un silence éditorial.
      let oldMdx: string | null;
      let newMdx: string | null;
      try {
        [oldMdx, newMdx] = await Promise.all([
          readFileAtRef(path, baseSha),
          readFileAtRef(path, headSha),
        ]);
      } catch {
        return {
          path,
          label: labelFor(path),
          before: null,
          after: null,
          numbers: [],
          unreadable: true,
        };
      }

      const oldNumbers = new Set(oldMdx ? extractNumbers(oldMdx) : []);
      const newNumbers = newMdx ? extractNumbers(newMdx) : [];

      return {
        path,
        label: labelFor(path),
        before: oldMdx ? extractSummary(oldMdx) : null,
        after: newMdx ? extractSummary(newMdx) : null,
        numbers: newNumbers.filter((n) => !oldNumbers.has(n)),
        unreadable: false,
      };
    }),
  );

  return changes;
}
