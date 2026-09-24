// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextResponse } from 'next/server';
import { getDossierCards, getLocalizedSlug } from '@/lib/content';
import { rateLimit } from '@/lib/rate-limit';
import { clientIp } from '@/lib/client-ip';
import type { Locale } from '@/i18n/routing';

export const runtime = 'nodejs';

const SUPPORTED: readonly Locale[] = ['fr', 'nl', 'en', 'de'];

function toLocale(s: string | null): Locale {
  if (!s) return 'fr';
  return (SUPPORTED as readonly string[]).includes(s) ? (s as Locale) : 'fr';
}

export interface DossierTitleEntry {
  title: string;
  /**
   * Slug to use in the dossier's URL for this locale: the localized slug
   * (`localizedSlugs`) when the dossier has one for this locale, otherwise
   * the canonical slug (same value as the map key). Kept distinct from the
   * key on purpose: the key is the canonical slug the LLM writes in its
   * `[Dossier: slug]` marker (unchanged contract), `routeSlug` is only for
   * building the link. See PR #593.
   */
  routeSlug: string;
}

/**
 * Returns a lightweight map `canonical slug → { title, routeSlug }` for the
 * 4 supported locales. Used by the chat widget to render dossier chips with
 * the localized title and link to the localized URL instead of the raw
 * canonical slug. getDossierCards() falls back to FR automatically when a
 * translation doesn't exist.
 */
export async function GET(request: Request) {
  const { allowed } = rateLimit(clientIp(request.headers));
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const locale = toLocale(searchParams.get('locale'));
  const cards = getDossierCards(locale);
  const dossiers: Record<string, DossierTitleEntry> = {};
  for (const c of cards) {
    dossiers[c.slug] = {
      title: c.shortTitle?.trim() || c.title,
      routeSlug: getLocalizedSlug(c, locale),
    };
  }
  return NextResponse.json(dossiers, {
    headers: {
      // 1h CDN cache — titles change rarely, locale is part of the URL.
      'Cache-Control': 'public, max-age=60, s-maxage=3600',
    },
  });
}
