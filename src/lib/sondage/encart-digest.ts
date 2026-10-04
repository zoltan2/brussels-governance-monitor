// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Encart du sondage lecteurs dans le digest, en tête de l'email.
 *
 * Décision du 30/09/2026 : le vrai sondage est ouvert depuis ce jour (et non le
 * 16/11 prévu par la spec § 12), et le prochain digest le propose en haut de
 * l'email. L'encart n'existe qu'en français et en néerlandais (les deux langues
 * du sondage) et seulement tant que la campagne est ouverte : il disparaît seul
 * après SONDAGE_CLOTURE, sans redéploiement.
 */

import { campagneDepuisEnv, etatCampagne, type Campagne } from './campagne';
import { DUREE_ANNONCEE_MINUTES } from './textes';

export interface EncartSondage {
  titre: string;
  texte: string;
  bouton: string;
  url: string;
}

const CHEMIN: Record<string, string> = { fr: '/fr/sondage', nl: '/nl/enquete' };

function jourLisible(jour: string, locale: 'fr' | 'nl'): string {
  return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-BE' : 'nl-BE', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${jour}T12:00:00Z`));
}

export function encartSondageDigest(
  locale: string,
  siteUrl: string,
  maintenant: Date = new Date(),
  campagne: Campagne = campagneDepuisEnv(),
): EncartSondage | null {
  if (locale !== 'fr' && locale !== 'nl') return null;
  if (etatCampagne(maintenant, campagne) !== 'ouverte') return null;

  const url = `${siteUrl}${CHEMIN[locale]}?utm_source=bgm-digest&utm_medium=email&utm_campaign=sondage&utm_content=encart-haut`;
  const cloture = jourLisible(campagne.cloture, locale);
  const duree = DUREE_ANNONCEE_MINUTES;

  // Libellé arrêté par Zoltán le 04/10/2026 : le plus court, sans podcast ni
  // phrase sur les critiques. La durée ne s'affiche que si elle est réglée.
  if (locale === 'fr') {
    return {
      titre: 'Dix questions sur le digest',
      texte:
        `${duree ? `Environ ${duree} minutes, anonyme` : 'Anonyme'}, jusqu'au ${cloture}. ` +
        'Résultats dans le digest du 14 décembre.',
      bouton: 'Répondre au sondage',
      url,
    };
  }
  return {
    titre: 'Tien vragen over de digest',
    texte:
      `${duree ? `Ongeveer ${duree} minuten, anoniem` : 'Anoniem'}, tot ${cloture}. ` +
      'Resultaten in de digest van 14 december.',
    bouton: 'Naar de enquête',
    url,
  };
}
