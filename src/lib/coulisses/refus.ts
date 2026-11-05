// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Refus et reprises des coulisses, datés (5 novembre 2026). Sans eux, un refus
 * n'écrivait que `mot_mensuel = non` chez Resend : on ne voyait le cumul qu'à
 * l'envoi suivant, sans savoir s'il suivait un numéro ou venait plus tard.
 * Servira l'historique des envois (rattachement au dernier mail reçu dans les
 * 30 jours).
 *
 * Ce qu'on garde : empreinte de l'adresse (HMAC, desabonnements.ts), sens,
 * source, date. Jamais l'adresse. Effacé après 24 mois.
 *
 * On ne note qu'un CHANGEMENT, d'après le dernier choix connu ici :
 * - un refus, sauf si le dernier choix noté est déjà un refus (un client mail
 *   qui rejoue le POST, une page de préférences enregistrée deux fois) ;
 * - une reprise, seulement après un refus noté (la page de préférences envoie
 *   la case cochée à chaque enregistrement, même sans changement).
 * Limite assumée : un refus antérieur au 5/11/2026 n'est pas connu ici ; une
 * personne déjà en refus qui réenregistre ses préférences est notée une fois.
 *
 * Ne lève jamais : le choix de l'abonné est déjà enregistré chez Resend,
 * l'échec de cette trace ne doit pas le lui faire perdre.
 */
import type { DatabaseSync } from 'node:sqlite';
import { getDb } from '@/lib/db';
import { fingerprintEmail } from '@/lib/desabonnements';

export type SensChoix = 'refus' | 'reprise';
export type SourceChoix = 'one-click' | 'preferences';

export const CONSERVATION_MS = 730 * 24 * 60 * 60 * 1000;

export function noterChoix(
  db: DatabaseSync,
  empreinte: string,
  sens: SensChoix,
  source: SourceChoix,
  maintenant = Date.now(),
): boolean {
  db.prepare('DELETE FROM coulisses_refus WHERE le < ?').run(maintenant - CONSERVATION_MS);
  const dernier = db
    .prepare('SELECT sens FROM coulisses_refus WHERE empreinte = ? ORDER BY le DESC, id DESC LIMIT 1')
    .get(empreinte) as { sens: SensChoix } | undefined;
  const aNoter = sens === 'refus' ? dernier?.sens !== 'refus' : dernier?.sens === 'refus';
  if (!aNoter) return false;
  db.prepare('INSERT INTO coulisses_refus (empreinte, sens, source, le) VALUES (?, ?, ?, ?)').run(
    empreinte,
    sens,
    source,
    maintenant,
  );
  return true;
}

/** Point d'entrée des routes : base absente ou erreur = rien noté, jamais d'exception. */
export function noterChoixCoulisses(email: string, oui: boolean, source: SourceChoix): void {
  try {
    const db = getDb();
    if (!db) return;
    noterChoix(db, fingerprintEmail(email), oui ? 'reprise' : 'refus', source);
  } catch (error) {
    console.error('[coulisses-refus] trace non enregistrée', error instanceof Error ? error.message : error);
  }
}
