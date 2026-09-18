// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

// Statut courant d'un engagement DPR = dernière entrée de son statusHistory.
// Un seul endroit pour ce calcul : le titre de la page d'accueil et le baromètre
// doivent dire le même chiffre, toujours.
//
// Fichier distinct de `commitments.ts`, qui porte déjà le schéma Zod et l'API typée
// de data/commitments.json (PR #205) : ne pas fusionner les deux.

export const COMMITMENT_STATUSES = [
  'implemented',
  'in-legislation',
  'announced',
  'not-started',
  'delayed',
  'abandoned',
] as const;

export type CommitmentStatus = (typeof COMMITMENT_STATUSES)[number];

export interface CommitmentLike {
  id: string;
  target: { fr: string };
  statusHistory: { status: string }[];
}

export function currentStatus(commitment: CommitmentLike): CommitmentStatus {
  const last = commitment.statusHistory[commitment.statusHistory.length - 1]?.status;
  return COMMITMENT_STATUSES.includes(last as CommitmentStatus)
    ? (last as CommitmentStatus)
    : 'not-started';
}

export function countByStatus(commitments: CommitmentLike[]): Record<CommitmentStatus, number> {
  const counts = Object.fromEntries(COMMITMENT_STATUSES.map((s) => [s, 0])) as Record<
    CommitmentStatus,
    number
  >;
  for (const c of commitments) counts[currentStatus(c)] += 1;
  return counts;
}

