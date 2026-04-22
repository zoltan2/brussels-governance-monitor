// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextResponse } from 'next/server';
import { getDossierCards } from '@/lib/content';
import type { Locale } from '@/i18n/routing';

export const runtime = 'nodejs';

const SUPPORTED: readonly Locale[] = ['fr', 'nl', 'en', 'de'];

function toLocale(s: string | null): Locale {
  if (!s) return 'fr';
  return (SUPPORTED as readonly string[]).includes(s) ? (s as Locale) : 'fr';
}

/**
 * Returns a lightweight map `slug → localized title` for the 4 supported
 * locales. Used by the chat widget to render dossier chips with the
 * localized title instead of the raw (French-only) slug. getDossierCards()
 * falls back to FR automatically when a translation doesn't exist.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = toLocale(searchParams.get('locale'));
  const cards = getDossierCards(locale);
  const titles: Record<string, string> = {};
  for (const c of cards) {
    titles[c.slug] = c.shortTitle?.trim() || c.title;
  }
  return NextResponse.json(titles, {
    headers: {
      // 1h CDN cache — titles change rarely, locale is part of the URL.
      'Cache-Control': 'public, max-age=60, s-maxage=3600',
    },
  });
}
