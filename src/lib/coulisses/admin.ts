// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Coulisses, côté admin : lecture de l'état d'un rendez-vous et validation des
 * textes reçus de la page. Partagé par /api/admin/coulisses et ses sous-routes.
 */
import type { DatabaseSync } from 'node:sqlite';
import * as J from './journal';
import { contenuDuRendezVous, contenuIncomplet } from './envoi';
import { contientRepereSondage, nettoyerCorps } from './corps';
import { BLOCAGE_MINUTES } from './journal';
import { estJourDEnvoi, moisValide, premierJeudi, prochainRendezVous } from './calendrier';
import { jourABruxelles } from '@/lib/jours-ecoules';

// HTML de l'éditeur : les balises comptent, d'où une marge large.
export const LONGUEUR_MAX = 60_000;
const OBJET_MAX = 300;
const APERCU_MAX = 200;
const LANGUES = ['fr', 'nl', 'en'] as const;

type Brut = Record<string, unknown> | undefined;

function chaine(v: unknown, max: number, uneLigne: boolean): string | null {
  const s = v ?? '';
  if (typeof s !== 'string' || s.length > max) return null;
  // Objet et aperçu sont des en-têtes ou leur voisin : jamais de retour à la ligne.
  if (uneLigne && /[\r\n]/.test(s)) return null;
  return s;
}

/** Textes d'une édition ou de la bienvenue, validés et nettoyés ; null si invalides. */
export function lireTextes(brut: unknown, avecSondage: boolean): J.TextesBienvenue | null {
  const t = (brut ?? {}) as Record<string, Brut>;
  const sortie = {} as J.TextesBienvenue;
  for (const l of LANGUES) {
    const objet = chaine(t[l]?.objet, OBJET_MAX, true);
    const apercu = chaine(t[l]?.apercu, APERCU_MAX, true);
    const corps = chaine(t[l]?.corps, LONGUEUR_MAX, false);
    const sondage = avecSondage ? chaine(t[l]?.sondage, LONGUEUR_MAX, false) : '';
    if (objet === null || apercu === null || corps === null || sondage === null) return null;
    sortie[l] = { objet: objet.trim(), apercu: apercu.trim(), corps: nettoyerCorps(corps) };
    if (avecSondage) sortie[l].sondage = nettoyerCorps(sondage);
  }
  return sortie;
}

/** Corps toujours rendus en HTML : un ancien texte brut s'ouvre en paragraphes. */
function pourEditeur<T extends J.TexteLangue>(t: Partial<Record<string, T>>): Partial<Record<string, T>> {
  return Object.fromEntries(
    Object.entries(t).map(([l, v]) => [
      l,
      v && { ...v, apercu: v.apercu ?? '', corps: nettoyerCorps(v.corps ?? '') },
    ]),
  ) as Partial<Record<string, T>>;
}

export function etatAdmin(db: DatabaseSync, moisDemande: unknown, maintenant = Date.now()) {
  const mois = moisValide(moisDemande) ? moisDemande : prochainRendezVous(new Date(maintenant)).mois;
  const numero = J.numeroDuMois(db, mois);
  const c = numero !== null ? contenuDuRendezVous(db, numero, maintenant) : null;
  const bienvenue = J.lireBienvenue(db);
  const n = c?.numero ?? null;
  return {
    mois,
    jour: premierJeudi(mois),
    jourDEnvoi: estJourDEnvoi(mois, new Date(maintenant)),
    numero,
    edition: n ? pourEditeur(n.textes) : {},
    bienvenue: bienvenue ? { version: bienvenue.version, creeLe: bienvenue.creeLe, textes: pourEditeur(bienvenue.textes) } : null,
    // Le repère manque dans une langue qui a un bloc : le bloc ne partirait pas.
    repereManquant: bienvenue
      ? LANGUES.filter((l) => bienvenue.textes[l]?.sondage && !contientRepereSondage(bienvenue.textes[l].corps))
      : [],
    // Lien vers le sondage écrit dans le texte même, hors du bloc : il resterait après la clôture.
    sondageEnDur: bienvenue
      ? LANGUES.filter((l) => /\/sondage\b/.test(bienvenue.textes[l]?.corps ?? ''))
      : [],
    // Numéros d'avant la séparation restés sans mois : invisibles ici, à signaler.
    orphelins: (db.prepare(`SELECT numero FROM coulisses_numeros WHERE mois IS NULL AND etat != 'envoye'`).all() as Array<{ numero: number }>).map((r) => r.numero),
    sondageOuvert: c?.sondageOuvert ?? null,
    etat: n?.etat ?? 'brouillon',
    verrouLe: n?.verrouLe ?? null,
    bloque: Boolean(n && n.etat === 'envoi' && n.verrouLe && maintenant - n.verrouLe > BLOCAGE_MINUTES * 60_000),
    essaiLe: n?.essaiLe ?? null,
    essaiAJour: Boolean(c && n?.essaiEmpreinte && n.essaiEmpreinte === c.empreinte),
    incomplet: c ? contenuIncomplet(c) : bienvenue && J.textesComplets(bienvenue.textes) ? null : 'Bienvenue incomplète.',
    rapport: n?.rapport ?? null,
    journal: numero !== null ? J.compterJournal(db, numero) : {},
    exclusConfigures: process.env.COULISSES_EXCLUS !== undefined,
  };
}

/** Jours de calendrier, à Bruxelles, d'aujourd'hui jusqu'à `jour` (0 le jour même). */
export function joursRestants(jour: string, maintenant: Date): number {
  return Math.round((Date.parse(`${jour}T00:00:00Z`) - Date.parse(`${jourABruxelles(maintenant)}T00:00:00Z`)) / 86_400_000);
}

/** Ce qui manque au rendez-vous, ou [] s'il est prêt.  */
export function manques(e: ReturnType<typeof etatAdmin>): string[] {
  if (e.etat !== 'brouillon' && e.etat !== 'interrompu') return [];
  const m: string[] = [];
  if (e.incomplet) m.push(e.incomplet);
  if (e.repereManquant.length) m.push(`Repère [sondage] absent de la bienvenue (${e.repereManquant.join(', ')}).`);
  if (e.sondageEnDur.length) m.push(`Lien vers le sondage écrit dans le texte de la bienvenue (${e.sondageEnDur.join(', ')}) : le mettre dans le bloc sondage.`);
  if (!e.essaiAJour) m.push('Pas d’essai sur le contenu actuel.');
  return m;
}

