// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * « Les coulisses de BGM » : textes des numéros et journal d'envoi, en SQLite
 * (schéma dans src/lib/db.ts). Le texte ne passe jamais par le dépôt public.
 *
 * Garanties :
 * - un destinataire est RÉSERVÉ au journal avant l'appel à Resend ; une
 *   réservation dont l'issue est inconnue (réponse perdue) n'est jamais
 *   renvoyée automatiquement : elle va au rapport, à vérifier dans Resend ;
 * - un numéro se verrouille avant l'envoi (`etat = 'envoi'`) : un second clic
 *   ou un second onglet est refusé ;
 * - l'envoi réel exige un essai fait sur le texte EXACT qui part (empreinte).
 */
import { createHash } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import type { LangueEnvoi, Variante } from './selection';
import { corpsVide } from './corps';

export interface TexteLangue {
  objet: string;
  /** HTML de l'éditeur, nettoyé (src/lib/coulisses/corps.ts). */
  corps: string;
  /** Aperçu dans la boîte de réception ; facultatif. */
  apercu?: string;
}
export type Textes = Record<LangueEnvoi, TexteLangue>;

export type EtatNumero = 'brouillon' | 'envoi' | 'interrompu' | 'envoye';

export interface Numero {
  numero: number;
  textes: Textes;
  modifieLe: number;
  essaiEmpreinte: string | null;
  essaiLe: number | null;
  etat: EtatNumero;
  verrouLe: number | null;
  rapport: unknown;
}

/** À changer quand le gabarit du mail change : un ancien essai ne vaut plus. */
export const VERSION_GABARIT = 'coulisses-gabarit-2';

export function empreinteTextes(textes: Textes): string {
  return createHash('sha256')
    .update(VERSION_GABARIT + '\n' + JSON.stringify(textes))
    .digest('hex');
}

export function textesComplets(t: Partial<Textes> | null | undefined): t is Textes {
  return (['fr', 'nl', 'en'] as const).every(
    (l) => Boolean(t?.[l]?.objet?.trim()) && typeof t?.[l]?.corps === 'string' && !corpsVide(t[l].corps),
  );
}

export function lireNumero(db: DatabaseSync, numero: number): Numero | null {
  const r = db.prepare('SELECT * FROM coulisses_numeros WHERE numero = ?').get(numero) as
    | Record<string, unknown>
    | undefined;
  if (!r) return null;
  return {
    numero: Number(r.numero),
    textes: JSON.parse(String(r.textes)) as Textes,
    modifieLe: Number(r.modifie_le),
    essaiEmpreinte: (r.essai_empreinte as string | null) ?? null,
    essaiLe: r.essai_le == null ? null : Number(r.essai_le),
    etat: r.etat as EtatNumero,
    verrouLe: r.verrou_le == null ? null : Number(r.verrou_le),
    rapport: r.rapport ? JSON.parse(String(r.rapport)) : null,
  };
}

export function dernierNumero(db: DatabaseSync): number | null {
  const r = db.prepare('SELECT MAX(numero) AS n FROM coulisses_numeros').get() as { n: number | null };
  return r.n ?? null;
}

/** Enregistre les textes. Refusé une fois l'envoi commencé. L'essai est périmé. */
export function enregistrerTextes(
  db: DatabaseSync,
  numero: number,
  textes: Textes,
  maintenant = Date.now(),
): 'ok' | 'verrouille' {
  const existant = lireNumero(db, numero);
  if (existant && existant.etat !== 'brouillon') return 'verrouille';
  db.prepare(
    `INSERT INTO coulisses_numeros (numero, textes, modifie_le, etat) VALUES (?, ?, ?, 'brouillon')
     ON CONFLICT(numero) DO UPDATE SET textes = excluded.textes, modifie_le = excluded.modifie_le,
       essai_empreinte = NULL, essai_le = NULL`,
  ).run(numero, JSON.stringify(textes), maintenant);
  return 'ok';
}

export function noterEssai(db: DatabaseSync, numero: number, empreinte: string, maintenant = Date.now()): void {
  db.prepare('UPDATE coulisses_numeros SET essai_empreinte = ?, essai_le = ? WHERE numero = ?').run(
    empreinte,
    maintenant,
    numero,
  );
}

/**
 * Prend le verrou d'envoi. Vrai seulement si le numéro est en brouillon (ou
 * interrompu, pour une reprise) ET si l'essai porte sur le texte actuel.
 */
export function prendreVerrou(db: DatabaseSync, numero: number, maintenant = Date.now()): boolean {
  const n = lireNumero(db, numero);
  if (!n || !n.essaiEmpreinte || n.essaiEmpreinte !== empreinteTextes(n.textes)) return false;
  const r = db
    .prepare(
      `UPDATE coulisses_numeros SET etat = 'envoi', verrou_le = ?
       WHERE numero = ? AND etat IN ('brouillon', 'interrompu') AND essai_empreinte = ?`,
    )
    .run(maintenant, numero, n.essaiEmpreinte);
  return r.changes === 1;
}

/** Délai après lequel un envoi encore « en cours » est réputé coupé (redémarrage). */
export const BLOCAGE_MINUTES = 10;

/**
 * Débloque un envoi coupé (conteneur redémarré en plein envoi) : le numéro
 * passe « interrompu », les réservations sans issue deviennent « incertain »
 * (jamais renvoyées, à vérifier dans Resend). Refusé avant BLOCAGE_MINUTES.
 */
export function debloquer(db: DatabaseSync, numero: number, maintenant = Date.now()): boolean {
  const n = lireNumero(db, numero);
  if (!n || n.etat !== 'envoi' || !n.verrouLe || maintenant - n.verrouLe < BLOCAGE_MINUTES * 60_000) return false;
  db.prepare(`UPDATE coulisses_envois SET etat = 'incertain', le = ? WHERE numero = ? AND etat = 'reserve'`).run(
    maintenant,
    numero,
  );
  const r = db
    .prepare(`UPDATE coulisses_numeros SET etat = 'interrompu' WHERE numero = ? AND etat = 'envoi'`)
    .run(numero);
  return r.changes === 1;
}

export function terminer(db: DatabaseSync, numero: number, etat: 'envoye' | 'interrompu', rapport: unknown): void {
  db.prepare('UPDATE coulisses_numeros SET etat = ?, rapport = ? WHERE numero = ?').run(
    etat,
    JSON.stringify(rapport),
    numero,
  );
}

/** Contacts ayant reçu avec succès un numéro ANTÉRIEUR : variante courante. */
export function ontDejaRecu(db: DatabaseSync, numero: number): Set<string> {
  const rows = db
    .prepare(`SELECT DISTINCT contact_id FROM coulisses_envois WHERE numero < ? AND etat = 'envoye'`)
    .all(numero) as Array<{ contact_id: string }>;
  return new Set(rows.map((r) => r.contact_id));
}

/** Contacts déjà au journal de CE numéro, quel que soit leur état. */
export function dejaAuJournal(db: DatabaseSync, numero: number): Set<string> {
  const rows = db
    .prepare('SELECT contact_id FROM coulisses_envois WHERE numero = ?')
    .all(numero) as Array<{ contact_id: string }>;
  return new Set(rows.map((r) => r.contact_id));
}

/** Réserve une ligne avant l'appel. Faux si elle existait déjà : ne pas envoyer. */
export function reserver(
  db: DatabaseSync,
  numero: number,
  d: { id: string; langue: LangueEnvoi; variante: Variante },
  maintenant = Date.now(),
): boolean {
  const r = db
    .prepare(
      `INSERT OR IGNORE INTO coulisses_envois (numero, contact_id, langue, variante, etat, le)
       VALUES (?, ?, ?, ?, 'reserve', ?)`,
    )
    .run(numero, d.id, d.langue, d.variante, maintenant);
  return r.changes === 1;
}

export function marquerEnvoye(db: DatabaseSync, numero: number, contactId: string, resendId: string | null): void {
  db.prepare(
    `UPDATE coulisses_envois SET etat = 'envoye', resend_id = ?, le = ? WHERE numero = ? AND contact_id = ?`,
  ).run(resendId, Date.now(), numero, contactId);
}

/** Refus explicite de Resend : le mail n'est pas parti, la réservation saute. */
export function annulerReservation(db: DatabaseSync, numero: number, contactId: string): void {
  db.prepare(`DELETE FROM coulisses_envois WHERE numero = ? AND contact_id = ? AND etat = 'reserve'`).run(
    numero,
    contactId,
  );
}

/** Issue inconnue (réponse perdue) : on garde la ligne, à vérifier dans Resend. */
export function marquerIncertain(db: DatabaseSync, numero: number, contactId: string): void {
  db.prepare(
    `UPDATE coulisses_envois SET etat = 'incertain', le = ? WHERE numero = ? AND contact_id = ?`,
  ).run(Date.now(), numero, contactId);
}

export function compterJournal(db: DatabaseSync, numero: number): Record<string, number> {
  const rows = db
    .prepare('SELECT etat, COUNT(*) AS n FROM coulisses_envois WHERE numero = ? GROUP BY etat')
    .all(numero) as Array<{ etat: string; n: number }>;
  return Object.fromEntries(rows.map((r) => [r.etat, Number(r.n)]));
}
