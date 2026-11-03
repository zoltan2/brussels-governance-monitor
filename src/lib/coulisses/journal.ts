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
 * - l'envoi réel exige un essai fait sur le contenu EXACT qui part (empreinte :
 *   édition du mois, version de bienvenue, état du sondage, gabarit).
 *
 * Deux contenus par rendez-vous (décision de Zoltán, 3 novembre 2026) :
 * - la BIENVENUE, modèle stable et versionné (`coulisses_bienvenue`), que
 *   chaque abonné reçoit une seule fois, au premier rendez-vous où il est
 *   éligible ;
 * - l'ÉDITION du mois (`coulisses_numeros.textes`), pour ceux qui ont déjà
 *   reçu la bienvenue. Elle peut être vide : les bienvenues partent quand même.
 * Le `numero` est un identifiant interne, jamais montré aux lecteurs.
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

/** Bienvenue : comme une édition, plus le bloc sondage (repère `[sondage]`). */
export interface TexteBienvenue extends TexteLangue {
  sondage?: string;
}
export type TextesBienvenue = Record<LangueEnvoi, TexteBienvenue>;

export interface Bienvenue {
  version: number;
  textes: TextesBienvenue;
  creeLe: number;
}

export type EtatNumero = 'brouillon' | 'envoi' | 'interrompu' | 'envoye';

export interface Numero {
  numero: number;
  /** Rendez-vous du mois, AAAA-MM ; null pour un numéro d'avant la séparation. */
  mois: string | null;
  /** Édition du mois : vide (`{}` ou textes vides) ou complète. */
  textes: Partial<Textes>;
  modifieLe: number;
  essaiEmpreinte: string | null;
  essaiLe: number | null;
  etat: EtatNumero;
  verrouLe: number | null;
  rapport: unknown;
}

/** À changer quand le gabarit du mail change : un ancien essai ne vaut plus. */
export const VERSION_GABARIT = 'coulisses-gabarit-3';

/** Ce qui part réellement : un essai ne vaut que pour cette combinaison exacte. */
export function empreinteEnvoi(c: {
  edition: Partial<Textes>;
  bienvenue: Bienvenue | null;
  sondageOuvert: boolean;
}): string {
  return createHash('sha256')
    .update(
      VERSION_GABARIT +
        '\n' +
        JSON.stringify({
          edition: editionVide(c.edition) ? null : c.edition,
          bienvenue: c.bienvenue ? { version: c.bienvenue.version, textes: c.bienvenue.textes } : null,
          sondage: c.sondageOuvert,
        }),
    )
    .digest('hex');
}

export function textesComplets(t: Partial<Textes> | null | undefined): t is Textes {
  return (['fr', 'nl', 'en'] as const).every(
    (l) => Boolean(t?.[l]?.objet?.trim()) && typeof t?.[l]?.corps === 'string' && !corpsVide(t[l].corps),
  );
}

const LANGUES_ENVOI = ['fr', 'nl', 'en'] as const;

/** Aucune langue n'a ni objet ni texte : pas d'édition ce mois-ci. */
export function editionVide(t: Partial<Textes> | null | undefined): boolean {
  return LANGUES_ENVOI.every((l) => !t?.[l]?.objet?.trim() && (!t?.[l]?.corps || corpsVide(t[l]!.corps)));
}

/** Une édition s'envoie complète dans les trois langues, ou pas du tout. */
export function editionValide(t: Partial<Textes> | null | undefined): boolean {
  return editionVide(t) || textesComplets(t);
}

export function lireNumero(db: DatabaseSync, numero: number): Numero | null {
  const r = db.prepare('SELECT * FROM coulisses_numeros WHERE numero = ?').get(numero) as
    | Record<string, unknown>
    | undefined;
  if (!r) return null;
  return {
    numero: Number(r.numero),
    mois: (r.mois as string | null) ?? null,
    textes: JSON.parse(String(r.textes)) as Partial<Textes>,
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

/**
 * Numéro interne du rendez-vous `mois` (AAAA-MM). Avec `creer`, le crée vide
 * s'il n'existe pas ; l'index unique sur `mois` empêche d'en créer deux.
 */
export function numeroDuMois(db: DatabaseSync, mois: string, creer = false, maintenant = Date.now()): number | null {
  const lire = () =>
    (db.prepare('SELECT numero FROM coulisses_numeros WHERE mois = ?').get(mois) as { numero: number } | undefined)?.numero ?? null;
  const existant = lire();
  if (existant !== null || !creer) return existant;
  db.prepare(
    `INSERT OR IGNORE INTO coulisses_numeros (numero, mois, textes, modifie_le, etat)
     VALUES ((SELECT COALESCE(MAX(numero), 0) + 1 FROM coulisses_numeros), ?, '{}', ?, 'brouillon')`,
  ).run(mois, maintenant);
  return lire();
}

/** Dernière version du modèle de bienvenue, ou null s'il n'y en a aucune. */
export function lireBienvenue(db: DatabaseSync): Bienvenue | null {
  const r = db.prepare('SELECT * FROM coulisses_bienvenue ORDER BY version DESC LIMIT 1').get() as
    | Record<string, unknown>
    | undefined;
  if (!r) return null;
  return { version: Number(r.version), textes: JSON.parse(String(r.textes)) as TextesBienvenue, creeLe: Number(r.cree_le) };
}

/**
 * Enregistre le modèle de bienvenue. Rien ne change si le texte est identique ;
 * sinon une NOUVELLE version est créée (l'ancienne reste, pour l'historique).
 * L'essai d'un rendez-vous ouvert devient périmé (l'empreinte change).
 */
export function enregistrerBienvenue(db: DatabaseSync, textes: TextesBienvenue, maintenant = Date.now()): number {
  const actuelle = lireBienvenue(db);
  if (actuelle && JSON.stringify(actuelle.textes) === JSON.stringify(textes)) return actuelle.version;
  const version = (actuelle?.version ?? 0) + 1;
  db.prepare('INSERT INTO coulisses_bienvenue (version, textes, cree_le) VALUES (?, ?, ?)').run(
    version,
    JSON.stringify(textes),
    maintenant,
  );
  return version;
}

/** Enregistre les textes. Refusé une fois l'envoi commencé. L'essai est périmé. */
export function enregistrerTextes(
  db: DatabaseSync,
  numero: number,
  textes: Partial<Textes>,
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
 * interrompu, pour une reprise) ET si l'essai porte sur le contenu actuel
 * (`empreinteActuelle`, calculée par l'appelant avec empreinteEnvoi).
 */
export function prendreVerrou(db: DatabaseSync, numero: number, empreinteActuelle: string, maintenant = Date.now()): boolean {
  const n = lireNumero(db, numero);
  if (!n || !n.essaiEmpreinte || n.essaiEmpreinte !== empreinteActuelle) return false;
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

/**
 * Qui a déjà eu sa bienvenue, lors d'un AUTRE rendez-vous : identifiants de
 * contact et empreintes d'adresse. Toute ligne compte, envoyée, incertaine ou
 * encore réservée (seul un refus explicite de Resend efface la ligne) : dans
 * le doute, on ne renvoie jamais une bienvenue. Une édition reçue suppose
 * une bienvenue reçue avant.
 */
export function bienvenueRecue(db: DatabaseSync, numero: number): { ids: Set<string>; empreintes: Set<string> } {
  const rows = db
    .prepare('SELECT contact_id, empreinte FROM coulisses_envois WHERE numero != ?')
    .all(numero) as Array<{ contact_id: string; empreinte: string | null }>;
  return {
    ids: new Set(rows.map((r) => r.contact_id)),
    empreintes: new Set(rows.flatMap((r) => (r.empreinte ? [r.empreinte] : []))),
  };
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
  d: { id: string; langue: LangueEnvoi; variante: Variante; empreinte?: string },
  versionBienvenue: number | null = null,
  maintenant = Date.now(),
): boolean {
  const r = db
    .prepare(
      `INSERT OR IGNORE INTO coulisses_envois (numero, contact_id, langue, variante, etat, le, version_bienvenue, empreinte)
       VALUES (?, ?, ?, ?, 'reserve', ?, ?, ?)`,
    )
    .run(numero, d.id, d.langue, d.variante, maintenant, d.variante === 'premier' ? versionBienvenue : null, d.empreinte ?? null);
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

/**
 * Complète l'empreinte des lignes qui n'en ont pas (envois de novembre 2026,
 * faits avant la séparation) : une personne qui part puis revient après la
 * suppression de son contact garde sa bienvenue reçue.
 */
export function completerEmpreintes(db: DatabaseSync, contacts: Array<{ id: string; empreinte?: string }>): void {
  const maj = db.prepare('UPDATE coulisses_envois SET empreinte = ? WHERE contact_id = ? AND empreinte IS NULL');
  for (const c of contacts) if (c.empreinte) maj.run(c.empreinte, c.id);
}

/** 24 mois, comme le registre des désabonnements (desabonnements.ts). */
export const CONSERVATION_JOURS = 730;

/**
 * Minimisation : efface les lignes de plus de 24 mois des personnes qui ne
 * sont plus abonnées (ni leur contact ni leur empreinte dans la liste lue).
 * Les lignes d'un abonné actif restent : elles prouvent sa bienvenue reçue.
 */
export function purgerJournal(
  db: DatabaseSync,
  actifs: { ids: Set<string>; empreintes: Set<string> },
  maintenant = Date.now(),
): number {
  const limite = maintenant - CONSERVATION_JOURS * 86_400_000;
  const vieilles = db
    .prepare('SELECT numero, contact_id, empreinte FROM coulisses_envois WHERE le < ?')
    .all(limite) as Array<{ numero: number; contact_id: string; empreinte: string | null }>;
  const suppr = db.prepare('DELETE FROM coulisses_envois WHERE numero = ? AND contact_id = ?');
  let n = 0;
  for (const v of vieilles) {
    if (actifs.ids.has(v.contact_id) || (v.empreinte && actifs.empreintes.has(v.empreinte))) continue;
    suppr.run(v.numero, v.contact_id);
    n++;
  }
  return n;
}
