// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { DatabaseSync } from 'node:sqlite';

/**
 * Plafond de dépense quotidien du chatbot.
 *
 * Décision de Zoltán du 29/09/2026 : 2 euros par jour au plus. Il n'existait
 * aucun plafond global, seulement des quotas par adresse IP gardés en mémoire
 * et remis à zéro à chaque déploiement (revues blue et red du 29/09).
 *
 * Le plafond est tenu en DOLLARS (la facture Anthropic l'est) : 2 USD par
 * défaut, soit moins de 2 EUR tant que le dollar vaut moins que l'euro.
 * Réglable par CHAT_DAILY_BUDGET_USD.
 *
 * Tarif de claude-sonnet-4-5, relevé le 29/09/2026 sur
 * https://platform.claude.com/docs/en/about-claude/pricing (USD par million de
 * jetons) : entrée 3, écriture de cache 5 minutes 3,75, lecture de cache 0,30,
 * sortie 15. À mettre à jour si le modèle change (test de verrou).
 */
export const MODELE_CHAT = 'claude-sonnet-4-5';

export const TARIF_USD_PAR_MTOK = {
  entree: 3,
  ecritureCache: 3.75,
  lectureCache: 0.3,
  sortie: 15,
} as const;

export const PLAFOND_JOUR_USD_DEFAUT = 2;

export interface UsageModele {
  input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  output_tokens?: number | null;
}

/** Coût d'une réponse, en millionièmes de dollar (entier, arrondi au-dessus). */
export function coutMicroUsd(u: UsageModele): number {
  const t = TARIF_USD_PAR_MTOK;
  // jetons × USD/MTok = millionièmes de dollar.
  const micro =
    (u.input_tokens ?? 0) * t.entree +
    (u.cache_creation_input_tokens ?? 0) * t.ecritureCache +
    (u.cache_read_input_tokens ?? 0) * t.lectureCache +
    (u.output_tokens ?? 0) * t.sortie;
  return Math.ceil(micro);
}

/** Jour de Bruxelles (AAAA-MM-JJ) : le plafond se remet à zéro à minuit, heure belge. */
export function jourBruxelles(maintenant: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Brussels',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(maintenant);
}

export function plafondJourMicroUsd(): number {
  const brut = Number(process.env.CHAT_DAILY_BUDGET_USD);
  const usd = Number.isFinite(brut) && brut > 0 ? brut : PLAFOND_JOUR_USD_DEFAUT;
  return Math.round(usd * 1_000_000);
}

export function depenseDuJour(db: DatabaseSync, jour: string): number {
  const r = db.prepare('SELECT micro_usd FROM chat_budget WHERE jour = ?').get(jour) as
    | { micro_usd: number }
    | undefined;
  return r ? Number(r.micro_usd) : 0;
}

export function ajouterDepense(db: DatabaseSync, jour: string, microUsd: number): void {
  if (microUsd <= 0) return;
  db.prepare(
    `INSERT INTO chat_budget (jour, micro_usd) VALUES (?, ?)
     ON CONFLICT(jour) DO UPDATE SET micro_usd = micro_usd + excluded.micro_usd`,
  ).run(jour, microUsd);
}

/** Vrai quand la dépense du jour atteint le plafond : plus aucun appel au modèle. */
export function budgetAtteint(db: DatabaseSync, jour: string, plafondMicro = plafondJourMicroUsd()): boolean {
  return depenseDuJour(db, jour) >= plafondMicro;
}
