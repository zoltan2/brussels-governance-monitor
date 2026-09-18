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
