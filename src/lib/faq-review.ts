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

import { readGuardFrontmatter } from './frontmatter';

export type FaqReviewVerdict = 'ok' | 'stale' | 'missing' | 'unparsable' | 'future';

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
 * Une date d'attestation postérieure à demain est une erreur de saisie ou une
 * relecture promise, pas faite. Un jour de marge : la CI tourne en UTC, et
 * entre 22 h et minuit à Bruxelles, la date locale a déjà un jour d'avance.
 */
export function isFuture(dateMs: number, today?: string): boolean {
  const base = today ? parseISODate(today) : Date.parse(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
  if (base === null || Number.isNaN(base)) return false;
  return dateMs > base + 86_400_000;
}

/**
 * Compare la date de relecture de la FAQ à la `lastModified` de la fiche. La
 * relecture doit être le jour même de la republication ou après.
 */
export function checkFaqReview(params: {
  lastModified: string | undefined;
  faqReviewed: string | undefined;
  /** Date du jour AAAA-MM-JJ, injectable pour les tests. Défaut : aujourd'hui en UTC. */
  today?: string;
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

  if (isFuture(reviewed, params.today)) {
    return {
      verdict: 'future',
      reason: `faqReviewed dans le futur (${params.faqReviewed}). La date atteste une relecture faite : poser la date du jour.`,
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

/**
 * Questions du bloc `faq:` du frontmatter, dans leur ordre, lues par un vrai
 * parseur YAML (voir `readGuardFrontmatter`) : une question en bloc `>-` ou
 * une clé dupliquée ne passent plus inaperçues. Ne lit jamais le corps MDX.
 * Lève `FrontmatterError` sur un frontmatter invalide.
 */
export function extractFaqQuestions(fileContent: string): string[] {
  const data = readGuardFrontmatter(fileContent);
  const faq = data?.faq;
  if (!Array.isArray(faq)) return [];
  const questions: string[] = [];
  for (const entry of faq) {
    const q = entry && typeof entry === 'object' ? (entry as Record<string, unknown>).q : undefined;
    if (typeof q === 'string' && q.trim()) questions.push(q.trim());
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
  /** Nombre d'occurrences : plus que de fiches quand une fiche la répète. */
  count: number;
}

/**
 * Questions posées deux fois dans une même langue : par deux fiches, ou deux
 * fois par la même fiche (le JSON-LD FAQPage répéterait alors la question).
 */
export function findQuestionCollisions(cards: CardQuestions[]): QuestionCollision[] {
  const byKey = new Map<string, { question: string; locale: string; key: string; slugs: Set<string>; count: number }>();
  for (const card of cards) {
    for (const question of card.questions) {
      const key = normalizeQuestion(question);
      const mapKey = `${card.locale}\u0000${key}`;
      const entry = byKey.get(mapKey) ?? { question, locale: card.locale, key, slugs: new Set<string>(), count: 0 };
      entry.slugs.add(card.slug);
      entry.count++;
      byKey.set(mapKey, entry);
    }
  }
  return [...byKey.values()]
    .filter((e) => e.count > 1)
    .map((e) => ({ locale: e.locale, key: e.key, question: e.question, slugs: [...e.slugs].sort(), count: e.count }))
    .sort((a, b) => a.locale.localeCompare(b.locale) || a.key.localeCompare(b.key));
}
