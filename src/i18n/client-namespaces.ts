// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Espaces de noms de traduction reellement necessaires AU NAVIGATEUR.
 *
 * Pourquoi cette liste existe.
 *
 * `NextIntlClientProvider` recevait `messages` en entier, soit 182 Ko de JSON
 * serialises dans la charge de CHAQUE page. Mesure du 21/09/2026 sur la charge
 * RSC servie en production :
 *
 *   /fr                      260 936 c, dont 160 465 de messages (61 %)
 *   /fr/dossiers/lez         252 292 c, dont 160 465 (64 %)
 *   /fr/communes/schaerbeek  234 448 c, dont 160 465 (68 %)
 *   /fr/quiz                 181 536 c, dont 160 465 (88 %)
 *
 * Et ce contenu ne servait presque jamais : l'espace `explainers` pesait a lui
 * seul 57 767 octets et expediait 345 chaines pour en afficher 4 sur l'accueil.
 * Au total, 136 350 octets appartenaient a des espaces dont moins de 10 % des
 * chaines etaient affichees.
 *
 * Gain mesure : la charge RSC compressee passe de 68 411 a 23 247 octets, soit
 * -45 Ko compresses et -157 Ko bruts PAR VUE. Les composants serveur continuent
 * de lire l'integralite des messages : rien n'est perdu a l'ecran.
 *
 * COMMENT MAINTENIR CETTE LISTE
 *
 * Un espace manquant ici fait lever `MISSING_MESSAGE` dans le navigateur, sur la
 * page concernee. C'est bruyant, donc visible, mais c'est une regression de
 * production : le test `client-namespaces.test.ts` releve donc la liste depuis
 * les fichiers `'use client'` et echoue si elle diverge. Ajouter un
 * `useTranslations('x')` dans un composant client sans ajouter `x` ici casse la
 * CI, pas la production.
 */
export const CLIENT_NAMESPACES = [
  'changelog',
  'dashboard',
  'error',
  'feedback',
  'home',
  'locale',
  'nav',
  'quiz',
  'search',
  'subscribe',
  'subscribeConfirm',
  'subscribePreferences',
  'support',
  'timeline',
  'toolbar',
] as const;

/**
 * Restreint un dictionnaire de messages aux espaces destines au navigateur.
 *
 * Un espace absent du dictionnaire est ignore plutot que pose a `undefined` :
 * next-intl distingue les deux, et un espace vide produit des erreurs plus
 * obscures qu'un espace absent.
 */
export function messagesPourLeClient(
  messages: Record<string, unknown>,
): Record<string, unknown> {
  const reduit: Record<string, unknown> = {};
  for (const espace of CLIENT_NAMESPACES) {
    if (espace in messages) reduit[espace] = messages[espace];
  }
  return reduit;
}
