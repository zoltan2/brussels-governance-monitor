// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Registre des désabonnements : ce qui permet de tenir la promesse de la
 * politique de confidentialité (décision du 29/09/2026, « option 1, 24 mois »).
 *
 * - 30 jours après le désabonnement, le contact est supprimé de Resend
 *   (route `/api/cron/contacts-purge`).
 * - On garde 24 mois une EMPREINTE de l'adresse, jamais l'adresse : elle sert
 *   seulement à reconnaître un réabonnement (source `retour` du contact).
 *
 * L'empreinte est un HMAC-SHA256 de l'adresse normalisée. La clé est DÉRIVÉE
 * d'`AUTH_SECRET` avec un préfixe de séparation de domaine
 * (« bgm-empreinte-abonne-v1 ») : AUTH_SECRET existe forcément en production,
 * puisqu'il signe les jetons de confirmation et de désabonnement, et la
 * dérivation garantit qu'une empreinte ne peut jamais servir de signature de
 * jeton, ni coïncider avec le pseudonyme des journaux (`log-safe.ts`), qui
 * hache la même adresse avec AUTH_SECRET brut.
 *
 * Si AUTH_SECRET change, les anciennes empreintes ne correspondent plus :
 * - un désabonné encore présent dans Resend n'est plus reconnu ; la purge lui
 *   recrée une ligne datée du jour, ce qui repousse sa suppression d'au plus
 *   30 jours ;
 * - une ancienne ligne ne reconnaît plus le retour de la personne (pas de
 *   source `retour`) et s'efface à ses 24 mois, comme les autres.
 * Rien ne casse, mais changer AUTH_SECRET invalide déjà tous les liens de
 * désabonnement envoyés (valables un an) : ce n'est pas une opération anodine.
 *
 * Sans AUTH_SECRET, `fingerprintEmail` LÈVE. Pas de sel de repli aléatoire
 * comme dans `log-safe.ts` : une clé qui change à chaque redémarrage recréerait
 * chaque jour des lignes neuves, et aucun contact n'atteindrait jamais ses
 * 30 jours. Les appelants des routes publiques attrapent l'exception.
 *
 * Ni l'adresse ni l'empreinte ne vont dans les journaux.
 */
import { createHmac } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { getDb } from './db';

const DOMAINE_EMPREINTE = 'bgm-empreinte-abonne-v1';

export const JOUR_MS = 24 * 60 * 60 * 1000;

/** Délai entre le désabonnement et la suppression du contact chez Resend. */
export const DELAI_SUPPRESSION_CONTACT_MS = 30 * JOUR_MS;

/** Durée de conservation de l'empreinte, en mois calendaires. */
export const MOIS_CONSERVATION_EMPREINTE = 24;

/** Clé HMAC propre aux empreintes, dérivée du secret serveur. */
function cleEmpreinte(secret: string | undefined): Buffer {
  if (!secret) {
    throw new Error('AUTH_SECRET est requis pour calculer une empreinte d’abonné');
  }
  return createHmac('sha256', secret).update(DOMAINE_EMPREINTE).digest();
}

/**
 * Empreinte stable d'une adresse : insensible à la casse et aux espaces de
 * bord, différente selon le secret. `secret` n'est passé que par les tests.
 */
export function fingerprintEmail(
  email: string,
  secret: string | undefined = process.env.AUTH_SECRET,
): string {
  const normalisee = email.trim().toLowerCase();
  return createHmac('sha256', cleEmpreinte(secret)).update(normalisee).digest('hex');
}

// ---------------------------------------------------------------------------
// Table `desabonnements` (schéma dans db.ts). Dates en millisecondes, comme
// les autres tables de la base.
// ---------------------------------------------------------------------------

export interface LigneDesabonnement {
  empreinte: string;
  desabonne_le: number;
  contact_supprime_le: number | null;
}

/**
 * Note un désabonnement. N'écrase JAMAIS une date existante : c'est la
 * première date qui fait courir les 30 jours. Rend vrai si une ligne a été
 * créée.
 */
export function noterDesabonnement(
  db: DatabaseSync,
  empreinte: string,
  maintenant: number = Date.now(),
): boolean {
  const res = db
    .prepare(
      `INSERT INTO desabonnements (empreinte, desabonne_le, contact_supprime_le)
       VALUES (?, ?, NULL)
       ON CONFLICT(empreinte) DO NOTHING`,
    )
    .run(empreinte, maintenant);
  return Number(res.changes) > 0;
}

export function lireDesabonnement(
  db: DatabaseSync,
  empreinte: string,
): LigneDesabonnement | null {
  const ligne = db
    .prepare(
      'SELECT empreinte, desabonne_le, contact_supprime_le FROM desabonnements WHERE empreinte = ?',
    )
    .get(empreinte) as LigneDesabonnement | undefined;
  return ligne ?? null;
}

export function marquerContactSupprime(
  db: DatabaseSync,
  empreinte: string,
  maintenant: number = Date.now(),
): void {
  db.prepare(
    'UPDATE desabonnements SET contact_supprime_le = ? WHERE empreinte = ?',
  ).run(maintenant, empreinte);
}

/** Supprime la ligne (réabonnement). Rend vrai si une ligne existait. */
export function effacerDesabonnement(db: DatabaseSync, empreinte: string): boolean {
  const res = db.prepare('DELETE FROM desabonnements WHERE empreinte = ?').run(empreinte);
  return Number(res.changes) > 0;
}

/** Date limite de conservation : `maintenant` moins 24 mois calendaires. */
export function limiteConservationEmpreinte(maintenant: number): number {
  const d = new Date(maintenant);
  d.setUTCMonth(d.getUTCMonth() - MOIS_CONSERVATION_EMPREINTE);
  return d.getTime();
}

/** Nombre de lignes désabonnées avant `limite` (strictement). */
export function compterDesabonnementsExpires(db: DatabaseSync, limite: number): number {
  const r = db
    .prepare('SELECT COUNT(*) AS n FROM desabonnements WHERE desabonne_le < ?')
    .get(limite) as { n: number };
  return Number(r.n);
}

export function purgerDesabonnementsExpires(db: DatabaseSync, limite: number): number {
  const res = db.prepare('DELETE FROM desabonnements WHERE desabonne_le < ?').run(limite);
  return Number(res.changes);
}

// ---------------------------------------------------------------------------
// Façade pour les routes publiques : ne lève jamais, ne journalise ni adresse
// ni empreinte. Sans base (DB_PATH absent), ne fait rien.
// ---------------------------------------------------------------------------

/** Appelé après un désabonnement accepté par Resend. */
export function enregistrerDesabonnement(email: string): void {
  try {
    const db = getDb();
    if (!db) return;
    noterDesabonnement(db, fingerprintEmail(email));
  } catch (err) {
    console.error(
      '[desabonnements] écriture impossible',
      err instanceof Error ? err.name : 'erreur',
    );
  }
}

/**
 * Vrai si l'adresse figure au registre des désabonnés (réabonnement). Rend
 * faux en cas d'erreur : un réabonnement ne doit jamais échouer pour ça.
 */
export function estUnRetour(email: string): boolean {
  try {
    const db = getDb();
    if (!db) return false;
    return lireDesabonnement(db, fingerprintEmail(email)) !== null;
  } catch (err) {
    console.error(
      '[desabonnements] lecture impossible',
      err instanceof Error ? err.name : 'erreur',
    );
    return false;
  }
}

/** Efface la ligne d'une personne de nouveau abonnée. Ne lève jamais. */
export function oublierDesabonnement(email: string): void {
  try {
    const db = getDb();
    if (!db) return;
    effacerDesabonnement(db, fingerprintEmail(email));
  } catch (err) {
    console.error(
      '[desabonnements] effacement impossible',
      err instanceof Error ? err.name : 'erreur',
    );
  }
}
