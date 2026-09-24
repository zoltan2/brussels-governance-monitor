// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Rendu du lien « voir la fiche » d'un signal radar. Jusqu'au 24/09/2026, ce
 * lien s'appuyait sur `signal.promotedSection ?? 'domains'` : un signal promu
 * vers un dossier ou une commune, sans `promotedSection` déclaré, pointait
 * vers /domaines/<slug> — une page inexistante (404 en production). Le
 * composant lit maintenant `signal.promotedLink`, résolu côté serveur dans
 * src/lib/radar.ts à partir des collections de contenu réelles.
 */
import { render, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LocalizedRadarEntry } from '@/lib/radar';
import type { RadarLabels } from './page';

vi.mock('@/i18n/navigation', () => ({
  // Reproduit la forme `{ pathname, params }` de next-intl : interpole
  // `[slug]` avec le paramètre reçu, pour que le test lise un vrai href.
  Link: ({
    href,
    children,
    ...rest
  }: {
    href: string | { pathname: string; params: Record<string, string> };
    children: React.ReactNode;
  }) => {
    const url =
      typeof href === 'string'
        ? href
        : href.pathname.replace(/\[(\w+)\]/g, (_m, key: string) => href.params[key] ?? '');
    return (
      <a href={url} {...rest}>
        {children}
      </a>
    );
  },
}));

import { RadarContent } from './radar-content';

afterEach(cleanup);

const LABELS: RadarLabels = {
  title: 'Radar',
  subtitle: 'Signaux',
  shieldText: 'Sous surveillance',
  homepageTitle: 'Signaux en cours de vérification',
  confirmedSection: 'Confirmés',
  archiveSection: 'Archive',
  noActiveSignals: 'Aucun signal',
  source: 'Source',
  nextStep: 'Prochaine étape',
  seeCard: 'Voir la fiche',
  loadMore: 'Voir plus',
  confidence: { official: 'Officiel', estimated: 'Estimé', unconfirmed: 'Non confirmé' },
  status: { active: 'Actif', confirmed: 'Confirmé', archived: 'Archivé' },
};

function makeSignal(overrides: Partial<LocalizedRadarEntry>): LocalizedRadarEntry {
  return {
    id: 'signal-test',
    date: '2026-09-24',
    confidence: 'official',
    status: 'confirmed',
    cards: ['mobility'],
    source: { label: 'Source test', url: 'https://example.brussels', accessedAt: '2026-09-24' },
    description: 'Description du signal.',
    promotedTo: null,
    promotedSection: undefined,
    promotedLink: null,
    archivedAt: null,
    ...overrides,
  };
}

describe('RadarContent — lien « voir la fiche »', () => {
  it('pointe vers /dossiers/<slug> pour une promotion vers un dossier', () => {
    const signal = makeSignal({
      id: '2026-09-24-faillites-bruxelles-statbel-aout',
      promotedTo: 'faillites-a-bruxelles',
      promotedLink: { section: 'dossiers', slug: 'faillites-a-bruxelles' },
    });
    const { getByRole } = render(
      <RadarContent active={[signal]} confirmed={[]} archived={[]} locale="fr" labels={LABELS} />,
    );
    const link = getByRole('link', { name: LABELS.seeCard });
    expect(link.getAttribute('href')).toBe('/dossiers/faillites-a-bruxelles');
  });

  it('pointe vers /communes/<slug> pour une promotion vers une commune', () => {
    const signal = makeSignal({
      id: '2026-09-24-casino-bruxelles-conseil-options',
      promotedTo: 'bruxelles-ville',
      promotedLink: { section: 'communes', slug: 'bruxelles-ville' },
    });
    const { getByRole } = render(
      <RadarContent active={[signal]} confirmed={[]} archived={[]} locale="fr" labels={LABELS} />,
    );
    const link = getByRole('link', { name: LABELS.seeCard });
    expect(link.getAttribute('href')).toBe('/communes/bruxelles-ville');
  });

  it('pointe vers /domains/<slug> pour une promotion vers un domaine', () => {
    const signal = makeSignal({
      promotedTo: 'mobility',
      promotedLink: { section: 'domains', slug: 'mobility' },
    });
    const { getByRole } = render(
      <RadarContent active={[signal]} confirmed={[]} archived={[]} locale="fr" labels={LABELS} />,
    );
    const link = getByRole('link', { name: LABELS.seeCard });
    expect(link.getAttribute('href')).toBe('/domains/mobility');
  });

  it('ne rend AUCUN lien quand promotedLink est null (slug introuvable) — jamais un lien mort', () => {
    const signal = makeSignal({
      promotedTo: 'fiche-fantome',
      promotedLink: null,
    });
    const { queryByRole } = render(
      <RadarContent active={[signal]} confirmed={[]} archived={[]} locale="fr" labels={LABELS} />,
    );
    expect(queryByRole('link', { name: LABELS.seeCard })).toBeNull();
  });

  it("ne rend aucun lien quand le signal n'est pas promu", () => {
    const signal = makeSignal({});
    const { queryByRole } = render(
      <RadarContent active={[signal]} confirmed={[]} archived={[]} locale="fr" labels={LABELS} />,
    );
    expect(queryByRole('link', { name: LABELS.seeCard })).toBeNull();
  });
});
