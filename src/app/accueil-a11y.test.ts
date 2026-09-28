// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Garde-fous des correctifs d'accessibilité et de mise en page de l'accueil
 * (revue multi-équipes du 28/09/2026, équipe Design).
 *
 * La page d'accueil est un composant serveur asynchrone nourri par Velite : on
 * ne la rend pas en test. On vérifie donc le balisage dans la source, élément par
 * élément (jamais un simple `includes` sur tout le fichier, qu'une autre ligne
 * satisferait). Les mesures réelles (hauteurs, cibles, recouvrement) sont dans la
 * PR, prises sur un build local.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const page = readFileSync(resolve(__dirname, '[locale]/page.tsx'), 'utf8');
const footer = readFileSync(resolve(__dirname, '../components/layout/footer.tsx'), 'utf8');
const css = readFileSync(resolve(__dirname, 'globals.css'), 'utf8');

/** Source d'une fonction du fichier, de sa déclaration à la suivante. */
function fonction(nom: string): string {
  const start = page.indexOf(`function ${nom}(`);
  if (start === -1) throw new Error(`function ${nom} introuvable dans page.tsx`);
  const next = page.indexOf('\nfunction ', start + 1);
  return page.slice(start, next === -1 ? undefined : next);
}

/** Classes Tailwind d'une chaîne `className="…"` ou d'un littéral. */
const classes = (s: string) => new Set(s.split(/\s+/).filter(Boolean));

describe('pastilles de langue du digest — WCAG 2.5.8 (24 × 24 px)', () => {
  const m = fonction('FormatsSection').match(/const pastille =\s*'([^']+)'/);

  it('la classe commune des pastilles impose 24 px de haut et de large', () => {
    expect(m, 'const pastille introuvable').not.toBeNull();
    const c = classes(m![1]);
    expect(c.has('min-h-6'), m![1]).toBe(true);
    expect(c.has('min-w-6'), m![1]).toBe(true);
    // `min-h` n'agit sur un élément en ligne que s'il devient une boîte.
    expect(c.has('inline-flex'), m![1]).toBe(true);
  });

  it('la vignette du digest est assez haute pour trois rangées sans défilement sous lg', () => {
    const tall = page.match(/const FORMAT_VISUAL_TALL = '([^']+)'/);
    expect(tall).not.toBeNull();
    // 3 rangées × 24 px + 2 écarts × 4 px + 12 px de marge (py-1.5) = 92 px ≤ 96 px (h-24).
    expect(classes(tall![1]).has('h-24')).toBe(true);
    const digestCard = fonction('FormatsSection').split("title={t('protoDigestName')}")[1]?.split('visual=')[0] ?? '';
    expect(digestCard).toContain('visualClassName={FORMAT_VISUAL_TALL}');
  });
});

describe('domaines : chapeau coupé sur mobile, entier sur desktop', () => {
  it('le <p> du chapeau porte line-clamp-3 et md:line-clamp-none', () => {
    const src = fonction('DomainsPreview');
    const p = src.match(/<p className="([^"]+)">\s*\{card\.summary\}/);
    expect(p, '<p> du chapeau introuvable').not.toBeNull();
    const c = classes(p![1]);
    expect(c.has('line-clamp-3')).toBe(true);
    expect(c.has('md:line-clamp-none')).toBe(true);
  });
});

describe('magazine : langue annoncée avant le clic', () => {
  const lien = (() => {
    const src = fonction('FormatsSection');
    const i = src.indexOf('data-umami-event="accueil-magazine"');
    return src.slice(i, src.indexOf('</a>', i));
  })();

  it('le lien déclare hrefLang="fr"', () => {
    expect(lien).toMatch(/hrefLang="fr"/);
  });

  it('hors fr, le libellé porte la marque « (FR) »', () => {
    expect(lien).toMatch(/locale !== 'fr' && <FrenchOnlyMark \/>/);
    expect(fonction('FrenchOnlyMark')).toContain('(FR)');
  });
});

describe('boutons flottants sur mobile — WCAG 2.4.11', () => {
  it('scroll-padding-bottom ≥ 72 px (bouton de 56 px + 16 px de marge), sous 768 px', () => {
    const bloc = css.match(/@media \(max-width: 767px\) \{\s*html \{\s*scroll-padding-bottom:\s*([\d.]+)rem;/);
    expect(bloc, 'bloc html { scroll-padding-bottom } introuvable dans @media (max-width: 767px)').not.toBeNull();
    expect(Number(bloc![1]) * 16).toBeGreaterThanOrEqual(72);
  });

  it('le pied de page garde une marge basse de 96 px sur mobile, inchangée sur desktop', () => {
    const div = footer.match(/<footer[^>]*>\s*<div className="([^"]+)"/);
    expect(div).not.toBeNull();
    const c = classes(div![1]);
    expect(c.has('pb-24')).toBe(true);
    expect(c.has('md:py-10')).toBe(true);
  });
});
