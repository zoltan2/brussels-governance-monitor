// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Compteur mensuel des abonnés, lu par la tuile « Abonnés » de /admin.
 *
 * Le registre des désabonnements (desabonnements.ts) ne peut pas servir de
 * total : une ligne s'efface au réabonnement et à ses 24 mois. Resend non
 * plus : un contact désinscrit y disparaît après 30 jours. On compte donc ici
 * des événements, sans adresse ni empreinte, et rien n'est jamais purgé.
 *
 * Une fois une valeur écrite, elle n'est jamais recalculée depuis Resend :
 * chaque purge y ferait baisser les mois passés.
 *
 * Deux sources restent séparées, pour ne pas présenter une reconstitution
 * comme une mesure :
 * - `nouveaux`, `desabonnements`, `retours` : comptés en direct depuis `debut` ;
 * - `nouveaux_reprise` : reconstitué une seule fois depuis la date de création
 *   des contacts encore présents chez Resend, donc sous-estimé (les personnes
 *   déjà purgées n'y sont plus).
 *
 * Les personnes désinscrites avant le suivi sont dans `stock_desabonnements` :
 * leur date au registre est celle de leur première observation par la purge,
 * pas celle de leur départ, elles n'ont donc pas de mois.
 */
import type { DatabaseSync } from 'node:sqlite';
import { getDb } from './db';

type Compteur = 'nouveaux' | 'desabonnements' | 'retours';

/** La sonde de contacts-healthcheck n'est pas une personne. */
const ADRESSE_SONDE = /^healthcheck-\d+@governance\.brussels$/i;

const FORMAT_MOIS = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Brussels',
  year: 'numeric',
  month: '2-digit',
});

/** Mois civil à Bruxelles, au format AAAA-MM. */
export function moisBruxelles(ms: number): string {
  const parties = FORMAT_MOIS.formatToParts(new Date(ms));
  const annee = parties.find((p) => p.type === 'year')?.value;
  const mois = parties.find((p) => p.type === 'month')?.value;
  return `${annee}-${mois}`;
}

function moisPrecedent(mois: string): string {
  const [annee, m] = mois.split('-').map(Number);
  return m === 1 ? `${annee - 1}-12` : `${annee}-${String(m - 1).padStart(2, '0')}`;
}

/**
 * Ajoute 1 au compteur du mois. Ne lève jamais : un compteur ne doit faire
 * échouer ni un désabonnement ni une inscription.
 */
export function compterEvenement(
  db: DatabaseSync,
  compteur: Compteur,
  maintenant: number = Date.now(),
): void {
  try {
    db.prepare(
      `INSERT INTO abonnes_mois (mois, ${compteur}) VALUES (?, 1)
       ON CONFLICT(mois) DO UPDATE SET ${compteur} = ${compteur} + 1`,
    ).run(moisBruxelles(maintenant));
  } catch (err) {
    console.error(
      '[suivi-abonnes] écriture impossible',
      err instanceof Error ? err.name : 'erreur',
    );
  }
}

/** Appelé quand /api/confirm crée le contact d'une personne qui n'est pas un retour. */
export function enregistrerNouvelAbonne(): void {
  const db = getDb();
  if (db) compterEvenement(db, 'nouveaux');
}

export function repriseFaite(db: DatabaseSync): boolean {
  const r = db.prepare('SELECT reprise_le FROM abonnes_suivi WHERE id = 1').get() as
    | { reprise_le: number | null }
    | undefined;
  return r?.reprise_le != null;
}

/** Resend écrit parfois « 2026-01-15 10:00:00.123+00 », illisible pour Date.parse. */
function lireDateResend(valeur: string): number {
  return Date.parse(valeur.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00'));
}

/**
 * Reconstitue les mois passés, une seule fois. Seuls les contacts créés avant
 * `debut` comptent : les suivants sont déjà comptés en direct. Une date
 * illisible fait tout refuser (la purge retentera le lendemain) : mieux vaut
 * pas d'historique qu'un historique faux.
 */
export function appliquerReprise(
  db: DatabaseSync,
  contacts: { email: string; createdAt: string }[],
  maintenant: number = Date.now(),
): void {
  const { debut } = db.prepare('SELECT debut FROM abonnes_suivi WHERE id = 1').get() as {
    debut: number;
  };
  const parMois = new Map<string, number>();
  for (const contact of contacts) {
    if (ADRESSE_SONDE.test(contact.email)) continue;
    const cree = lireDateResend(contact.createdAt);
    if (Number.isNaN(cree)) throw new Error('date de création illisible');
    if (cree >= debut) continue;
    const mois = moisBruxelles(cree);
    parMois.set(mois, (parMois.get(mois) ?? 0) + 1);
  }

  db.exec('BEGIN IMMEDIATE');
  try {
    const ecrire = db.prepare(
      `INSERT INTO abonnes_mois (mois, nouveaux_reprise) VALUES (?, ?)
       ON CONFLICT(mois) DO UPDATE SET nouveaux_reprise = excluded.nouveaux_reprise`,
    );
    for (const [mois, n] of parMois) ecrire.run(mois, n);
    db.prepare('UPDATE abonnes_suivi SET reprise_le = ? WHERE id = 1').run(maintenant);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

export interface MoisAbonnes {
  mois: string;
  /** null : mois antérieur au premier contact connu, laissé vide. */
  valeur: number | null;
  statut: 'reconstitue' | 'mesure' | 'en-cours';
}

export interface SuiviAbonnes {
  debut: number;
  desabonnementsTotal: number;
  desabonnementsCeMois: number;
  retoursTotal: number;
  /** Les 12 derniers mois, du plus ancien au mois en cours. */
  mois: MoisAbonnes[];
}

export function lireSuiviAbonnes(
  db: DatabaseSync,
  maintenant: number = Date.now(),
): SuiviAbonnes {
  const { debut, stock_desabonnements: stock } = db
    .prepare('SELECT debut, stock_desabonnements FROM abonnes_suivi WHERE id = 1')
    .get() as { debut: number; stock_desabonnements: number };
  const lignes = db.prepare('SELECT * FROM abonnes_mois').all() as unknown as {
    mois: string;
    nouveaux: number;
    desabonnements: number;
    retours: number;
    nouveaux_reprise: number;
  }[];
  const parMois = new Map(lignes.map((l) => [l.mois, l]));

  const moisCourant = moisBruxelles(maintenant);
  const moisDebut = moisBruxelles(debut);
  const avecInscrits = lignes
    .filter((l) => l.nouveaux + l.nouveaux_reprise > 0)
    .map((l) => l.mois);
  const premier = [...avecInscrits, moisDebut].sort()[0];

  const mois: MoisAbonnes[] = [];
  let curseur = moisCourant;
  for (let i = 0; i < 12; i++) {
    const ligne = parMois.get(curseur);
    let statut: MoisAbonnes['statut'] = 'mesure';
    if (curseur === moisCourant) statut = 'en-cours';
    else if (curseur < moisDebut) statut = 'reconstitue';
    mois.unshift({
      mois: curseur,
      valeur: curseur < premier ? null : (ligne?.nouveaux ?? 0) + (ligne?.nouveaux_reprise ?? 0),
      statut,
    });
    curseur = moisPrecedent(curseur);
  }

  return {
    debut,
    desabonnementsTotal: stock + lignes.reduce((total, l) => total + l.desabonnements, 0),
    desabonnementsCeMois: parMois.get(moisCourant)?.desabonnements ?? 0,
    retoursTotal: lignes.reduce((total, l) => total + l.retours, 0),
    mois,
  };
}
