// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

// Les polices d'identité des deux jeux quotidiens, servies par next/font depuis
// notre propre origine. Les jeux autonomes les chargent autrement (fichiers
// locaux pour le Stuut, Google Fonts pour Amai) : repris tels quels ici, un
// @import vers fonts.googleapis.com serait bloqué par notre CSP (`font-src
// 'self'`), et c'est très bien ainsi.
//
// `preload: false` : le panneau de jeux vit dans le layout, donc sur toutes les
// pages. Précharger ces polices ferait payer chaque visite pour un panneau que
// la plupart n'ouvrent pas. Elles se chargent à l'ouverture, `swap` évite le
// texte invisible pendant ce temps.
//
// Isolé dans ce module pour une raison de test : next/font n'existe qu'au
// travers du compilateur de Next. Vitest le remplace par un bouchon
// (vitest.config.ts → src/test/next-font-stub.ts).
import { Archivo, DM_Serif_Display } from 'next/font/google';

/** Titres et verdicts du Stuut. */
export const policeStuut = DM_Serif_Display({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  preload: false,
});

/** Chiffres et titres d'Amai, police variable en largeur (l'identité du jeu). */
export const policeAmai = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  display: 'swap',
  preload: false,
});
