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

  if (locale === 'fr') {
    return {
      titre: 'Dix questions sur le digest (et le podcast)',
      texte:
        `${duree ? `Environ ${duree} minutes, anonyme.` : 'Anonyme.'} Les critiques nous aident plus que les compliments. ` +
        `Réponses jusqu'au ${cloture}, résultats dans le digest du 14 décembre.`,
      bouton: 'Répondre au sondage',
      url,
    };
  }
  return {
    titre: 'Tien vragen over de digest (en de podcast)',
    texte:
      `${duree ? `Ongeveer ${duree} minuten, anoniem.` : 'Anoniem.'} Kritiek helpt ons meer dan complimenten. ` +
      `Antwoorden tot ${cloture}, resultaten in de digest van 14 december.`,
    bouton: 'Naar de enquête',
    url,
  };
}
