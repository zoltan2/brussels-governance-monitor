// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Échéances de vérification : ce qui aurait dû être revérifié et ne l'a pas été.
 *
 * Deux sources d'échéance, toutes deux écrites à la main par l'éditeur :
 *
 * 1. `nextVerification` d'une fiche de la collection `verifications`
 *    (content/verifications/*.mdx). Affichée sur la fiche domaine, elle n'était
 *    jamais comparée à la date du jour : une échéance dépassée depuis des mois
 *    restait muette.
 * 2. `lastVerified` + `verificationIntervalDays` d'un dossier ou d'une fiche
 *    domaine (voir velite.config.ts). Sans intervalle, AUCUNE échéance n'est
 *    calculée : ce module n'invente jamais de règle de fraîcheur que
 *    l'éditeur n'a pas posée.
 *
 * ⚑ Une date de vérification est une ATTESTATION : quelqu'un a relu les faits
 * contre leurs sources ce jour-là. Rien ici ne la calcule, ne la remplit ni ne
 * la déplace ; ce module la lit et la compare, c'est tout.
 *
 * Tout est pur : la date du jour est TOUJOURS passée en paramètre, jamais lue
 * à l'horloge, pour que les tests fixent « aujourd'hui ». Seul `aujourdhuiBruxelles`
 * lit l'horloge, et seuls les points d'entrée (lint, écran admin) l'appellent.
 */

import { jourISO } from './velite-date';

/** `AAAA-MM-JJ` strict, et un jour qui existe au calendrier (pas de 31 avril). */
const ISO_JOUR = /^(\d{4})-(\d{2})-(\d{2})$/;

export function estJourISO(valeur: string | undefined): valeur is string {
  if (!valeur) return false;
  const m = ISO_JOUR.exec(valeur);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toISOString().slice(0, 10) === valeur;
}

function jourEnMs(jour: string): number {
  return Date.parse(`${jour}T00:00:00Z`);
}

/** Ajoute `jours` à un jour ISO. */
export function ajouterJours(jour: string, jours: number): string {
  return new Date(jourEnMs(jour) + jours * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Jours de retard d'une échéance à la date `aujourdhui`. Strictement positif
 * si l'échéance est dépassée ; 0 le jour même (encore dans les temps) ;
 * négatif si elle est à venir.
 */
export function joursDeRetard(echeance: string, aujourdhui: string): number {
  return Math.round((jourEnMs(aujourdhui) - jourEnMs(echeance)) / 86_400_000);
}

/** En retard = échéance STRICTEMENT antérieure à aujourd'hui. */
export function estEnRetard(echeance: string, aujourdhui: string): boolean {
  return joursDeRetard(echeance, aujourdhui) > 0;
}

/** Le jour calendaire à Bruxelles, `AAAA-MM-JJ`. Seule lecture de l'horloge. */
export function aujourdhuiBruxelles(maintenant: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Brussels',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(maintenant);
}

// ──────────────────────────────────────────────
// Entrées : ce que les lecteurs (lint sur fichiers bruts, admin sur Velite)
// fournissent. Les dates arrivent telles quelles ; `jourISO` ramène un
// horodatage Velite à son jour, et laisse une valeur illisible intacte pour
// qu'elle soit signalée comme telle.
// ──────────────────────────────────────────────

export interface EntreeVerification {
  /** Chemin du fichier source, ou identifiant lisible. */
  fichier: string;
  cardType: string;
  cardSlug: string;
  locale: string;
  date: string | undefined;
  nextVerification: string | undefined;
}

export interface EntreeFiche {
  fichier: string;
  collection: 'dossier' | 'domain';
  slug: string;
  locale: string;
  title?: string;
  lastVerified: string | undefined;
  /** Nombre, ou texte brut lu dans le frontmatter (validé ici). */
  verificationIntervalDays: number | string | undefined;
}

export interface VerificationEnRetard {
  /** Fichier de la vérification la plus récente de la fiche. */
  fichier: string;
  cardType: string;
  cardSlug: string;
  /** Date de la dernière vérification enregistrée pour cette fiche. */
  date: string;
  echeance: string;
  joursDeRetard: number;
}

export interface FicheEnRetard {
  fichier: string;
  collection: 'dossier' | 'domain';
  slug: string;
  locale: string;
  title?: string;
  lastVerified: string;
  intervalDays: number;
  echeance: string;
  joursDeRetard: number;
}

export interface ValeurInvalide {
  fichier: string;
  champ: string;
  valeur: string;
  motif: string;
}

export interface BilanEcheances {
  aujourdhui: string;
  /** Fiches (type + slug) qui ont au moins une vérification enregistrée. */
  fichesVerifiees: number;
  /** Parmi elles, celles dont la dernière vérification porte une échéance. */
  verificationsAvecEcheance: number;
  verificationsEnRetard: VerificationEnRetard[];
  /** Dossiers et fiches domaine portant `lastVerified`. */
  fichesAvecDate: number;
  /** Parmi elles, celles qui portent aussi un intervalle (donc une échéance). */
  fichesAvecIntervalle: number;
  fichesEnRetard: FicheEnRetard[];
  invalides: ValeurInvalide[];
}

function lireIntervalle(v: number | string | undefined): number | null | undefined {
  if (v === undefined || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Pour chaque fiche vérifiée (type + slug), seule la vérification la PLUS
 * RÉCENTE compte : une vérification de février dont l'échéance de mars a été
 * honorée par la vérification de mars n'est pas en retard. Les traductions
 * d'une même vérification partagent la date ; si elles divergent sur
 * l'échéance, la plus proche l'emporte (on ne repousse jamais une alerte).
 */
function verificationsEnRetard(
  entrees: EntreeVerification[],
  aujourdhui: string,
  invalides: ValeurInvalide[],
): { fichesVerifiees: number; avecEcheance: number; enRetard: VerificationEnRetard[] } {
  const parFiche = new Map<string, { date: string; echeance?: string; fichier: string; cardType: string; cardSlug: string }>();

  for (const e of entrees) {
    const date = jourISO(e.date);
    if (!estJourISO(date)) {
      invalides.push({ fichier: e.fichier, champ: 'date', valeur: String(e.date ?? '(absente)'), motif: 'date de vérification absente ou illisible' });
      continue;
    }
    const next = jourISO(e.nextVerification);
    let echeance: string | undefined;
    if (next !== undefined) {
      if (!estJourISO(next)) {
        invalides.push({ fichier: e.fichier, champ: 'nextVerification', valeur: next, motif: 'échéance illisible (attendu AAAA-MM-JJ)' });
      } else {
        echeance = next;
      }
    }

    const cle = `${e.cardType}:${e.cardSlug}`;
    const courant = parFiche.get(cle);
    if (!courant || date > courant.date) {
      parFiche.set(cle, { date, echeance, fichier: e.fichier, cardType: e.cardType, cardSlug: e.cardSlug });
    } else if (date === courant.date && echeance && (!courant.echeance || echeance < courant.echeance)) {
      courant.echeance = echeance;
      courant.fichier = e.fichier;
    } else if (date === courant.date && echeance === courant.echeance && e.locale === 'fr') {
      // Même vérification, même échéance : désigner la version française,
      // langue de référence des fiches, plutôt que la première par ordre alphabétique.
      courant.fichier = e.fichier;
    }
  }

  const enRetard: VerificationEnRetard[] = [];
  let avecEcheance = 0;
  for (const v of parFiche.values()) {
    if (!v.echeance) continue;
    avecEcheance += 1;
    if (estEnRetard(v.echeance, aujourdhui)) {
      const retard = joursDeRetard(v.echeance, aujourdhui);
      enRetard.push({ fichier: v.fichier, cardType: v.cardType, cardSlug: v.cardSlug, date: v.date, echeance: v.echeance, joursDeRetard: retard });
    }
  }
  enRetard.sort((a, b) => b.joursDeRetard - a.joursDeRetard || a.cardSlug.localeCompare(b.cardSlug));
  return { fichesVerifiees: parFiche.size, avecEcheance, enRetard };
}

export function bilanEcheances(params: {
  verifications: EntreeVerification[];
  fiches: EntreeFiche[];
  aujourdhui: string;
}): BilanEcheances {
  const { aujourdhui } = params;
  if (!estJourISO(aujourdhui)) {
    // Un « aujourd'hui » illisible rendrait toutes les comparaisons fausses en
    // silence : on refuse plutôt que de rendre un bilan vide.
    throw new Error(`bilanEcheances : date du jour illisible (${aujourdhui})`);
  }

  const invalides: ValeurInvalide[] = [];
  const verifs = verificationsEnRetard(params.verifications, aujourdhui, invalides);

  let fichesAvecDate = 0;
  let fichesAvecIntervalle = 0;
  const fichesEnRetard: FicheEnRetard[] = [];

  for (const f of params.fiches) {
    const intervalle = lireIntervalle(f.verificationIntervalDays);
    if (intervalle === null) {
      invalides.push({ fichier: f.fichier, champ: 'verificationIntervalDays', valeur: String(f.verificationIntervalDays), motif: 'intervalle illisible (attendu un entier de jours > 0)' });
    }
    if (f.lastVerified === undefined) {
      if (typeof intervalle === 'number') {
        invalides.push({ fichier: f.fichier, champ: 'verificationIntervalDays', valeur: String(intervalle), motif: 'intervalle sans lastVerified : aucune vérification à laquelle le rapporter' });
      }
      continue;
    }
    const lastVerified = jourISO(f.lastVerified);
    if (!estJourISO(lastVerified)) {
      invalides.push({ fichier: f.fichier, champ: 'lastVerified', valeur: String(lastVerified), motif: 'date illisible (attendu AAAA-MM-JJ)' });
      continue;
    }
    if (lastVerified > aujourdhui) {
      invalides.push({ fichier: f.fichier, champ: 'lastVerified', valeur: lastVerified, motif: 'date dans le futur : une vérification ne s’atteste pas d’avance' });
      continue;
    }
    fichesAvecDate += 1;
    if (typeof intervalle !== 'number') continue;
    fichesAvecIntervalle += 1;
    const echeance = ajouterJours(lastVerified, intervalle);
    if (estEnRetard(echeance, aujourdhui)) {
      const retard = joursDeRetard(echeance, aujourdhui);
      fichesEnRetard.push({
        fichier: f.fichier,
        collection: f.collection,
        slug: f.slug,
        locale: f.locale,
        title: f.title,
        lastVerified,
        intervalDays: intervalle,
        echeance,
        joursDeRetard: retard,
      });
    }
  }
  fichesEnRetard.sort((a, b) => b.joursDeRetard - a.joursDeRetard || a.fichier.localeCompare(b.fichier));

  return {
    aujourdhui,
    fichesVerifiees: verifs.fichesVerifiees,
    verificationsAvecEcheance: verifs.avecEcheance,
    verificationsEnRetard: verifs.enRetard,
    fichesAvecDate,
    fichesAvecIntervalle,
    fichesEnRetard,
    invalides,
  };
}
