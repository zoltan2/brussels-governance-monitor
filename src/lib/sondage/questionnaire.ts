// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Sondage lecteurs du digest : structure du questionnaire (V3, validée par
 * Zoltán le 30/09/2026). Spec : bgm-ops specs/2026-09-25-sondage-lecteurs-design.md, § 13.
 *
 * Module PUR, sans dépendance serveur : il est lu par la page (client) et par la
 * route d'enregistrement (serveur). Les valeurs ci-dessous sont les SEULES que
 * la route accepte (src/lib/sondage/validation.ts) : une liste fermée par
 * question. Les libellés affichés vivent dans ./textes.ts.
 *
 * Le schéma de stockage est figé (src/lib/db.ts) ; les réponses sont un JSON
 * dont les clés sont les étapes ci-dessous. Changer une valeur après le pilote
 * rendrait les réponses déjà reçues illisibles : passer par une nouvelle
 * VERSION_QUESTIONNAIRE.
 */

export const VERSION_QUESTIONNAIRE = 'v3';

/** Le questionnaire n'existe qu'en français et en néerlandais (décision du 30/09). */
export const LANGUES_SONDAGE = ['fr', 'nl'] as const;
export type LangueSondage = (typeof LANGUES_SONDAGE)[number];

export function estLangueSondage(v: string): v is LangueSondage {
  return (LANGUES_SONDAGE as readonly string[]).includes(v);
}

/** Toutes les étapes possibles, dans l'ordre du parcours le plus long. */
export const ETAPES = [
  'q1',
  'q1b',
  'q2',
  'q3',
  'q4',
  'q4a',
  'q4b',
  'q5',
  'q6a',
  'q6b',
  'q7',
  'q8',
  'q9',
] as const;
export type Etape = (typeof ETAPES)[number];

/** Questions à réponse unique : leurs valeurs autorisées. */
export const OPTIONS = {
  q1: ['toujours', 'souvent', 'parfois', 'rarement', 'jamais'],
  q1b: ['trop_long', 'mauvais_moment', 'sujets', 'trop_newsletters', 'habitude', 'autre'],
  q2: ['manquerait', 'regrettable', 'autre_chose', 'pas_remarque'],
  q3: ['aucun', 'un', 'deux_trois', 'plus_de_trois'],
  q4: ['souvent', 'de_temps_en_temps', 'rarement', 'jamais'],
  q4a: ['sujet', 'cette_semaine', 'commune', 'chiffres', 'verification', 'autre'],
  q4b: ['digest_suffit', 'temps', 'sais_pas', 'pas_convaincu', 'autre'],
  q6a: ['plusieurs', 'une_deux', 'connu', 'inconnu'],
  q6b: ['surement', 'peut_etre', 'probablement_pas', 'pas_podcasts'],
  q7: ['plus_court', 'consequences', 'responsables', 'suite', 'liens', 'rien', 'autre'],
  q9: ['oui', 'non'],
} as const;

export type EtapeChoix = keyof typeof OPTIONS;

/** Étapes qui portent un champ court « autre » (§ 13 : Q1b et Q7 seulement). */
export const ETAPES_AVEC_AUTRE = ['q1b', 'q7'] as const;
export const AUTRE_MAX = 120;

/** Q5 : une ligne par nom, trois états, rien de coché d'avance. */
export const Q5_NOMS = ['magazine', 'signal', 'stuut', 'amai', 'quiz', 'question_du_jour', 'radar'] as const;
export type NomQ5 = (typeof Q5_NOMS)[number];
export const Q5_ETATS = ['inconnu', 'connu', 'utilise'] as const;
export type EtatQ5 = (typeof Q5_ETATS)[number];

/** Q8 : 200 caractères, compteur visible. */
export const Q8_MAX = 200;

/** Seules Q1 et Q2 sont obligatoires, et Q2 seulement quand elle est sur le parcours. */
export const OBLIGATOIRES: readonly Etape[] = ['q1', 'q2'];

export type ReponseChoix = { valeur: string | null; autre?: string };
export type ReponseQ5 = { lignes: Partial<Record<NomQ5, EtatQ5>> };
export type ReponseQ8 = { texte: string; citation: 'oui' | 'non' };
/** Q9 : l'adresse n'est JAMAIS dans les réponses ; elle va, seule, dans sondage_entretiens. */
export type ReponseQ9 = { valeur: 'oui' | 'non' | null };

export type Reponses = Partial<{
  q1: ReponseChoix;
  q1b: ReponseChoix;
  q2: ReponseChoix;
  q3: ReponseChoix;
  q4: ReponseChoix;
  q4a: ReponseChoix;
  q4b: ReponseChoix;
  q5: ReponseQ5;
  q6a: ReponseChoix;
  q6b: ReponseChoix;
  q7: ReponseChoix;
  q8: ReponseQ8;
  q9: ReponseQ9;
}>;

function valeur(r: Reponses, e: EtapeChoix): string | null {
  const rep = r[e as keyof Reponses] as ReponseChoix | undefined;
  return rep?.valeur ?? null;
}

/**
 * Le parcours réel, selon les réponses déjà données.
 *  - Q1 « rarement » ou « jamais » : Q1b, puis directement Q7.
 *  - Q4 « souvent » ou « de temps en temps » : Q4a ; « rarement » ou « jamais » : Q4b ;
 *    Q4 non répondue : ni l'une ni l'autre.
 * La barre de progression suit ce parcours.
 */
export function parcours(r: Reponses): Etape[] {
  const q1 = valeur(r, 'q1');
  if (q1 === 'rarement' || q1 === 'jamais') return ['q1', 'q1b', 'q7', 'q8', 'q9'];
  const etapes: Etape[] = ['q1', 'q2', 'q3', 'q4'];
  const q4 = valeur(r, 'q4');
  if (q4 === 'souvent' || q4 === 'de_temps_en_temps') etapes.push('q4a');
  else if (q4 === 'rarement' || q4 === 'jamais') etapes.push('q4b');
  etapes.push('q5', 'q6a', 'q6b', 'q7', 'q8', 'q9');
  return etapes;
}

/** L'étape qui suit `etape` sur le parcours, `null` après la dernière. */
export function etapeSuivante(r: Reponses, etape: Etape): Etape | null {
  const p = parcours(r);
  const i = p.indexOf(etape);
  if (i === -1) return null;
  return p[i + 1] ?? null;
}

/** L'étape qui précède `etape` sur le parcours, `null` avant la première. */
export function etapePrecedente(r: Reponses, etape: Etape): Etape | null {
  const p = parcours(r);
  const i = p.indexOf(etape);
  return i > 0 ? p[i - 1] : null;
}

/**
 * Retire les réponses devenues hors parcours. Exemple : Q1 passe de « rarement »
 * à « souvent » ; la réponse à Q1b ne décrit plus ce lecteur.
 */
export function nettoyer(r: Reponses): Reponses {
  const p = new Set(parcours(r));
  const out: Reponses = {};
  for (const [cle, rep] of Object.entries(r)) {
    if (p.has(cle as Etape)) (out as Record<string, unknown>)[cle] = rep;
  }
  return out;
}

/** Première obligatoire du parcours restée sans réponse, `null` si tout est là. */
export function obligatoireManquante(r: Reponses): Etape | null {
  for (const e of parcours(r)) {
    if (!OBLIGATOIRES.includes(e)) continue;
    if (valeur(r, e as EtapeChoix) === null) return e;
  }
  return null;
}

/**
 * Où reprendre un questionnaire commencé : l'étape qui suit la dernière
 * enregistrée, ou la première si rien n'a été enregistré.
 */
export function etapeDeReprise(r: Reponses, derniere: string): Etape {
  const p = parcours(r);
  const i = p.indexOf(derniere as Etape);
  if (i === -1) return p[0];
  return p[Math.min(i + 1, p.length - 1)];
}
