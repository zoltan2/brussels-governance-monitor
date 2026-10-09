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

  // Libellé arrêté par Zoltán le 09/10/2026 : le titre interroge le lecteur, le
  // texte dit à quoi servent les réponses. Ni podcast ni phrase sur les
  // critiques (04/10/2026). La durée ne s'affiche que si elle est réglée.
  if (locale === 'fr') {
    return {
      titre: 'Que faut-il changer au digest ?',
      texte:
        `Dix questions, ${duree ? `environ ${duree} minutes, ` : ''}anonyme, jusqu'au ${cloture}. ` +
        'Vos réponses décident de la suite. Résultats dans le digest du 14 décembre.',
      bouton: 'Répondre au sondage',
      url,
    };
  }
  return {
    titre: 'Wat moet er veranderen aan de digest?',
    texte:
      `Tien vragen, ${duree ? `ongeveer ${duree} minuten, ` : ''}anoniem, tot ${cloture}. ` +
      'Uw antwoorden bepalen het vervolg. Resultaten in de digest van 14 december.',
    bouton: 'Naar de enquête',
    url,
  };
}
