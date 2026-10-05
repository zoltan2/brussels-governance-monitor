// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Encadrés « Pourquoi ce statut » et « Ce que ça signifie concrètement » des
 * pages domaine.
 *
 * Jusqu'au 5 octobre 2026, ces deux textes vivaient dans `messages/*.json`
 * (`domains.whyStatus`, `domains.concreteImpact`), hors du circuit éditorial :
 * aucune veille ne les relisait. Ce jour-là, la page budget annonçait encore,
 * sous une fiche datée du jour, un vote en plénière « prévu avant le 1er
 * avril » ; les treize domaines dataient de février-mars, dix se terminant par
 * « dépend du budget 2026 », et l'encadré climat promettait le maintien de
 * primes que le titre de la fiche disait remplacées.
 *
 * Les textes passent donc dans la fiche (`whyStatus`, `concreteImpact`), où une
 * veille les met à jour comme le chapeau, avec leur attestation
 * `statusReviewed`. La règle est celle de la FAQ : relus à CHAQUE
 * republication, parce qu'ils disent l'état présent du domaine. Les messages
 * restent le repli des fiches pas encore migrées.
 *
 * Module pur, sans accès disque.
 */

export type StatusBoxesVerdict = 'ok' | 'legacy' | 'draft' | 'incomplete' | 'missing' | 'unparsable' | 'stale';

export interface StatusBoxesCheck {
  verdict: StatusBoxesVerdict;
  reason: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Texte de la fiche s'il existe, sinon celui des messages. */
export function pickStatusBox(fromCard: string | undefined, fromMessages: string): string {
  const text = fromCard?.trim();
  return text ? text : fromMessages;
}

export function checkStatusBoxes(params: {
  whyStatus?: string;
  concreteImpact?: string;
  lastModified: string | undefined;
  statusReviewed: string | undefined;
  draft?: boolean;
}): StatusBoxesCheck {
  const why = Boolean(params.whyStatus?.trim());
  const impact = Boolean(params.concreteImpact?.trim());

  if (!why && !impact) {
    return {
      verdict: 'legacy',
      reason:
        "encadrés encore dans messages/*.json : aucune veille ne les relit. Les écrire dans la fiche (whyStatus, concreteImpact, statusReviewed).",
    };
  }
  if (params.draft) {
    return { verdict: 'draft', reason: 'brouillon : attestations exigées à la publication.' };
  }
  if (why !== impact) {
    return {
      verdict: 'incomplete',
      reason: `${why ? 'concreteImpact' : 'whyStatus'} absent : la page afficherait un encadré de la fiche et l'autre des messages. Écrire les deux.`,
    };
  }
  if (!params.statusReviewed) {
    return {
      verdict: 'missing',
      reason: 'statusReviewed absent. Relire whyStatus et concreteImpact, puis ajouter statusReviewed avec la date du jour.',
    };
  }
  if (!ISO_DATE.test(params.statusReviewed) || !params.lastModified || !ISO_DATE.test(params.lastModified)) {
    return {
      verdict: 'unparsable',
      reason: `statusReviewed ou lastModified illisible (${params.statusReviewed} / ${params.lastModified}), format attendu AAAA-MM-JJ.`,
    };
  }
  if (params.statusReviewed < params.lastModified) {
    return {
      verdict: 'stale',
      reason:
        `encadrés relus le ${params.statusReviewed}, fiche republiée le ${params.lastModified}. Relire whyStatus et concreteImpact ` +
        'à la lumière de ce qui vient de changer, puis passer statusReviewed à la date du jour.',
    };
  }
  return { verdict: 'ok', reason: 'encadrés relus à la republication.' };
}
