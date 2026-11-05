// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Historique des envois des coulisses (décisions de Zoltán, 5 novembre 2026).
 *
 * Deux vues : par rendez-vous et par version de la bienvenue. Les chiffres
 * d'envoi viennent des RAPPORTS figés à chaque envoi, jamais d'un recomptage
 * du journal : la purge à 24 mois (purgerJournal) ferait baisser les anciens
 * chiffres avec le temps.
 *
 * Refus : chaque refus daté (coulisses_refus, #808) est rattaché au dernier
 * mail des coulisses reçu par la même empreinte dans les 30 jours qui
 * précèdent ; sinon il est « non rattaché ». Les lignes de journal sans
 * empreinte (envois d'avant #800, complétées au rendez-vous suivant par
 * completerEmpreintes) ne peuvent rien rattacher : elles sont comptées à part
 * pour que l'écran le dise.
 *
 * Rebonds et plaintes : événements du webhook dont l'envoi est `coulisses`,
 * reçus entre le début de ce rendez-vous et le début du suivant.
 */
import type { DatabaseSync } from 'node:sqlite';

export const FENETRE_REFUS_MS = 30 * 24 * 60 * 60 * 1000;

export interface LigneRendezVous {
  numero: number;
  mois: string | null;
  debut: string;
  abonnes: number;
  bienvenues: number;
  /** null : aucune édition ce mois-là (bienvenues seules). */
  edition: number | null;
  versionBienvenue: number | null;
  tropRecents: number;
  /** Refus rattachés à ce rendez-vous (30 jours). */
  refus: number;
  rebonds: number;
  plaintes: number;
  /** Incertains + refusés par Resend + erreurs. */
  incidents: number;
}

export interface LigneVersion {
  version: number;
  depuis: string | null;
  recuePar: number;
  parMois: Array<{ mois: string | null; n: number }>;
  refus: number;
}

export interface Historique {
  rendezVous: LigneRendezVous[];
  versions: LigneVersion[];
  refusNonRattaches: number;
  reactivations: number;
  envoisSansEmpreinte: number;
}

type Comptes = Record<string, number>;
const somme = (c: Comptes) => Object.values(c).reduce((a, b) => a + b, 0);
const sommeVariante = (c: Comptes, v: string) =>
  Object.entries(c).reduce((a, [k, n]) => (k.endsWith(`-${v}`) ? a + n : a), 0);

function estComptes(v: unknown): v is Comptes {
  return typeof v === 'object' && v !== null && Object.values(v).every((n) => typeof n === 'number');
}

interface RapportLu {
  debut: string;
  envoyes: Comptes;
  exclus: Comptes;
  mois?: string | null;
  versionBienvenue?: number | null;
  sansEdition?: number;
  refusesParResend?: number;
  incertains?: number;
  erreurs?: unknown[];
}

function lire(rapport: unknown): RapportLu | null {
  if (typeof rapport !== 'object' || rapport === null) return null;
  const r = rapport as Record<string, unknown>;
  if (typeof r.debut !== 'string' || !estComptes(r.envoyes) || !estComptes(r.exclus)) return null;
  return r as unknown as RapportLu;
}

export function lireHistorique(db: DatabaseSync): Historique {
  const lignes = db
    .prepare(
      `SELECT numero, mois, rapport FROM coulisses_numeros
       WHERE rapport IS NOT NULL AND etat IN ('envoye', 'interrompu') ORDER BY numero`,
    )
    .all() as Array<{ numero: number; mois: string | null; rapport: string }>;

  const rapports = lignes
    .map((l) => {
      let brut: unknown = null;
      try {
        brut = JSON.parse(l.rapport);
      } catch {
        /* rapport illisible : ignoré, l'écran du mois l'affiche brut */
      }
      const r = lire(brut);
      return r ? { numero: Number(l.numero), mois: r.mois ?? l.mois ?? null, r } : null;
    })
    .filter((x): x is { numero: number; mois: string | null; r: RapportLu } => x !== null);

  // Rattachement des refus.
  const refusParNumero = new Map<number, number>();
  const refusParVersion = new Map<number, number>();
  let refusNonRattaches = 0;
  const refus = db
    .prepare(`SELECT empreinte, le FROM coulisses_refus WHERE sens = 'refus'`)
    .all() as Array<{ empreinte: string; le: number }>;
  const dernierEnvoi = db.prepare(
    `SELECT numero, variante, version_bienvenue FROM coulisses_envois
     WHERE empreinte = ? AND etat = 'envoye' AND le <= ? AND le >= ?
     ORDER BY le DESC LIMIT 1`,
  );
  for (const f of refus) {
    const e = dernierEnvoi.get(f.empreinte, f.le, f.le - FENETRE_REFUS_MS) as
      | { numero: number; variante: string; version_bienvenue: number | null }
      | undefined;
    if (!e) {
      refusNonRattaches++;
      continue;
    }
    refusParNumero.set(Number(e.numero), (refusParNumero.get(Number(e.numero)) ?? 0) + 1);
    if (e.variante === 'premier' && e.version_bienvenue != null) {
      const v = Number(e.version_bienvenue);
      refusParVersion.set(v, (refusParVersion.get(v) ?? 0) + 1);
    }
  }

  const evenements = db
    .prepare(`SELECT type, recu_le FROM resend_evenements WHERE envoi = 'coulisses'`)
    .all() as Array<{ type: string; recu_le: number }>;

  const rendezVous: LigneRendezVous[] = rapports.map(({ numero, mois, r }, i) => {
    const debut = Date.parse(r.debut);
    const suivant = i + 1 < rapports.length ? Date.parse(rapports[i + 1].r.debut) : Infinity;
    const dansLaPeriode = evenements.filter((ev) => ev.recu_le >= debut && ev.recu_le < suivant);
    const bienvenues = sommeVariante(r.envoyes, 'premier');
    const courants = sommeVariante(r.envoyes, 'courant');
    // Le n° 1 (novembre 2026) date d'avant la séparation : ses envois « premier »
    // sont devenus la bienvenue v1 (migrerCoulisses), son rapport ne le dit pas.
    const versionBienvenue =
      typeof r.versionBienvenue === 'number' ? r.versionBienvenue : bienvenues > 0 && numero === 1 ? 1 : null;
    return {
      numero,
      mois,
      debut: r.debut,
      abonnes: somme(r.envoyes) + somme(r.exclus) + (r.sansEdition ?? 0),
      bienvenues,
      edition: courants > 0 ? courants : null,
      versionBienvenue,
      tropRecents: r.exclus.recent ?? 0,
      refus: refusParNumero.get(numero) ?? 0,
      rebonds: dansLaPeriode.filter((ev) => ev.type === 'email.bounced').length,
      plaintes: dansLaPeriode.filter((ev) => ev.type === 'email.complained').length,
      incidents: (r.incertains ?? 0) + (r.refusesParResend ?? 0) + (Array.isArray(r.erreurs) ? r.erreurs.length : 0),
    };
  });

  const versions = new Map<number, LigneVersion>();
  for (const l of rendezVous) {
    if (l.versionBienvenue === null || l.bienvenues === 0) continue;
    const v =
      versions.get(l.versionBienvenue) ??
      { version: l.versionBienvenue, depuis: l.mois, recuePar: 0, parMois: [], refus: refusParVersion.get(l.versionBienvenue) ?? 0 };
    v.recuePar += l.bienvenues;
    v.parMois.push({ mois: l.mois, n: l.bienvenues });
    versions.set(l.versionBienvenue, v);
  }

  const reactivations = (
    db.prepare(`SELECT COUNT(*) AS n FROM coulisses_refus WHERE sens = 'reprise'`).get() as { n: number }
  ).n;
  const envoisSansEmpreinte = (
    db.prepare(`SELECT COUNT(*) AS n FROM coulisses_envois WHERE etat = 'envoye' AND empreinte IS NULL`).get() as {
      n: number;
    }
  ).n;

  return {
    rendezVous,
    versions: [...versions.values()].sort((a, b) => a.version - b.version),
    refusNonRattaches,
    reactivations: Number(reactivations),
    envoisSansEmpreinte: Number(envoisSansEmpreinte),
  };
}
