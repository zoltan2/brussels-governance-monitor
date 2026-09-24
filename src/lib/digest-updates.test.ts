// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * L'URL d'un dossier dans le digest doit suivre son slug localisé
 * (`localizedSlugs`), pas le slug canonique FR : sinon un dossier à slug NL
 * distinct (ex. cpas-bruxellois → brusselse-ocmws) pointerait, dans le
 * digest néerlandais, vers l'ancienne adresse (redirigée, pas cassée, mais
 * pas l'adresse directe attendue par un lecteur ni par les mesures SEO du
 * pilote). Voir PR #593, mémoire feedback_localized_slugs_redirect_pairing.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/content', () => ({
  getDomainCards: () => [],
  getSectorCards: () => [],
  getCommuneCards: () => [],
  getDossierCards: () => [
    {
      slug: 'cpas-bruxellois',
      title: 'Les 19 CPAS bruxellois',
      lastModified: '2026-09-24',
      changeSummary: undefined,
      summary: 'Résumé du dossier CPAS.',
      digestHeadline: undefined,
      phase: 'in-progress',
      localizedSlugs: { nl: 'brusselse-ocmws' },
    },
  ],
  getLocalizedSlug: (
    card: { slug: string; localizedSlugs?: Record<string, string> },
    locale: string,
  ) => card.localizedSlugs?.[locale] ?? card.slug,
}));

import { collectDigestUpdates } from './digest-updates';

describe('collectDigestUpdates — URL des dossiers', () => {
  it('suit le slug localisé NL (localizedSlugs.nl), pas le slug canonique', () => {
    const { byLocale } = collectDigestUpdates('2026-01-01', 'https://governance.brussels');
    const nlDossier = byLocale.nl.find((u) => u.section === 'dossiers');
    expect(nlDossier?.url).toBe('https://governance.brussels/nl/dossiers/brusselse-ocmws');
  });

  it('garde le slug canonique pour une locale sans localizedSlugs (fr)', () => {
    const { byLocale } = collectDigestUpdates('2026-01-01', 'https://governance.brussels');
    const frDossier = byLocale.fr.find((u) => u.section === 'dossiers');
    expect(frDossier?.url).toBe('https://governance.brussels/fr/dossiers/cpas-bruxellois');
  });

  it('applique aussi le slug localisé quand une campagne ajoute des UTM', () => {
    const { byLocale } = collectDigestUpdates('2026-01-01', 'https://governance.brussels', '2026-w40');
    const nlDossier = byLocale.nl.find((u) => u.section === 'dossiers');
    expect(nlDossier?.url).toMatch(/^https:\/\/governance\.brussels\/nl\/dossiers\/brusselse-ocmws\?/);
  });
});
