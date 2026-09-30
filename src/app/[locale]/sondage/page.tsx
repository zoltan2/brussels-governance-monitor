// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Sondage lecteurs du digest : /fr/sondage et /nl/enquete.
 *
 * Spec : bgm-ops specs/2026-09-25-sondage-lecteurs-design.md, § 13 (V3, validée
 * le 30/09/2026). Anonyme : aucun jeton, aucun lien vers un contact. La page
 * n'est liée depuis nulle part sur le site ; l'accès passe par l'encart du
 * digest du 16/11/2026.
 *
 *  - Français et néerlandais seulement : /en/sondage et /de/sondage répondent 404.
 *  - noindex, hors sitemap (sitemap.ts ne la liste pas), hors Pagefind
 *    (SearchExclude), exclue de robots.txt, `Cache-Control: private, no-store`
 *    (next.config.ts ; la page est de toute façon dynamique : elle lit le cookie).
 *  - Sans bulle du chat ni panneau de jeux (src/lib/pages-sans-widgets.ts).
 */
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { getDb } from '@/lib/db';
import { SearchExclude } from '@/components/search-exclude';
import { Sondage } from '@/components/sondage/sondage';
import { campagneDepuisEnv, piloteParEnv } from '@/lib/sondage/campagne';
import { COOKIE_SONDAGE } from '@/lib/sondage/cookie';
import { etatInitial } from '@/lib/sondage/page-etat';
import { estLangueSondage } from '@/lib/sondage/questionnaire';
import { TEXTES } from '@/lib/sondage/textes';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!estLangueSondage(locale)) return { robots: { index: false, follow: false } };
  return {
    title: TEXTES[locale].titrePage,
    robots: { index: false, follow: false },
  };
}

export default async function SondagePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ pilote?: string }>;
}) {
  const { locale } = await params;
  if (!estLangueSondage(locale)) notFound();
  setRequestLocale(locale);

  const { pilote } = await searchParams;
  const session = (await cookies()).get(COOKIE_SONDAGE)?.value;
  const initial = etatInitial(getDb(), session, new Date(), campagneDepuisEnv());
  const cheminPrivacy = (routing.pathnames['/privacy'] as Record<string, string>)[locale];

  return (
    <SearchExclude>
      <section className="py-10">
        <div className="mx-auto max-w-xl break-words px-4">
          <Sondage
            langue={locale}
            initial={initial}
            pilote={piloteParEnv() || pilote === '1'}
            lienNotice={`/${locale}${cheminPrivacy}#sondage`}
          />
        </div>
      </section>
    </SearchExclude>
  );
}
