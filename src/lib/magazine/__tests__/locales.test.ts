import { describe, it, expect } from 'vitest';
import { routing } from '../../../i18n/routing';
import { AUTHOR_TEXT } from '../author';
import { CARD_SEGMENTS, MAGAZINE_LOCALES, STRINGS, cardRefForPath, editionUrl, type CardKind } from '../locales';

// Spec magazine trilingue (15/11/2026) : une édition ne peut pas afficher du
// français par oubli, ni viser une route que le site ne sert pas.

const ROUTE_OF: Record<CardKind, string> = {
  domains: '/domains/[slug]',
  dossiers: '/dossiers/[slug]',
  communes: '/communes/[slug]',
  sectors: '/sectors/[slug]',
  solutions: '/solutions/[slug]',
  comparisons: '/comparisons/[slug]',
};

function flatten(value: unknown, prefix = ''): [string, string][] {
  if (typeof value === 'string') return [[prefix, value]];
  if (typeof value === 'function') {
    return [[prefix, String((value as (...a: string[]) => string)('7', 'PERIODE', 'COMPTE'))]];
  }
  if (Array.isArray(value)) return value.flatMap((v, i) => flatten(v, `${prefix}[${i}]`));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k));
  }
  return [];
}

describe('éditions du magazine', () => {
  it('les segments de fiche sont ceux de la table de routage du site', () => {
    const pathnames = routing.pathnames as Record<string, string | Record<string, string>>;
    for (const locale of MAGAZINE_LOCALES) {
      for (const kind of Object.keys(ROUTE_OF) as CardKind[]) {
        const entry = pathnames[ROUTE_OF[kind]];
        const localized = typeof entry === 'string' ? entry : entry?.[locale];
        expect(localized, `${locale} ${kind}`).toBe(`/${CARD_SEGMENTS[locale][kind]}/[slug]`);
      }
    }
  });

  it('chaque édition a tous les textes du gabarit, non vides', () => {
    const keys = flatten(STRINGS.fr).map(([k]) => k);
    for (const locale of MAGAZINE_LOCALES) {
      const entries = flatten(STRINGS[locale]);
      expect(entries.map(([k]) => k), locale).toEqual(keys);
      for (const [k, v] of entries) expect(v.trim().length, `${locale} ${k}`).toBeGreaterThan(0);
    }
  });

  it('une édition traduite ne reprend aucune phrase du français', () => {
    const fr = new Map(flatten(STRINGS.fr));
    // Identiques par nature : codes, noms propres, mots communs aux deux langues.
    const admis = new Set(['navSite', 'cta.site', 'week', 'issueLine', 'editionsLabel']);
    for (const locale of MAGAZINE_LOCALES.filter((l) => l !== 'fr')) {
      for (const [k, v] of flatten(STRINGS[locale])) {
        if (admis.has(k) || v.length < 12) continue;
        expect(v, `${locale} ${k}`).not.toBe(fr.get(k));
      }
      expect(AUTHOR_TEXT[locale].manifesto).not.toBe(AUTHOR_TEXT.fr.manifesto);
      expect(AUTHOR_TEXT[locale].offer).not.toBe(AUTHOR_TEXT.fr.offer);
    }
  });

  it('le français reste à la racine, les autres éditions sous leur langue', () => {
    expect(editionUrl('fr', 's47')).toBe('https://magazine.governance.brussels/s47/');
    expect(editionUrl('nl', 's47')).toBe('https://magazine.governance.brussels/nl/s47/');
    expect(editionUrl('en', 's47')).toBe('https://magazine.governance.brussels/en/s47/');
  });

  it('reconnaît la fiche visée dans les trois langues, et rien d’autre', () => {
    expect(cardRefForPath('/fr/domaines/budget')).toEqual({ locale: 'fr', kind: 'domains', slug: 'budget' });
    expect(cardRefForPath('/nl/domeinen/budget')).toEqual({ locale: 'nl', kind: 'domains', slug: 'budget' });
    expect(cardRefForPath('https://governance.brussels/en/municipalities/etterbeek?x=1')).toEqual({ locale: 'en', kind: 'communes', slug: 'etterbeek' });
    // Segment français sous /nl/ : la route n'existe pas.
    expect(cardRefForPath('/nl/domaines/budget')).toBeNull();
    expect(cardRefForPath('/de/bereiche/budget')).toBeNull();
    expect(cardRefForPath('/fr/subscribe')).toBeNull();
    expect(cardRefForPath(undefined)).toBeNull();
  });
});
