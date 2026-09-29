// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { DatabaseSync } from 'node:sqlite';

/**
 * Registre des paiements du chatbot.
 *
 * Revue red team du 29/09/2026 : le lien de retour de paiement
 * (`/api/chat/unlock?session_id=`) restait réutilisable par quiconque le
 * recevait, et l'accès survivait à un remboursement. Désormais :
 *   - une session Stripe n'ouvre l'accès qu'une seule fois ;
 *   - une session remboursée n'ouvre rien ;
 *   - un accès payant déjà ouvert est revérifié auprès de Stripe au plus une
 *     fois par jour, et révoqué si le paiement a été remboursé.
 */

export const REVERIFICATION_MS = 24 * 60 * 60 * 1000;

/** Enregistre le déblocage. Rend `false` si la session a déjà servi. */
export function enregistrerDeblocage(db: DatabaseSync, sessionId: string, maintenant: number): boolean {
  const res = db
    .prepare(
      'INSERT OR IGNORE INTO chat_paiements (session_id, debloque_le, verifie_le) VALUES (?, ?, ?)',
    )
    .run(sessionId, maintenant, maintenant);
  return Number(res.changes) === 1;
}

export interface EtatPaiement {
  rembourse: boolean;
  aReverifier: boolean;
}

/** État connu d'une session ; `null` si elle n'est pas au registre. */
export function etatPaiement(db: DatabaseSync, sessionId: string, maintenant: number): EtatPaiement | null {
  const r = db
    .prepare('SELECT verifie_le, rembourse FROM chat_paiements WHERE session_id = ?')
    .get(sessionId) as { verifie_le: number; rembourse: number } | undefined;
  if (!r) return null;
  return {
    rembourse: Number(r.rembourse) === 1,
    aReverifier: maintenant - Number(r.verifie_le) >= REVERIFICATION_MS,
  };
}

export function noterVerification(db: DatabaseSync, sessionId: string, maintenant: number, rembourse: boolean): void {
  db.prepare('UPDATE chat_paiements SET verifie_le = ?, rembourse = ? WHERE session_id = ?').run(
    maintenant,
    rembourse ? 1 : 0,
    sessionId,
  );
}

/**
 * Lecture Stripe : vrai si le paiement de la session a été remboursé, même en
 * partie. Forme minimale de l'objet renvoyé par
 * `checkout.sessions.retrieve(id, { expand: ['payment_intent.latest_charge'] })`.
 */
export function sessionRemboursee(session: {
  payment_intent?: unknown;
}): boolean {
  const pi = session.payment_intent;
  if (!pi || typeof pi !== 'object') return false;
  const charge = (pi as { latest_charge?: unknown }).latest_charge;
  if (!charge || typeof charge !== 'object') return false;
  const c = charge as { refunded?: boolean; amount_refunded?: number };
  return c.refunded === true || (c.amount_refunded ?? 0) > 0;
}
