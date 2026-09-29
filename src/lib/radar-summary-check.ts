// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * `summary` obligatoire, dans les quatre langues, sur tout NOUVEAU signal du radar.
 *
 * L'accueil affiche `summary` sous chaque signal. Sans lui, il se replie sur la
 * première phrase de `descriptions`, coupée au premier point
 * (src/app/[locale]/page.tsx, getHomepageBlurb) : rejoué sur les vraies données
 * le 28/09/2026 (revue yellow), ce repli donne « Hub. », « Visit. », et en
 * allemand « Am 14. », « Bilanz 44. », 26 blurbs allemands de moins de 45
 * caractères. Aucun ne s'affiche aujourd'hui, parce que les trois signaux du
 * jour ont un résumé ; rien ne l'exigeait.
 *
 * Bornes : 20 caractères au moins (en dessous, c'est le repli qu'on veut
 * éviter), 180 au plus, le plafond au-delà duquel l'accueil coupe le résumé et
 * ajoute « … » (HOMEPAGE_SIGNAL_MAX_CHARS de la page, verrouillé par le test).
 *
 * Seuls les signaux AJOUTÉS (id absent de la base) sont vérifiés : les 114
 * signaux anciens sans résumé ne bloquent aucune veille.
 *
 * Module pur, sans accès disque.
 */

export const RADAR_SUMMARY_MIN = 20;
/** Égal à HOMEPAGE_SIGNAL_MAX_CHARS dans src/app/[locale]/page.tsx (test de verrou). */
export const RADAR_SUMMARY_MAX = 180;

const LOCALES = ['fr', 'nl', 'en', 'de'] as const;

export interface RadarSummaryEntry {
  id: string;
  summary?: Partial<Record<(typeof LOCALES)[number], unknown>>;
}

/** Problèmes du `summary` d'un signal, un par langue fautive. [] si en règle. */
export function radarSummaryProblems(entry: RadarSummaryEntry): string[] {
  if (!entry.summary || typeof entry.summary !== 'object') {
    return [
      `summary absent : l'accueil se rabattrait sur la première phrase de descriptions, coupée au premier point ` +
        `(« Am 14. »). Ajouter summary en fr, nl, en et de, de ${RADAR_SUMMARY_MIN} à ${RADAR_SUMMARY_MAX} caractères.`,
    ];
  }
  const out: string[] = [];
  for (const l of LOCALES) {
    const v = entry.summary[l];
    const text = typeof v === 'string' ? v : '';
    const n = text.trim().length;
    if (n === 0) out.push(`summary.${l} absent ou vide.`);
    else if (n < RADAR_SUMMARY_MIN) out.push(`summary.${l} trop court (${n} caractères, minimum ${RADAR_SUMMARY_MIN}).`);
    else if (text.length > RADAR_SUMMARY_MAX)
      out.push(`summary.${l} trop long (${text.length} caractères, maximum ${RADAR_SUMMARY_MAX}) : l'accueil le couperait avec « … ».`);
  }
  return out;
}

/** Signaux dont l'id n'existe pas à la base (null = pas de fichier à la base : tous). */
export function addedRadarEntries<T extends { id: string }>(base: readonly { id: string }[] | null, head: readonly T[]): T[] {
  const known = new Set((base ?? []).map((e) => e.id));
  return head.filter((e) => !known.has(e.id));
}
