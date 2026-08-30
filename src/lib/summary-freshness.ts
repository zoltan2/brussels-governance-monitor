// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Fraîcheur du `summary` des fiches domaines et dossiers.
 *
 * Le `summary` est le chapeau permanent d'une fiche : il répond à « de quoi
 * parle cette fiche aujourd'hui », alors que `changeSummary` répond à « qu'est-ce
 * qui a changé cette semaine ». Le second est réécrit à chaque veille, le
 * premier ne l'était jamais, parce que rien ne le demandait.
 *
 * Constat du 2026-08-30 : le `summary` de `security` datait du 19 avril, soit
 * 133 jours avant sa `lastModified`. Douze des treize fiches domaines étaient
 * dans le même cas, médiane à 154 jours. Un `summary` périmé ne salit pas
 * seulement le chapeau : il alimente la meta description, le JSON-LD `Article`,
 * le bouton Partager, la carte de la liste des domaines, le prompt système du
 * chatbot, l'API publique `/api/v1/cards`, et sert de repli au digest quand
 * `changeSummary` manque. Huit surfaces, dont deux où une phrase périmée devient
 * une affirmation fausse.
 *
 * La date de dernière relecture ne peut pas être devinée : `git log -L` sur le
 * bloc `summary:` exige l'historique complet, coûte cher en CI et casse au
 * moindre reformatage. On la rend donc explicite dans le frontmatter, comme le
 * fait déjà `changeSummaryDate` à côté de `changeSummary`.
 *
 * Ce module ne contient que l'arithmétique, sans accès disque, pour être
 * testable sans tirer le runtime Next.js (voir la mémoire sur les tests qui
 * importent `@/auth` et n'exécutent alors aucun test).
 */

/** Au-delà de cet âge, un chapeau doit être relu avant d'être republié. */
export const SUMMARY_MAX_AGE_DAYS = 90;

export type SummaryVerdict = 'ok' | 'stale' | 'missing' | 'unparsable';

export interface SummaryFreshness {
  verdict: SummaryVerdict;
  /** Âge en jours du chapeau à la date de `lastModified`. Null si incalculable. */
  ageDays: number | null;
  /** Message prêt à afficher en CI, vide quand le verdict est `ok`. */
  reason: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseISODate(value: string): number | null {
  if (!ISO_DATE.test(value)) return null;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Compare la date de dernière relecture du chapeau à la `lastModified` de la
 * fiche. On mesure contre `lastModified` et non contre aujourd'hui : une fiche
 * qui dort depuis un an n'a pas de dette, seule celle qu'on republie en a une.
 */
export function checkSummaryFreshness(params: {
  lastModified: string | undefined;
  summaryReviewed: string | undefined;
  maxAgeDays?: number;
}): SummaryFreshness {
  const maxAge = params.maxAgeDays ?? SUMMARY_MAX_AGE_DAYS;

  if (!params.summaryReviewed) {
    return {
      verdict: 'missing',
      ageDays: null,
      reason:
        'summaryReviewed absent. Relire le champ summary, puis ajouter summaryReviewed avec la date du jour.',
    };
  }

  const reviewed = parseISODate(params.summaryReviewed);
  if (reviewed === null) {
    return {
      verdict: 'unparsable',
      ageDays: null,
      reason: `summaryReviewed illisible (${params.summaryReviewed}), format attendu AAAA-MM-JJ.`,
    };
  }

  // Sans lastModified, le check lastModified de la CI a déjà échoué : ne pas
  // empiler un second message sur la même cause.
  if (!params.lastModified) {
    return { verdict: 'ok', ageDays: null, reason: '' };
  }

  const modified = parseISODate(params.lastModified);
  if (modified === null) {
    return {
      verdict: 'unparsable',
      ageDays: null,
      reason: `lastModified illisible (${params.lastModified}), format attendu AAAA-MM-JJ.`,
    };
  }

  // Un chapeau peut être relu sans que la fiche soit republiée : la relecture
  // est alors postérieure à `lastModified` et l'écart devient négatif. C'est le
  // cas sain, pas une anomalie, notamment lors d'une reprise éditoriale de fond
  // qui ne touche pas au corps des fiches. On ramène donc à zéro.
  const ageDays = Math.max(0, Math.floor((modified - reviewed) / 86_400_000));

  if (ageDays > maxAge) {
    return {
      verdict: 'stale',
      ageDays,
      reason: `chapeau relu il y a ${ageDays} jours (limite ${maxAge}). Relire summary, puis passer summaryReviewed à la date du jour.`,
    };
  }

  return { verdict: 'ok', ageDays, reason: '' };
}

/** Extrait une clé scalaire du frontmatter YAML, sans dépendance de parsing. */
export function readFrontmatterScalar(fileContent: string, key: string): string | undefined {
  const lines = fileContent.split('\n');
  if (lines[0]?.trim() !== '---') return undefined;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.trim() === '---') break;
    // Clé de premier niveau uniquement : une clé indentée appartient à un bloc
    // imbriqué (sources, metrics, faq) et n'est pas celle qu'on cherche.
    const match = line.match(/^([A-Za-z][A-Za-z0-9_]*):\s*(.*)$/);
    if (!match || match[1] !== key) continue;
    return match[2]!.trim().replace(/^["']|["']$/g, '');
  }
  return undefined;
}
