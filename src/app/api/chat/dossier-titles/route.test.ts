// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * `/api/chat/dossier-titles` doit fournir au widget de chat, pour chaque
 * dossier, à la fois le titre localisé ET le slug de ROUTE localisé
 * (`routeSlug`), distinct du slug canonique (clé de la map). Avant PR #593,
 * seul le titre était renvoyé et le widget reconstruisait le lien à partir
 * du slug canonique du marqueur `[Dossier: slug]` écrit par le LLM — ce qui
 * pointait vers l'ancienne adresse pour un dossier à slug NL localisé (ex.
 * cpas-bruxellois → brusselse-ocmws).
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/rate-limit', () => ({ rateLimit: () => ({ allowed: true, remaining: 5 }) }));
vi.mock('@/lib/client-ip', () => ({ clientIp: () => '127.0.0.1' }));
vi.mock('@/lib/content', () => ({
  getDossierCards: (locale: string) => [
    {
      slug: 'cpas-bruxellois',
      title: locale === 'nl' ? "De 19 Brusselse OCMW's" : 'Les 19 CPAS bruxellois',
      shortTitle: locale === 'nl' ? "Brusselse OCMW's" : 'CPAS bruxellois',
      localizedSlugs: { nl: 'brusselse-ocmws' },
    },
    {
      slug: 'lez',
      title: 'LEZ',
      shortTitle: undefined,
      localizedSlugs: undefined,
    },
  ],
  getLocalizedSlug: (
    card: { slug: string; localizedSlugs?: Record<string, string> },
    locale: string,
  ) => card.localizedSlugs?.[locale] ?? card.slug,
}));

import { GET } from './route';

function req(locale?: string): Request {
  const url = locale
    ? `https://governance.brussels/api/chat/dossier-titles?locale=${locale}`
    : 'https://governance.brussels/api/chat/dossier-titles';
  return new Request(url);
}

describe('GET /api/chat/dossier-titles', () => {
  it('clé la map sur le slug canonique, avec routeSlug = slug localisé NL', async () => {
    const res = await GET(req('nl'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body['cpas-bruxellois']).toEqual({
      title: "Brusselse OCMW's",
      routeSlug: 'brusselse-ocmws',
    });
  });

  it('routeSlug retombe sur le slug canonique quand le dossier n’a pas de slug localisé pour cette locale', async () => {
    const res = await GET(req('nl'));
    const body = await res.json();
    expect(body.lez).toEqual({ title: 'LEZ', routeSlug: 'lez' });
  });

  it('en français, routeSlug == slug canonique (aucun slug localisé fr)', async () => {
    const res = await GET(req('fr'));
    const body = await res.json();
    expect(body['cpas-bruxellois']).toEqual({
      title: 'CPAS bruxellois',
      routeSlug: 'cpas-bruxellois',
    });
  });

  it('retombe sur fr par défaut si `locale` est absent ou invalide', async () => {
    const res = await GET(req());
    const body = await res.json();
    expect(body['cpas-bruxellois'].routeSlug).toBe('cpas-bruxellois');
  });
});
