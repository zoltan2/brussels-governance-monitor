// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { isNumericFigure } from './key-figure';

describe('isNumericFigure', () => {
  // Nombres, y compris avec une unité écrite en toutes lettres : relevés dans
  // le contenu le 23/09/2026, dans les quatre langues.
  it.each([
    '62 234', '~30', '+17 %', '23,2 %', '36%', '400M', '1,5 k', '204 147', '500 000', '20,3', '3',
    '~430 millions', '~430 miljoen', '~430 million', '~430 Millionen',
    '~3,4 millions tonnes/an', '~3,4 Mio. Tonnen/Jahr',
    '1 an', '1 jaar', '1 year', '1 Jahr', '12 ans',
    '57,8 M EUR', '€57.8M', '2 950 vers 3 457', '5 000+',
  ])('traite « %s » comme un nombre', (v) => expect(isNumericFigure(v)).toBe(true));

  // Phrases et dates : elles gardent la taille du texte courant.
  it.each([
    'Budget 2026 voté en plénière (53/32)', '2026 budget voted in plenary (53/32)',
    'toutes', 'alle', 'all', 'oui', 'n/a', '',
    '18 juillet – 23 août 2026', '18 juli tot 23 augustus 2026', '18 July to 23 August 2026',
    '18. Juli bis 23. August 2026',
    '1er janvier 2027', '1 januari 2027', '1 January 2027', '1. Januar 2027',
    '30 juin 2027', '30 juni 2027', '30 June 2027', '30. Juni 2027',
    'mai 2027', 'May 2026', '12 mars', '3 déc. 2025',
    'Fin 2027', 'Eind 2027', 'End 2027', 'Ende 2027',
    'jusqu\'à 10 000', 'tot 10 000', 'Q2 2026', '2018',
  ])('traite « %s » comme du texte', (v) => expect(isNumericFigure(v)).toBe(false));
});
