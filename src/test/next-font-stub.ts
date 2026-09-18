// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

// next/font n'existe qu'au travers du compilateur de Next : hors build, l'import
// échoue et entraîne toute la suite qui le touche, même indirectement. Chaque
// police utilisée par un module testé doit figurer ici, sous son nom exact.
const police = () => ({ className: '', variable: '', style: { fontFamily: 'serif' } });

export const Archivo = police;
export const DM_Serif_Display = police;
export const Inter = police;
