// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * `data-suivi` dans le HTML servi : repère des sondes de l'accueil
 * (scripts/ops/controle-contenu-accueil.mjs, bgm-ops deploy/sonde-accueil).
 * Sans lui, fausse alerte « bloc introuvable » du 29/09/2026.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ComponentProps } from 'react';

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, ...p }: ComponentProps<'a'> & { href: string }) => <a href={href} {...p} />,
}));
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));

const { TrackedLink, TrackedAnchor } = await import('./tracked-link');

describe('TrackedLink et TrackedAnchor : repère data-suivi', () => {
  it('TrackedLink écrit le nom de l’événement', () => {
    const html = renderToStaticMarkup(
      <TrackedLink href="/radar" event="accueil-radar">
        Tout voir
      </TrackedLink>,
    );
    expect(html).toContain('data-suivi="accueil-radar"');
    expect(html).not.toContain('data-umami-event');
  });

  it('TrackedAnchor aussi', () => {
    const html = renderToStaticMarkup(
      <TrackedAnchor href="#subscribe" event="accueil-inscription">
        S’inscrire
      </TrackedAnchor>,
    );
    expect(html).toContain('data-suivi="accueil-inscription"');
  });

  it('sans événement, aucun attribut', () => {
    expect(renderToStaticMarkup(<TrackedLink href="/radar">x</TrackedLink>)).not.toContain('data-suivi');
  });
});
