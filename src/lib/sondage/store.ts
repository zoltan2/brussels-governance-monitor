// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Accès SQLite du sondage lecteurs (tables `sondage_reponses` et
 * `sondage_entretiens` de src/lib/db.ts). Toutes les fonctions reçoivent la base
 * en paramètre : les tests passent une base en mémoire.
 */
import { randomBytes, randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import type { LangueSondage, Reponses } from './questionnaire';

/** 128 bits aléatoires, en base64url. Seul lien entre un navigateur et sa réponse. */
export function nouvelleSession(): string {
  return randomBytes(16).toString('base64url');
}

/** Forme d'un identifiant de session valide : sert à écarter un cookie fabriqué avant toute requête. */
export const SESSION_RE = /^[A-Za-z0-9_-]{22}$/;

export interface LigneReponse {
  session: string;
  langue: LangueSondage;
  version: string;
  reponses: Reponses;
  etape: string;
  duree_ms: number;
  cree_le: string;
  maj_le: string;
  termine: boolean;
  pilote: boolean;
}

type LigneBrute = {
  session: string;
  langue: string;
  version: string;
  reponses: string;
  etape: string;
  duree_ms: number;
  cree_le: string;
  maj_le: string;
  termine: number;
  pilote: number;
};

function depuisBrute(l: LigneBrute): LigneReponse {
  let reponses: Reponses = {};
  try {
    reponses = JSON.parse(l.reponses) as Reponses;
  } catch {
    reponses = {};
  }
  return {
    session: l.session,
    langue: l.langue as LangueSondage,
    version: l.version,
    reponses,
    etape: l.etape,
    duree_ms: Number(l.duree_ms),
    cree_le: l.cree_le,
    maj_le: l.maj_le,
    termine: Number(l.termine) === 1,
    pilote: Number(l.pilote) === 1,
  };
}

export function lireReponse(db: DatabaseSync, session: string): LigneReponse | null {
  if (!SESSION_RE.test(session)) return null;
  const l = db.prepare('SELECT * FROM sondage_reponses WHERE session = ?').get(session) as
    | LigneBrute
    | undefined;
  return l ? depuisBrute(l) : null;
}

export function creerReponse(
  db: DatabaseSync,
  r: { session: string; langue: LangueSondage; version: string; jour: string; pilote: boolean },
): void {
  db.prepare(
    `INSERT INTO sondage_reponses (session, langue, version, reponses, etape, duree_ms, cree_le, maj_le, termine, pilote)
     VALUES (?, ?, ?, '{}', 'accueil', 0, ?, ?, 0, ?)`,
  ).run(r.session, r.langue, r.version, r.jour, r.jour, r.pilote ? 1 : 0);
}

export function majReponse(
  db: DatabaseSync,
  r: { session: string; reponses: Reponses; etape: string; duree_ms: number; jour: string; termine: boolean },
): void {
  db.prepare(
    `UPDATE sondage_reponses SET reponses = ?, etape = ?, duree_ms = ?, maj_le = ?, termine = ?
     WHERE session = ?`,
  ).run(JSON.stringify(r.reponses), r.etape, r.duree_ms, r.jour, r.termine ? 1 : 0, r.session);
}

export function supprimerReponse(db: DatabaseSync, session: string): void {
  db.prepare('DELETE FROM sondage_reponses WHERE session = ?').run(session);
}

/** Un volontaire de Q9 : adresse e-mail, téléphone, ou les deux (jamais aucun des deux). */
export function ajouterEntretien(
  db: DatabaseSync,
  e: { email?: string | null; telephone?: string | null; langue: LangueSondage; jour: string },
): void {
  const email = e.email || null;
  const telephone = e.telephone || null;
  if (!email && !telephone) throw new Error('ajouterEntretien : ni adresse ni téléphone');
  db.prepare(
    `INSERT INTO sondage_entretiens (id, email, telephone, langue, cree_le, statut)
     VALUES (?, ?, ?, ?, ?, 'a_contacter')`,
  ).run(randomUUID(), email, telephone, e.langue, e.jour);
}

export function toutesLesReponses(db: DatabaseSync): LigneReponse[] {
  // Ordre alphabétique de session (aléatoire) : pas l'ordre d'arrivée.
  return (db.prepare('SELECT * FROM sondage_reponses ORDER BY session').all() as LigneBrute[]).map(
    depuisBrute,
  );
}

export interface Entretien {
  email: string | null;
  telephone: string | null;
  langue: string;
  cree_le: string;
  statut: string;
}

export function tousLesEntretiens(db: DatabaseSync): Entretien[] {
  return db
    .prepare('SELECT email, telephone, langue, cree_le, statut FROM sondage_entretiens ORDER BY cree_le, email, telephone')
    .all() as unknown as Entretien[];
}
