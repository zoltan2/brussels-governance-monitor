// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Traitement d'un envoi du sondage (un POST par écran), sans rien de Next.js :
 * la route (src/app/api/sondage/route.ts) ne fait que lire la requête et
 * appliquer le résultat. Tout ce qui se décide ici est testé dans
 * traitement.test.ts.
 *
 * Ordre des gardes, du moins coûteux au plus coûteux :
 *   1. période de campagne (410 hors période, avant toute lecture) ;
 *   2. limite par IP ;
 *   3. champ piège : un robot qui le remplit reçoit un succès, rien n'est écrit ;
 *   4. validation stricte (liste fermée de valeurs par question) ;
 *   5. session : création à « Commencer », limite par session, verrou après la fin ;
 *   6. parcours : une étape hors parcours est refusée ;
 *   7. à la fin : obligatoires présentes, durée active d'au moins 20 s, sinon la
 *      réponse est ignorée (supprimée) sans que l'appelant le sache.
 *
 * Durée active : mesurée par le SERVEUR, jamais déclarée par le navigateur. Elle
 * additionne les intervalles entre deux envois d'une même session, chacun
 * plafonné à 10 minutes (une pause café ne compte pas). Le dernier instant vu est
 * gardé EN MÉMOIRE seulement : la base ne reçoit que des jours, jamais une heure.
 * Un redémarrage du serveur perd l'intervalle en cours, pas les autres.
 */
import type { DatabaseSync } from 'node:sqlite';
import { rateLimit } from '@/lib/rate-limit';
import { emailValide } from '@/lib/stuut';
import { etatCampagne, jourBruxelles, type Campagne } from './campagne';
import {
  AUTRE_MAX,
  ETAPES_AVEC_AUTRE,
  VERSION_QUESTIONNAIRE,
  nettoyer,
  obligatoireManquante,
  parcours,
  etapeSuivante,
  type Etape,
  type Reponses,
} from './questionnaire';
import { corpsSondageSchema, type CorpsSondage } from './validation';
import {
  ajouterEntretien,
  creerReponse,
  lireReponse,
  majReponse,
  nouvelleSession,
  supprimerReponse,
} from './store';

/** Une réponse terminée en moins de ce temps actif est ignorée (§ 13, anti-robots). */
export const DUREE_MIN_MS = 20_000;
/** Plafond d'un intervalle entre deux écrans dans le calcul de la durée active. */
export const INTERVALLE_MAX_MS = 10 * 60_000;
/** Spec § 7 : 60 envois par minute et par session, 120 par IP. */
export const LIMITE_SESSION = 60;
export const LIMITE_IP = 120;
/** Nouvelles sessions par IP et par heure : un bureau derrière une même IP reste servi. */
export const LIMITE_CREATION_IP = 30;

export type Resultat = {
  status: number;
  corps: Record<string, unknown>;
  /** Session à poser en cookie (création). */
  session?: string;
};

export interface Dependances {
  db: DatabaseSync;
  maintenant: Date;
  campagne: Campagne;
  piloteEnv: boolean;
  /** Dernier envoi vu par session, en ms. Mémoire seulement. */
  vus?: Map<string, number>;
  genererSession?: () => string;
}

const VUS_MAX = 5_000;
const vusParDefaut = new Map<string, number>();

function noterVu(vus: Map<string, number>, session: string, ms: number) {
  vus.delete(session);
  vus.set(session, ms);
  // Bornée : la plus ancienne entrée part d'abord (ordre d'insertion d'une Map).
  while (vus.size > VUS_MAX) {
    const premiere = vus.keys().next().value;
    if (premiere === undefined) break;
    vus.delete(premiere);
  }
}

function refus(status: number, erreur: string, extra: Record<string, unknown> = {}): Resultat {
  return { status, corps: { ok: false, erreur, ...extra } };
}

/** La réponse telle qu'elle sera stockée : textes rognés, « autre » seulement si choisi, jamais d'adresse. */
function reponseAStocker(c: Exclude<CorpsSondage, { etape: 'accueil' }>): Reponses[keyof Reponses] {
  switch (c.etape) {
    case 'q5':
      return { lignes: c.reponse.lignes };
    case 'q8': {
      const texte = c.reponse.texte.trim();
      // Sans texte, rien à citer : l'autorisation n'a pas de sens.
      return { texte, citation: texte ? c.reponse.citation : 'non' };
    }
    case 'q9':
      return { valeur: c.reponse.valeur };
    default: {
      const rep = c.reponse as { valeur: string | null; autre?: string };
      const avecAutre = (ETAPES_AVEC_AUTRE as readonly string[]).includes(c.etape);
      const autre = avecAutre && rep.valeur === 'autre' ? (rep.autre ?? '').trim().slice(0, AUTRE_MAX) : '';
      return autre ? { valeur: rep.valeur, autre } : { valeur: rep.valeur };
    }
  }
}

export function traiterEnvoi(
  entree: { corps: unknown; session?: string; ip: string },
  deps: Dependances,
): Resultat {
  const { db, maintenant } = deps;
  const vus = deps.vus ?? vusParDefaut;
  const ms = maintenant.getTime();

  // 1. Hors période : rien n'est lu ni écrit.
  const etat = etatCampagne(maintenant, deps.campagne);
  if (etat !== 'ouverte') return refus(410, etat === 'close' ? 'sondage_clos' : 'sondage_pas_ouvert');

  // 2. Limite par IP.
  if (!rateLimit(entree.ip, { bucket: 'sondage-ip', max: LIMITE_IP }).allowed) {
    return refus(429, 'trop_de_requetes');
  }

  // 3. Champ piège, avant la validation : un robot qui remplit tout ne doit pas
  //    apprendre, par une erreur, lequel des champs l'a trahi.
  const brut = entree.corps as { site?: unknown } | null;
  if (brut && typeof brut === 'object' && typeof brut.site === 'string' && brut.site !== '') {
    return { status: 200, corps: { ok: true } };
  }

  // 4. Validation stricte.
  const lu = corpsSondageSchema.safeParse(entree.corps);
  if (!lu.success) return refus(400, 'invalide');
  const c = lu.data;
  const jour = jourBruxelles(maintenant);

  const existante = entree.session ? lireReponse(db, entree.session) : null;

  // 5a. « Commencer » : reprend la session en cours, ou en crée une.
  if (c.etape === 'accueil') {
    if (existante) {
      if (existante.termine) return refus(409, 'deja_termine');
      noterVu(vus, existante.session, ms);
      return { status: 200, corps: { ok: true, suivante: parcours(existante.reponses)[0] } };
    }
    if (!rateLimit(entree.ip, { bucket: 'sondage-creation', max: LIMITE_CREATION_IP, windowMs: 3_600_000 }).allowed) {
      return refus(429, 'trop_de_requetes');
    }
    const session = (deps.genererSession ?? nouvelleSession)();
    creerReponse(db, {
      session,
      langue: c.langue,
      version: VERSION_QUESTIONNAIRE,
      jour,
      pilote: deps.piloteEnv || c.pilote === true,
    });
    noterVu(vus, session, ms);
    return { status: 200, corps: { ok: true, suivante: 'q1' }, session };
  }

  // 5b. Toute autre étape exige une session existante.
  if (!existante) return refus(409, 'session_absente');
  if (!rateLimit(existante.session, { bucket: 'sondage-session', max: LIMITE_SESSION }).allowed) {
    return refus(429, 'trop_de_requetes');
  }
  // 5c. Verrou : une réponse terminée ne se modifie plus.
  if (existante.termine) return refus(409, 'deja_termine');

  // 6. Parcours : l'étape doit y figurer, compte tenu de la réponse qu'elle apporte.
  const etape = c.etape as Etape;
  const fusion: Reponses = { ...existante.reponses, [etape]: reponseAStocker(c) };
  if (!parcours(fusion).includes(etape)) return refus(409, 'hors_parcours');

  // Q9 : l'adresse n'est retenue que si « oui » ET valide.
  let email: string | null = null;
  if (c.etape === 'q9' && c.reponse.valeur === 'oui') {
    const saisie = (c.reponse.email ?? '').trim();
    if (!saisie) return refus(400, 'email_vide');
    if (!emailValide(saisie)) return refus(400, 'email_invalide');
    email = saisie.toLowerCase();
  }

  const reponses = nettoyer(fusion);
  const precedent = vus.get(existante.session);
  const intervalle = precedent === undefined ? 0 : Math.min(Math.max(ms - precedent, 0), INTERVALLE_MAX_MS);
  const duree = existante.duree_ms + intervalle;
  noterVu(vus, existante.session, ms);

  // 7. Dernière étape : fin du parcours.
  if (etape === 'q9') {
    const manquante = obligatoireManquante(reponses);
    if (manquante) {
      majReponse(db, { session: existante.session, reponses, etape, duree_ms: duree, jour, termine: false });
      return refus(400, 'incomplet', { etape: manquante });
    }
    if (duree < DUREE_MIN_MS) {
      // Trop rapide pour un humain : ignorée. L'appelant voit un succès, et
      // aucune adresse n'est enregistrée.
      supprimerReponse(db, existante.session);
      vus.delete(existante.session);
      return { status: 200, corps: { ok: true, termine: true } };
    }
    db.exec('BEGIN');
    try {
      majReponse(db, { session: existante.session, reponses, etape: 'fin', duree_ms: duree, jour, termine: true });
      if (email) ajouterEntretien(db, { email, langue: existante.langue, jour });
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    vus.delete(existante.session);
    return { status: 200, corps: { ok: true, termine: true } };
  }

  majReponse(db, { session: existante.session, reponses, etape, duree_ms: duree, jour, termine: false });
  return { status: 200, corps: { ok: true, suivante: etapeSuivante(reponses, etape) } };
}
