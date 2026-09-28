// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect } from 'vitest';
import { excerptSegments } from './search-excerpt';

describe('excerptSegments', () => {
  it('garde les termes surlignés par Pagefind, en texte', () => {
    expect(excerptSegments('la <mark>mobilité</mark> à Bruxelles')).toEqual([
      { text: 'la ', mark: false },
      { text: 'mobilité', mark: true },
      { text: ' à Bruxelles', mark: false },
    ]);
  });

  it('ne laisse sortir aucune balise, même non fermée', () => {
    expect(excerptSegments('a<img src=x onerror=alert(1)')).toEqual([{ text: 'a', mark: false }]);
  });

  it('ignore les attributs posés sur <mark>', () => {
    expect(excerptSegments('<mark onmouseover="alert(1)">x</mark>')).toEqual([
      { text: 'x', mark: true },
    ]);
  });

  it('décode les entités : le HTML échappé devient du texte, pas un élément', () => {
    expect(excerptSegments('R&amp;D &lt;img src=x&gt; &#39;ok&#39;')).toEqual([
      { text: "R&D <img src=x> 'ok'", mark: false },
    ]);
  });
});
