import { describe, it, expect } from 'vitest';
import { checkParity, statSignature } from '../parity';
import type { Magazine, MagazineItem } from '../types';

// Garde de parité (spec magazine trilingue, §4.2) : une traduction ne dit
// jamais autre chose que le français validé.

function item(n: number, over: Partial<MagazineItem> = {}): MagazineItem {
  return {
    headline: `Titre ${n}.`,
    path: '/fr/domaines/budget',
    stat: '48,7 %',
    stat_label: 'libellé',
    facts: ['un', 'deux'],
    description: 'd'.repeat(120),
    howto: 'h'.repeat(100),
    confidence: 'official',
    cover: n === 1,
    ...over,
  };
}
const fr = (): Magazine => ({ version: 2, tagline: 't', closing_line: 'c', items: [item(1), item(2, { path: '/fr/dossiers/slrb', stat: '2 500' }), item(3, { stat: '17,7' })] });
const nl = (over: (m: Magazine) => void = () => {}): Magazine => {
  const m: Magazine = {
    version: 2,
    tagline: 't',
    closing_line: 'c',
    items: [item(1, { path: '/nl/domeinen/budget' }), item(2, { path: '/nl/dossiers/slrb', stat: '2.500' }), item(3, { path: '/nl/domeinen/budget', stat: '17,7' })],
  };
  over(m);
  return m;
};
const en = (): Magazine => ({
  version: 2,
  tagline: 't',
  closing_line: 'c',
  items: [item(1, { path: '/en/domains/budget', stat: '48.7%' }), item(2, { path: '/en/dossiers/slrb', stat: '2,500' }), item(3, { path: '/en/domains/budget', stat: '17.7' })],
});

describe('statSignature', () => {
  it('lit les séparateurs de chaque langue', () => {
    expect(statSignature('48,7 %', 'fr')).toBe(statSignature('48.7%', 'en'));
    expect(statSignature('2 500', 'fr')).toBe(statSignature('2.500', 'nl'));
    expect(statSignature('2 500', 'fr')).toBe(statSignature('2,500', 'en'));
    expect(statSignature('1 039 456,59', 'fr')).toBe(statSignature('1,039,456.59', 'en'));
  });

  it('compare les nombres, pas les mots ni les unités', () => {
    expect(statSignature('12 sur 26', 'fr')).toBe(statSignature('12 van 26', 'nl'));
    expect(statSignature('131 000 000 EUR', 'fr')).toBe(statSignature('EUR 131,000,000', 'en'));
    expect(statSignature('≈ 12 000', 'fr')).toBe(statSignature('≈ 12.000', 'nl'));
    expect(statSignature('+82,6 %', 'fr')).toBe(statSignature('+82.6%', 'en'));
  });

  it('distingue un autre nombre, un signe, un « environ » ou un pour cent perdus', () => {
    expect(statSignature('2 500', 'fr')).not.toBe(statSignature('2,500', 'nl'));
    expect(statSignature('+82,6 %', 'fr')).not.toBe(statSignature('82,6 %', 'nl'));
    expect(statSignature('−3,2 %', 'fr')).not.toBe(statSignature('3,2 %', 'nl'));
    expect(statSignature('≈ 12 000', 'fr')).not.toBe(statSignature('12.000', 'nl'));
    expect(statSignature('48,7 %', 'fr')).not.toBe(statSignature('48,7', 'nl'));
    expect(statSignature('12 sur 26', 'fr')).not.toBe(statSignature('26 van 12', 'nl'));
  });
});

describe('checkParity', () => {
  it('accepte une traduction fidèle, séparateurs de la langue compris', () => {
    expect(checkParity(fr(), nl(), 'nl')).toEqual([]);
    expect(checkParity(fr(), en(), 'en')).toEqual([]);
  });

  it('refuse un nombre de sujets différent', () => {
    const e = checkParity(fr(), nl((m) => m.items.pop()), 'nl');
    expect(e).toHaveLength(1);
    expect(e[0]!.field).toBe('items');
  });

  it('refuse un chiffre différent, y compris par confusion de séparateur', () => {
    expect(checkParity(fr(), nl((m) => (m.items[0]!.stat = '47,8 %')), 'nl').map((x) => x.field)).toEqual(['stat']);
    // « 2,500 » en néerlandais vaut 2,5 : ce n'est pas 2 500.
    expect(checkParity(fr(), nl((m) => (m.items[1]!.stat = '2,500')), 'nl').map((x) => x.field)).toEqual(['stat']);
    // Unité perdue.
    expect(checkParity(fr(), nl((m) => (m.items[0]!.stat = '48,7')), 'nl').map((x) => x.field)).toEqual(['stat']);
  });

  it('refuse une autre fiche, ou la fiche d’une autre langue', () => {
    expect(checkParity(fr(), nl((m) => (m.items[0]!.path = '/nl/domeinen/social')), 'nl').map((x) => x.field)).toEqual(['path']);
    const autreLangue = checkParity(fr(), nl((m) => (m.items[0]!.path = '/fr/domaines/budget')), 'nl');
    expect(autreLangue.map((x) => x.field)).toEqual(['path']);
    expect(autreLangue[0]!.reason).toContain('autre langue');
    // Segment français sous /nl/ : la route n'existe pas, la fiche n'est pas reconnue.
    expect(checkParity(fr(), nl((m) => (m.items[0]!.path = '/nl/domaines/budget')), 'nl').map((x) => x.field)).toEqual(['path']);
  });

  it('refuse un statut, une couverture ou un nombre de repères différents', () => {
    expect(checkParity(fr(), nl((m) => (m.items[0]!.confidence = 'estimated')), 'nl').map((x) => x.field)).toEqual(['confidence']);
    expect(checkParity(fr(), nl((m) => (m.items[1]!.cover = true)), 'nl').map((x) => x.field)).toEqual(['cover']);
    expect(checkParity(fr(), nl((m) => m.items[2]!.facts!.pop()), 'nl').map((x) => x.field)).toEqual(['facts']);
  });

  it('refuse un gabarit différent', () => {
    expect(checkParity(fr(), nl((m) => (m.version = 1)), 'nl').map((x) => x.field)).toEqual(['version']);
  });
});
