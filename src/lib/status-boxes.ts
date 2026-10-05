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
 * republication, parce qu'ils disent l'état présent du domaine. Depuis la
 * migration des treize domaines (5 octobre 2026), il n'y a plus de repli : une
 * fiche domaine sans encadrés est refusée, et messages/*.json ne garde que les
 * titres des deux encadrés.
 *
 * Module pur, sans accès disque.
 */

export type StatusBoxesVerdict = 'ok' | 'draft' | 'absent' | 'incomplete' | 'missing' | 'unparsable' | 'stale';

export interface StatusBoxesCheck {
  verdict: StatusBoxesVerdict;
  reason: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function checkStatusBoxes(params: {
  whyStatus?: string;
  concreteImpact?: string;
  lastModified: string | undefined;
  statusReviewed: string | undefined;
  draft?: boolean;
}): StatusBoxesCheck {
  const why = Boolean(params.whyStatus?.trim());
  const impact = Boolean(params.concreteImpact?.trim());

  if (params.draft) {
    return { verdict: 'draft', reason: 'brouillon : attestations exigées à la publication.' };
  }
  if (!why && !impact) {
    return {
      verdict: 'absent',
      reason:
        'whyStatus et concreteImpact absents : la page du domaine ne dirait plus pourquoi ce statut ni ce que cela change. ' +
        'Les écrire dans la fiche, avec statusReviewed à la date du jour.',
    };
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
