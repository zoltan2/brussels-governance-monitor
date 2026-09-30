// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Ce que la page du sondage affiche à l'arrivée, selon la période et la
 * session du navigateur (cookie). Lu côté serveur, passé au composant client.
 */
import type { DatabaseSync } from 'node:sqlite';
import { etatCampagne, type Campagne } from './campagne';
import { etapeDeReprise, type Etape, type Reponses } from './questionnaire';
import { lireReponse } from './store';

export type EtatInitial =
  | { mode: 'clos' }
  | { mode: 'pas_encore' }
  | { mode: 'indisponible' }
  | { mode: 'termine' }
  | { mode: 'accueil' }
  | { mode: 'reprise'; reponses: Reponses; etape: Etape };

export function etatInitial(
  db: DatabaseSync | null,
  session: string | undefined,
  maintenant: Date,
  campagne: Campagne,
): EtatInitial {
  const periode = etatCampagne(maintenant, campagne);
  if (periode === 'close') return { mode: 'clos' };
  if (periode === 'pas_encore') return { mode: 'pas_encore' };
  if (!db) return { mode: 'indisponible' };
  const ligne = session ? lireReponse(db, session) : null;
  if (!ligne) return { mode: 'accueil' };
  // Verrou : un questionnaire terminé ne se rouvre pas.
  if (ligne.termine) return { mode: 'termine' };
  if (ligne.etape === 'accueil') return { mode: 'accueil' };
  return { mode: 'reprise', reponses: ligne.reponses, etape: etapeDeReprise(ligne.reponses, ligne.etape) };
}
