// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Relecture et unicité des FAQ des fiches domaines et dossiers.
 *
 * Deux gardes, une seule cause : la FAQ d'une fiche vieillissait sans que rien
 * ne demande de la relire. Mesuré le 2026-09-11 sur les douze veilles
 * précédentes : 35 fiches à FAQ republiées, FAQ touchée deux fois. Le
 * 2026-09-10, la FAQ LEZ de `mobility` présentait le pass annuel comme acquis le
 * jour même où le corps de la fiche annonçait son renvoi en préparation.
 *
 * 1. Relecture. Toute fiche domaine ou dossier republiée porte `faqReviewed`,
 *    supérieur ou égal à sa `lastModified`, qu'elle ait une FAQ ou non. Sans
 *    FAQ, la date enregistre la décision « relu, rien à écrire » : sur la même
 *    période, 77 des 112 fiches republiées n'avaient pas de FAQ, et une règle
 *    limitée aux fiches qui en ont une n'aurait vu que la minorité.
 *    Pas de tolérance en jours, contrairement au chapeau : une contradiction le
 *    jour même est précisément la panne observée.
 *
 * 2. Unicité. Une question, une seule fiche, par langue. Calculée depuis le
 *    contenu à chaque passage, sans registre tenu à la main : celui de juin
 *    comptait 5 entrées pour 117 questions trois mois plus tard. Aucun artefact
 *    n'est écrit, car un fichier `data/` hors liste blanche rendrait les veilles
 *    infusionnables depuis `/fr/admin` (vérifié avec `isMergeableFileSet`).
 *
 * Ce module ne contient que la logique, sans accès disque, pour rester testable
 * sans tirer le runtime Next.js.
 */

export type FaqReviewVerdict = 'ok' | 'stale' | 'missing' | 'unparsable';

export interface FaqReview {
  verdict: FaqReviewVerdict;
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
 * Compare la date de relecture de la FAQ à la `lastModified` de la fiche. La
 * relecture doit être le jour même de la republication ou après.
 */
export function checkFaqReview(params: {
  lastModified: string | undefined;
  faqReviewed: string | undefined;
}): FaqReview {
  if (!params.faqReviewed) {
    return {
      verdict: 'missing',
      reason:
        "faqReviewed absent. Relire la FAQ (ou décider qu'il n'en faut pas), puis ajouter faqReviewed avec la date du jour.",
    };
  }

  const reviewed = parseISODate(params.faqReviewed);
  if (reviewed === null) {
    return {
      verdict: 'unparsable',
      reason: `faqReviewed illisible (${params.faqReviewed}), format attendu AAAA-MM-JJ.`,
    };
  }

  // Sans lastModified, le check lastModified de la CI a déjà échoué : ne pas
  // empiler un second message sur la même cause.
  if (!params.lastModified) return { verdict: 'ok', reason: '' };

  const modified = parseISODate(params.lastModified);
  if (modified === null) {
    return {
      verdict: 'unparsable',
      reason: `lastModified illisible (${params.lastModified}), format attendu AAAA-MM-JJ.`,
    };
  }

  if (reviewed < modified) {
    return {
      verdict: 'stale',
      reason: `FAQ relue le ${params.faqReviewed}, fiche republiée le ${params.lastModified}. Relire la FAQ contre le corps de la fiche, puis passer faqReviewed à la date du jour.`,
    };
  }

  return { verdict: 'ok', reason: '' };
}

/**
 * Clé de comparaison d'une question : minuscules, sans accents, apostrophes
 * typographiques ramenées à l'apostrophe droite, ponctuation et espaces
 * multiples écrasés. Deux formulations qui ne diffèrent que par la typographie
 * visent la même requête et doivent entrer en collision.
 */
export function normalizeQuestion(question: string): string {
  return question
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function unquote(value: string): string {
  const v = value.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

/**
 * Lit les questions du bloc `faq:` du frontmatter, dans leur ordre, sans
 * dépendance de parsing YAML. Ne lit jamais au-delà du frontmatter : le corps
 * MDX peut contenir le motif « q: ».
 */
export function extractFaqQuestions(fileContent: string): string[] {
  const lines = fileContent.split('\n');
  if (lines[0]?.trim() !== '---') return [];

  const questions: string[] = [];
  let inFaq = false;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.trim() === '---') break;

    // Une clé de premier niveau ouvre ou ferme le bloc.
    const topLevel = line.match(/^([A-Za-z][A-Za-z0-9_]*):/);
    if (topLevel) {
      inFaq = topLevel[1] === 'faq';
      continue;
    }
    if (!inFaq) continue;

    const q = line.match(/^\s*-\s+q:\s*(.+)$/);
    if (q) questions.push(unquote(q[1]!));
  }
  return questions;
}

export interface CardQuestions {
  slug: string;
  locale: string;
  questions: string[];
}

export interface QuestionCollision {
  locale: string;
  /** Clé normalisée commune. */
  key: string;
  /** Première formulation rencontrée, pour l'affichage. */
  question: string;
  /** Fiches qui portent la question, triées. */
  slugs: string[];
}

/** Questions portées par au moins deux fiches différentes dans une même langue. */
export function findQuestionCollisions(cards: CardQuestions[]): QuestionCollision[] {
  const byKey = new Map<string, { question: string; locale: string; key: string; slugs: Set<string> }>();
  for (const card of cards) {
    for (const question of card.questions) {
      const key = normalizeQuestion(question);
      const mapKey = `${card.locale}\u0000${key}`;
      const entry = byKey.get(mapKey) ?? { question, locale: card.locale, key, slugs: new Set<string>() };
      entry.slugs.add(card.slug);
      byKey.set(mapKey, entry);
    }
  }
  return [...byKey.values()]
    .filter((e) => e.slugs.size > 1)
    .map((e) => ({ locale: e.locale, key: e.key, question: e.question, slugs: [...e.slugs].sort() }))
    .sort((a, b) => a.locale.localeCompare(b.locale) || a.key.localeCompare(b.key));
}
