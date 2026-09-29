// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

import { useEffect, useState } from 'react';

/**
 * Classe des boutons flottants tant que le lecteur n'a pas bougé : masqués sous
 * 768 px, inchangés au-delà. À poser sur l'élément `fixed` lui-même.
 *
 * Pourquoi (revue de l'accueil du 28/09/2026, équipe Design, P3) : sous 1 096 px le
 * contenu occupe toute la largeur, donc tout élément flottant recouvre quelque chose.
 * À l'ouverture en 390 × 844, la bulle de l'assistant et le bouton d'accessibilité
 * recouvraient le lien du baromètre, l'onglet des jeux le bord des deux boutons du
 * héros ; en 375 × 667, la bulle couvrait un lien d'une page de dossier. Décaler ou
 * réduire ne fait que changer ce qui est recouvert. Attendre le premier geste règle
 * le premier écran partout, sans toucher au bureau.
 */
export const HIDDEN_UNTIL_SCROLL = 'max-md:hidden';

/**
 * Vrai dès que le lecteur a fait défiler la page, appuyé sur Tab, ou si la page ne
 * défile pas (sinon les boutons n'y apparaîtraient jamais). Une fois vrai, le reste :
 * un bouton qui disparaît en remontant en haut de page serait un piège pour le doigt
 * et pour le focus (le panneau des jeux rend le focus à son onglet en se fermant).
 *
 * Rendu serveur : faux, donc aucun bouton ne clignote sur mobile avant l'hydratation.
 */
export function useRevealOnScroll(): boolean {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (revealed) return;
    const root = document.documentElement;
    const reveal = () => setRevealed(true);
    const onScroll = () => {
      if (window.scrollY > 0) reveal();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') reveal();
    };
    // Retour arrière avec défilement restauré, ou page plus courte que l'écran.
    // Différé d'une image : pas de setState synchrone dans l'effet.
    const first = requestAnimationFrame(() => {
      if (window.scrollY > 0 || root.scrollHeight <= window.innerHeight) reveal();
    });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(first);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('keydown', onKey);
    };
  }, [revealed]);

  return revealed;
}
