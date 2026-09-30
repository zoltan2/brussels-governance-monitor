// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Validation stricte d'un envoi du sondage : un corps par écran.
 *
 * Chaque question n'accepte que sa liste fermée de valeurs (questionnaire.ts) ;
 * toute clé inconnue est refusée (`.strict()`), ce qui empêche un appelant de
 * glisser un champ libre dans le JSON enregistré. Les textes libres sont bornés.
 * Le champ piège `site` est accepté par le schéma pour que sa présence ne se lise
 * pas dans une erreur ; la route le traite AVANT la validation.
 */
import { z } from 'zod';
import {
  AUTRE_MAX,
  LANGUES_SONDAGE,
  OPTIONS,
  Q5_ETATS,
  Q5_NOMS,
  Q8_MAX,
  type EtapeChoix,
} from './questionnaire';

const piege = z.string().max(500).optional();

function choix<E extends EtapeChoix>(etape: E, obligatoire: boolean) {
  const valeurs = z.enum(OPTIONS[etape] as unknown as [string, ...string[]]);
  return z
    .object({
      etape: z.literal(etape),
      reponse: z.object({ valeur: obligatoire ? valeurs : valeurs.nullable() }).strict(),
      site: piege,
    })
    .strict();
}

function choixAvecAutre<E extends 'q1b' | 'q7'>(etape: E) {
  const valeurs = z.enum(OPTIONS[etape] as unknown as [string, ...string[]]);
  return z
    .object({
      etape: z.literal(etape),
      reponse: z
        .object({ valeur: valeurs.nullable(), autre: z.string().max(AUTRE_MAX).optional() })
        .strict(),
      site: piege,
    })
    .strict();
}

const etatQ5 = z.enum(Q5_ETATS);
const lignesQ5 = z
  .object(Object.fromEntries(Q5_NOMS.map((n) => [n, etatQ5.optional()])) as Record<
    (typeof Q5_NOMS)[number],
    z.ZodOptional<typeof etatQ5>
  >)
  .strict();

export const corpsSondageSchema = z.discriminatedUnion('etape', [
  z
    .object({
      etape: z.literal('accueil'),
      langue: z.enum(LANGUES_SONDAGE),
      pilote: z.boolean().optional(),
      site: piege,
    })
    .strict(),
  choix('q1', true),
  choixAvecAutre('q1b'),
  choix('q2', true),
  choix('q3', false),
  choix('q4', false),
  choix('q4a', false),
  choix('q4b', false),
  z
    .object({ etape: z.literal('q5'), reponse: z.object({ lignes: lignesQ5 }).strict(), site: piege })
    .strict(),
  choix('q6a', false),
  choix('q6b', false),
  choixAvecAutre('q7'),
  z
    .object({
      etape: z.literal('q8'),
      reponse: z
        .object({ texte: z.string().max(Q8_MAX), citation: z.enum(['oui', 'non']) })
        .strict(),
      site: piege,
    })
    .strict(),
  z
    .object({
      etape: z.literal('q9'),
      reponse: z
        .object({
          valeur: z.enum(OPTIONS.q9).nullable(),
          email: z.string().max(254).optional(),
        })
        .strict(),
      site: piege,
    })
    .strict(),
]);

export type CorpsSondage = z.infer<typeof corpsSondageSchema>;
