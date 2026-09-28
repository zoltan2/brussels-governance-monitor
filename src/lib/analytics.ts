// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Envoi d'un événement personnalisé à Umami, et déclaration du type global.
 *
 * Source unique. Avant ce fichier, le dépôt portait DEUX façons de faire la même
 * chose : une fonction `track` privée dans `components/quiz/bgm-quiz.tsx`, et un
 * appel direct `window.umami?.track(...)` dans la page de retour du digest, qui
 * déclarait elle-même `Window.umami` avec un type plus étroit
 * (`Record<string, string>`). C'est cette étroitesse qui obligeait le quiz à
 * recaster `window` pour passer des nombres. Une garde recopiée finit toujours
 * par diverger de son original.
 *
 * Deux façons de mesurer coexistent, et c'est voulu :
 *   - les LIENS portent `data-umami-event` en attribut, sans JavaScript : le
 *     tracker d'Umami s'en charge, et la mesure survit à une erreur de rendu ;
 *   - les ACTIONS sans navigation (ouvrir le panneau, changer d'onglet, répondre)
 *     passent par `track()`, faute d'élément à annoter au bon moment.
 *
 * ⚠️ Le script porte `data-domains="governance.brussels"` : rien ne part depuis
 * localhost ni depuis une préproduction. En développement, `track()` est un
 * no-op silencieux et les attributs sont inertes. On peut vérifier le balisage,
 * jamais la réception : celle-ci ne se constate qu'en production.
 */

declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: Record<string, string | number>) => void;
    };
  }
}

/**
 * Envoie un événement. Sans opération si Umami n'est pas chargé : bloqueur de
 * publicité, variable d'environnement absente, ou domaine non autorisé. Ne doit
 * jamais lever : une mesure qui casse la page coûte plus cher qu'une mesure
 * manquante.
 */
export function track(event: string, data?: Record<string, string | number>): void {
  if (typeof window === 'undefined') return;
  window.umami?.track(event, data);
}

/**
 * Clé que le traceur Umami lit avant CHAQUE envoi. Vérifié dans le traceur servi
 * en production le 28/09/2026 (4 595 octets, SHA-256 be444c28…) : `W=()=>…||g?.getItem("umami.disabled")||…`, où `g` est
 * `window.localStorage`, puis `C=async(e,a)=>{if(W())return; …}`. Toute valeur
 * non vide coupe l'envoi : pages vues, événements et Web Vitals.
 */
export const UMAMI_DISABLED_KEY = 'umami.disabled';

/**
 * Exclut CET appareil des statistiques, pour de bon.
 *
 * Pourquoi : la revue du 28/09/2026 a montré que 14 des 23 clics « fait du
 * jour » venaient d'appareils ayant ouvert /admin. Le filtre `before-send`
 * n'écarte que les URL d'administration ; l'accueil vu par le propriétaire
 * restait compté et faussait le classement des blocs.
 *
 * Appelée par `UmamiOwnerOptOut`, monté dans les layouts /admin et /review,
 * donc seulement après authentification. Le marquage n'est JAMAIS retiré
 * automatiquement (ni à la déconnexion, ni après un délai) : un appareil qui a
 * servi à administrer le site reste exclu. Pour le réintégrer, à la main dans
 * la console du navigateur : `localStorage.removeItem('umami.disabled')`.
 *
 * Ne lève jamais : en navigation privée, stockage plein ou bloqué, l'accès à
 * `localStorage` peut lever ; on renonce alors en silence, comme `track()`.
 */
export function excludeThisDeviceFromAnalytics(): void {
  try {
    window.localStorage.setItem(UMAMI_DISABLED_KEY, '1');
  } catch {
    // Stockage indisponible : l'appareil restera compté, rien de plus grave.
  }
}

/**
 * Zones de la navigation commune : propriété `zone` de l'événement unique
 * `navigation-clic`, dont la page de destination part dans `cible`.
 */
export type NavigationZone = 'entete' | 'entete-menu' | 'entete-mobile' | 'pied-de-page';
