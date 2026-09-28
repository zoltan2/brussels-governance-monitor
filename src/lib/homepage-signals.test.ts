import { describe, expect, it } from 'vitest';
import {
  getHomepageBlurb,
  HOMEPAGE_SIGNAL_MAX_CHARS,
  selectHomepageSignals,
  type HomepageSignalInput,
} from './homepage-signals';

const signal = (over: Partial<HomepageSignalInput> & { id: string }): HomepageSignalInput => ({
  date: '2026-09-28',
  status: 'active',
  cards: [],
  description: 'Description.',
  ...over,
});

describe('selectHomepageSignals', () => {
  it("n'affiche jamais un signal « confirmed » ou « archived » (incident du 28/09/2026)", () => {
    const choisis = selectHomepageSignals(
      [
        signal({ id: 'confirme', status: 'confirmed', date: '2026-09-28' }),
        signal({ id: 'archive', status: 'archived', date: '2026-09-28' }),
        signal({ id: 'actif', date: '2026-09-24' }),
      ],
      new Set(),
    );
    expect(choisis.map((s) => s.id)).toEqual(['actif']);
  });

  it('prend les plus récents, quel que soit l’ordre reçu, et garde l’ordre du fichier à date égale', () => {
    const choisis = selectHomepageSignals(
      [
        signal({ id: 'ancien', date: '2026-09-01' }),
        signal({ id: 'recent-a', date: '2026-09-28' }),
        signal({ id: 'moyen', date: '2026-09-20' }),
        signal({ id: 'recent-b', date: '2026-09-28' }),
      ],
      new Set(),
    );
    expect(choisis.map((s) => s.id)).toEqual(['recent-a', 'recent-b', 'moyen']);
  });

  it('écarte les signaux qui portent sur la fiche déjà citée par la barre, et comble avec les suivants', () => {
    const choisis = selectHomepageSignals(
      [
        signal({ id: 'cite', cards: ['enseignement'], date: '2026-09-28' }),
        signal({ id: 'b', date: '2026-09-27' }),
        signal({ id: 'c', date: '2026-09-26' }),
        signal({ id: 'd', date: '2026-09-25' }),
      ],
      new Set(['enseignement']),
    );
    expect(choisis.map((s) => s.id)).toEqual(['b', 'c', 'd']);
  });

  it('en montre trois au plus', () => {
    const beaucoup = Array.from({ length: 8 }, (_, i) => signal({ id: `s${i}` }));
    expect(selectHomepageSignals(beaucoup, new Set())).toHaveLength(3);
  });
});

describe('getHomepageBlurb', () => {
  it('reprend le résumé, borné au plafond', () => {
    expect(getHomepageBlurb('Résumé court.', 'Description.')).toBe('Résumé court.');
    const long = 'x'.repeat(HOMEPAGE_SIGNAL_MAX_CHARS + 50);
    expect(getHomepageBlurb(long, 'Description.')).toHaveLength(HOMEPAGE_SIGNAL_MAX_CHARS + 1);
  });

  it('ne rend plus de fragment comme « Am 14. » ou « Hub. » quand il n’y a pas de résumé', () => {
    const de =
      'Am 14. September 2026 hat die Regierung den Zeitplan für die Nachfolge von Good Move vorgelegt. Weitere Schritte folgen.';
    const fr = 'Hub. brussels confirme des coupes dans ses programmes de soutien aux entreprises bruxelloises en 2026.';
    for (const texte of [de, fr]) {
      const blurb = getHomepageBlurb(undefined, texte);
      expect(blurb.length, blurb).toBeGreaterThanOrEqual(40);
      expect(blurb.length).toBeLessThanOrEqual(HOMEPAGE_SIGNAL_MAX_CHARS + 1);
    }
  });

  it('garde la première phrase quand elle est assez longue', () => {
    const texte =
      'Le parquet confirme une information judiciaire contre X dans le dossier du casino. La police fédérale vérifie.';
    expect(getHomepageBlurb(undefined, texte)).toBe(
      'Le parquet confirme une information judiciaire contre X dans le dossier du casino.',
    );
  });
});
