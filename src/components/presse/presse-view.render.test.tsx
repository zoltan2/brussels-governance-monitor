// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Page Presse & données, rendue avec les vraies mentions (fichier versionné)
 * et des chiffres arbitraires : aucun nombre de la page ne peut être écrit en
 * dur sans que ce test le voie.
 */
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

// Le traducteur simulé restitue la clé ET ses valeurs.
vi.mock('next-intl', () => ({
  useTranslations:
    (ns: string) =>
    (key: string, values?: Record<string, unknown>) =>
      values ? `${ns}.${key} ${Object.values(values).join(' | ')}` : `${ns}.${key}`,
  useFormatter: () => ({ number: (n: number) => String(n) }),
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: unknown; children: ReactNode }) => (
    <a href={typeof href === 'string' ? href : JSON.stringify(href)} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/breadcrumb', () => ({ Breadcrumb: () => <nav aria-label="Breadcrumb" /> }));

import { PresseView, PRESS_EMAIL, type PressFactView } from './presse-view';
import { getPressMentions, PRESS_KINDS } from '@/lib/press';

afterEach(cleanup);

/** Valeurs arbitraires, qui ne ressemblent à aucun chiffre réel du site. */
const STATS = { pages: 7351, sourcesSuivies: 6173, langues: 9, dossiers: 4127, domaines: 8219 };

const FAIT: PressFactView = {
  collection: 'dossier',
  slug: 'lez',
  routeSlug: 'lez',
  pageTitle: 'LEZ',
  label: 'Amendes envoyées',
  value: '1 890',
  unit: 'amendes',
  source: 'Bruxelles Fiscalité',
  sourceUrl: 'https://www.example.org/source',
  date: '2026-09-06',
  confidence: 'official',
  pageUrl: 'https://governance.brussels/fr/dossiers/lez',
};

function monter(facts: PressFactView[] = [FAIT]) {
  return render(<PresseView locale="fr" stats={STATS} facts={facts} mentions={getPressMentions('fr')} />);
}

describe('PresseView', () => {
  it('a un seul H1', () => {
    monter();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('affiche les chiffres reçus de site-stats, et seulement eux', () => {
    const { container } = monter();
    const valeurs = [...container.querySelectorAll('[data-stat] dd')].map((d) => d.textContent);
    expect(valeurs).toEqual(['7351', '6173', '4127', '8219', '9']);
    // Chaque chiffre porte son libellé.
    for (const cle of ['pages', 'sources', 'dossiers', 'domaines', 'langues']) {
      expect(container.querySelector(`[data-stat="${cle}"] dt`)?.textContent).toBe(`press.stats.${cle}`);
    }
  });

  it('rend les trois familles de la revue de presse, chacune sous son titre', () => {
    const { container } = monter();
    for (const kind of PRESS_KINDS) {
      const bloc = container.querySelector(`[data-kind="${kind}"]`) as HTMLElement;
      expect(bloc, kind).not.toBeNull();
      expect(within(bloc).getByRole('heading', { level: 3 }).textContent).toBe(`press.kinds.${kind}.title`);
      expect(bloc.querySelectorAll('[data-mention]').length).toBeGreaterThan(0);
    }
  });

  it('compte Information-Bruxelles une seule fois, avec un lien vers sa version néerlandaise', () => {
    const { container } = monter();
    const items = [...container.querySelectorAll('[data-mention]')].filter((li) =>
      li.innerHTML.includes('information-bruxelles.be'),
    );
    expect(items).toHaveLength(1);
    const liens = [...items[0].querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(liens).toContain('https://www.information-bruxelles.be/nl/governance-van-brussel-een-burger-zet-een-monitor-online/');
  });

  it('ouvre les liens externes dans un nouvel onglet annoncé, sans UTM', () => {
    const { container } = monter();
    const externes = [...container.querySelectorAll('a[target="_blank"]')];
    expect(externes.length).toBeGreaterThan(0);
    for (const a of externes) {
      expect(a.getAttribute('rel')).toBe('noopener noreferrer');
      expect(a.querySelector('.sr-only')?.textContent).toContain('footer.newTab');
      expect(a.getAttribute('href')).not.toMatch(/utm_/);
    }
    const mentions = container.querySelectorAll('[data-umami-event="presse-mention"]');
    expect(mentions.length).toBe(getPressMentions('fr').length + 1); // + la version NL
  });

  it('donne le contact par mailto, mesuré, avec les langues d’interview', () => {
    const { container } = monter();
    const mail = container.querySelector(`a[href="mailto:${PRESS_EMAIL}"]`);
    expect(mail?.getAttribute('data-umami-event')).toBe('presse-contact');
    expect(PRESS_EMAIL).toBe('contact@brusselsgovernance.be');
    expect(container.textContent).toContain('press.contactInterviews');
    expect(container.textContent).toContain('press.contactCite');
  });

  it('présente une information prête à citer : chiffre, date, confiance, source, fiche, formulation', () => {
    const { container } = monter();
    const carte = container.querySelector('[data-fait="lez"]') as HTMLElement;
    expect(carte.textContent).toContain('1 890');
    expect(carte.querySelector('time')?.getAttribute('dateTime')).toBe('2026-09-06');
    expect(carte.textContent).toContain('domains.confidence.official');
    expect(carte.querySelector('a[href="https://www.example.org/source"]')).not.toBeNull();
    const lienFiche = carte.querySelector('[data-umami-event="presse-fait"]');
    expect(lienFiche?.getAttribute('data-umami-event-slug')).toBe('lez');
    expect(carte.textContent).toContain('press.suggestedLabel');
    const citation = carte.querySelector('#presse-fait-lez');
    expect(citation?.textContent).toContain('https://governance.brussels/fr/dossiers/lez');
    expect(within(carte).getByRole('button', { name: /press\.copyReference/ })).toBeTruthy();
  });

  it('masque la section des faits quand aucun ne se résout', () => {
    const { container } = monter([]);
    expect(container.querySelector('#presse-faits')).toBeNull();
  });

  it('propose les deux textes de présentation, chacun copiable', () => {
    const { container } = monter();
    expect(container.querySelector('#presse-texte-court')?.textContent).toBe('press.shortText');
    expect(container.querySelector('#presse-texte-long')?.textContent).toBe('press.longText');
    expect(screen.getAllByRole('button', { name: 'press.copyText' })).toHaveLength(2);
  });
});
