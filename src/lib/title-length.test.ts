// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import {
  SERP_TITLE_BUDGET,
  TITLE_MAX,
  TITLE_SUFFIX,
  checkTitleLength,
  explainTitleLength,
} from './title-length';

/** Titre de longueur exacte, sans dépendre d'une chaîne recopiée à la main. */
const long = (n: number) => 'a'.repeat(n);

describe('budget de titre en résultat de recherche', () => {
  it('réserve la place du suffixe du gabarit', () => {
    // Si quelqu'un change le suffixe dans layout.tsx sans toucher ici, le
    // budget dérive en silence. La relation est donc posée, pas recopiée.
    expect(TITLE_MAX).toBe(SERP_TITLE_BUDGET - TITLE_SUFFIX.length);
    expect(TITLE_SUFFIX).toBe(' | BGM');
  });

  it('accepte un titre pile au budget', () => {
    const c = checkTitleLength({ title: long(TITLE_MAX) });
    expect(c.verdict).toBe('ok');
    expect(c.overflow).toBe(0);
    expect(c.rendered).toBe(SERP_TITLE_BUDGET);
  });

  it('refuse un titre d un seul caractère de trop', () => {
    const c = checkTitleLength({ title: long(TITLE_MAX + 1) });
    expect(c.verdict).toBe('too-long');
    expect(c.overflow).toBe(1);
  });

  it('compte le titre sans ses espaces de bord', () => {
    expect(checkTitleLength({ title: `  ${long(TITLE_MAX)}  ` }).verdict).toBe('ok');
  });

  /**
   * Le cas réel qui a motivé ce lint : content/sector-cards/education.de.mdx,
   * 139 caractères, accepté par Velite qui ne signale qu'un `info`.
   */
  it('attrape le pire cas constaté dans le dépôt', () => {
    const c = checkTitleLength({
      title:
        'Bildung: Generalstreik FWB (9. April), Krippenplatz-Krise (10 000 fehlende Plätze), FWB −86,7 Mio. Unterricht + −74 Mio. Kleinkindbetreuung',
    });
    expect(c.verdict).toBe('too-long');
    expect(c.length).toBe(139);
    expect(c.overflow).toBe(139 - TITLE_MAX);
  });

  it('signale un titre absent', () => {
    expect(checkTitleLength({ title: undefined }).verdict).toBe('missing');
    expect(checkTitleLength({ title: '   ' }).verdict).toBe('missing');
  });
});

describe('seoTitle, la porte de sortie', () => {
  /**
   * `seoTitle` est rendu en titre ABSOLU : le gabarit n'y ajoute pas le suffixe.
   * Son budget est donc le budget entier, pas le budget diminué. Se tromper ici
   * ferait refuser six caractères légitimes sur chaque fiche instrumentée.
   */
  it('dispose du budget entier, sans réserver le suffixe', () => {
    const c = checkTitleLength({ title: long(200), seoTitle: long(SERP_TITLE_BUDGET) });
    expect(c.verdict).toBe('ok');
    expect(c.rendered).toBe(SERP_TITLE_BUDGET);
  });

  it('couvre un titre éditorial trop long', () => {
    // C'est exactement l'usage voulu : titre à énumération au H1, titre court
    // en résultat de recherche.
    expect(checkTitleLength({ title: long(139), seoTitle: 'LEZ : amendes en vigueur' }).verdict).toBe(
      'ok',
    );
  });

  it('reste soumis au budget, il n est pas une dérogation', () => {
    expect(checkTitleLength({ title: long(10), seoTitle: long(SERP_TITLE_BUDGET + 1) }).verdict).toBe(
      'too-long',
    );
  });

  it('vide ou absent, il laisse la main au titre', () => {
    expect(checkTitleLength({ title: long(TITLE_MAX + 1), seoTitle: '' }).verdict).toBe('too-long');
    expect(checkTitleLength({ title: long(TITLE_MAX), seoTitle: undefined }).verdict).toBe('ok');
  });
});

describe('message rendu à qui casse la règle', () => {
  it('propose seoTitle là où la collection le supporte', () => {
    const c = checkTitleLength({ title: long(100) });
    expect(explainTitleLength(c, true)).toContain('seoTitle');
    expect(explainTitleLength(c, true)).toContain(String(c.overflow));
  });

  it('ne le propose pas là où il n existe pas au schéma', () => {
    const c = checkTitleLength({ title: long(100) });
    expect(explainTitleLength(c, false)).not.toContain('seoTitle');
  });
});
