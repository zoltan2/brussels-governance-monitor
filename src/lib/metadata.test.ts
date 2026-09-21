// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it, vi } from 'vitest';

// metadata.ts resolves localized paths through next-intl, which pulls next/navigation
// and cannot load under vitest. truncateDescription does not touch it.
vi.mock('@/i18n/navigation', () => ({ getPathname: () => '/' }));

import { buildMetadata, dossierSearchMeta, searchMeta, truncateDescription } from './metadata';

describe('truncateDescription', () => {
  it('leaves a short description untouched', () => {
    expect(truncateDescription('La LEZ en bref.')).toBe('La LEZ en bref.');
  });

  it('never exceeds 160 characters and never cuts a word', () => {
    const text =
      "La LEZ interdit depuis le 1er janvier 2026 les diesels Euro 5 et les essences Euro 2, et les amendes de 350 EUR s'appliquent depuis le 1er juillet 2026 dans toute la Région";
    const out = truncateDescription(text);
    expect(out.length).toBeLessThanOrEqual(160);
    expect(out.endsWith('…')).toBe(true);
    const kept = out.slice(0, -1);
    expect(text.startsWith(kept)).toBe(true);
    expect(text[kept.length]).toBe(' ');
  });

  it('prefers ending on a full sentence when one closes late enough', () => {
    const first =
      'Environ dix mille postes ACS existent à Bruxelles, dont 6 700 occupés, pour un budget de 276 millions en 2026.';
    const out = truncateDescription(`${first} La réforme annoncée en février reste sans texte adopté à ce jour.`);
    expect(out).toBe(first);
  });

  it('does not end on dangling punctuation before the ellipsis', () => {
    const text = `${'mot '.repeat(38)}fin, suite de la phrase qui dépasse largement la limite`;
    expect(truncateDescription(text)).not.toMatch(/[,;:]…$/);
  });
});

describe('dossierSearchMeta', () => {
  const card = {
    title: 'Zone de basses émissions : calendrier, dérogations et amendes à Bruxelles en 2026',
    summary: 'La LEZ bruxelloise interdit depuis janvier 2026 les diesels Euro 5.',
  };

  it('keeps the dossier title and summary when no seo fields exist', () => {
    expect(dossierSearchMeta(card)).toEqual({
      title: card.title,
      absoluteTitle: false,
      description: card.summary,
    });
  });

  it('uses seoTitle as an absolute title and seoDescription as description', () => {
    expect(
      dossierSearchMeta({
        ...card,
        seoTitle: 'LEZ Bruxelles 2026 : calendrier et amendes',
        seoDescription: 'Ce qui est interdit, depuis quand, et ce que coûte une infraction.',
      }),
    ).toEqual({
      title: 'LEZ Bruxelles 2026 : calendrier et amendes',
      absoluteTitle: true,
      description: 'Ce qui est interdit, depuis quand, et ce que coûte une infraction.',
    });
  });

  it('takes each field on its own: seoTitle alone keeps the summary', () => {
    const out = dossierSearchMeta({ ...card, seoTitle: 'LEZ Bruxelles 2026' });
    expect(out.description).toBe(card.summary);
    expect(out.absoluteTitle).toBe(true);
  });

  it('ignores a blank seoTitle rather than printing an empty title', () => {
    expect(dossierSearchMeta({ ...card, seoTitle: '  ' }).title).toBe(card.title);
  });
});

describe('buildMetadata title', () => {
  it('lets the layout template add its suffix by default', () => {
    const meta = buildMetadata({ locale: 'fr', title: 'LEZ', description: 'x' });
    expect(meta.title).toBe('LEZ');
  });

  it('emits an absolute title when asked, and the same title for OpenGraph and Twitter', () => {
    const meta = buildMetadata({ locale: 'fr', title: 'LEZ Bruxelles 2026', description: 'x', absoluteTitle: true });
    expect(meta.title).toEqual({ absolute: 'LEZ Bruxelles 2026' });
    expect(meta.openGraph?.title).toBe('LEZ Bruxelles 2026');
    expect(meta.twitter?.title).toBe('LEZ Bruxelles 2026');
  });
});

/**
 * `searchMeta` généralise `dossierSearchMeta` aux domaines, secteurs et
 * comparaisons (21/09/2026). Le piège de cette généralisation est le repli de
 * description : il n'est pas le même d'une collection à l'autre, et le deviner
 * aurait produit des descriptions vides sur deux collections sur trois.
 */
describe('searchMeta, généralisé aux autres collections', () => {
  it("prend le repli qu'on lui donne, il ne le devine pas", () => {
    expect(
      searchMeta({ title: 'Secteur', fallbackDescription: 'impact humain' }).description,
    ).toBe('impact humain');
    expect(
      searchMeta({ title: 'Comparaison', fallbackDescription: 'méthodologie' }).description,
    ).toBe('méthodologie');
  });

  it('rend seoTitle en titre absolu, donc sans le suffixe du gabarit', () => {
    const out = searchMeta({
      title: 'Éducation : grève générale FWB, crèches, coupes budgétaires',
      fallbackDescription: 'repli',
      seoTitle: 'Éducation à Bruxelles : ce qui change',
    });
    expect(out.title).toBe('Éducation à Bruxelles : ce qui change');
    expect(out.absoluteTitle).toBe(true);
  });

  it('laisse le titre long au H1 quand seoTitle est absent', () => {
    const long = 'Éducation : grève générale FWB, crèches, coupes budgétaires';
    const out = searchMeta({ title: long, fallbackDescription: 'repli' });
    expect(out.title).toBe(long);
    expect(out.absoluteTitle).toBe(false);
  });

  it('traite les deux champs séparément', () => {
    const out = searchMeta({
      title: 'T',
      fallbackDescription: 'repli',
      seoDescription: 'description courte',
    });
    expect(out.title).toBe('T');
    expect(out.absoluteTitle).toBe(false);
    expect(out.description).toBe('description courte');
  });

  it('ignore un champ vide plutôt que de publier du vide', () => {
    const out = searchMeta({
      title: 'T',
      fallbackDescription: 'repli',
      seoTitle: '   ',
      seoDescription: '  ',
    });
    expect(out.title).toBe('T');
    expect(out.absoluteTitle).toBe(false);
    expect(out.description).toBe('repli');
  });

  it('dossierSearchMeta reste un appel de searchMeta, pas une copie', () => {
    const card = { title: 'T', summary: 'S', seoTitle: 'Court', seoDescription: 'Desc' };
    expect(dossierSearchMeta(card)).toEqual(
      searchMeta({
        title: 'T',
        fallbackDescription: 'S',
        seoTitle: 'Court',
        seoDescription: 'Desc',
      }),
    );
  });
});

/**
 * NE JAMAIS DÉCLARER UN HREFLANG VERS UNE LANGUE QUI N'EXISTE PAS.
 *
 * Une annotation hreflang qui désigne une URL non-200 est invalide, et Google
 * peut ignorer tout le groupe de la page. Le 21/09/2026, c'est ce défaut qui a
 * été corrigé sur l'en-tête HTTP de next-intl, où le x-default pointait vers une
 * redirection. Le réintroduire en HTML sur une collection partiellement traduite
 * serait la même faute, au même endroit.
 */
describe('alternates restreints aux langues publiées', () => {
  const base = { title: 'T', description: 'D', path: '/verifications/budget-2026-02-08' };

  it('déclare les quatre langues par défaut', () => {
    const langs = buildMetadata({ locale: 'fr', ...base }).alternates?.languages ?? {};
    expect(Object.keys(langs).sort()).toEqual(['de', 'en', 'fr', 'nl', 'x-default']);
  });

  it("n'en déclare que deux quand la fiche n'existe qu'en deux langues", () => {
    const langs =
      buildMetadata({ locale: 'fr', ...base, availableLocales: ['fr', 'nl'] }).alternates
        ?.languages ?? {};
    expect(Object.keys(langs).sort()).toEqual(['fr', 'nl', 'x-default']);
    expect(langs['en']).toBeUndefined();
    expect(langs['de']).toBeUndefined();
  });

  it('fait pointer x-default sur le français quand il est publié', () => {
    const langs =
      buildMetadata({ locale: 'nl', ...base, availableLocales: ['fr', 'nl'] }).alternates
        ?.languages ?? {};
    expect(langs['x-default']).toBe(langs['fr']);
  });

  it('fait pointer x-default sur la première langue publiée quand le français manque', () => {
    const langs =
      buildMetadata({ locale: 'nl', ...base, availableLocales: ['nl', 'en'] }).alternates
        ?.languages ?? {};
    expect(langs['x-default']).toBe(langs['nl']);
    expect(langs['fr']).toBeUndefined();
  });
});
