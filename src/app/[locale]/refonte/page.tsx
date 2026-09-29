// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { setRequestLocale, getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { routing } from '@/i18n/routing';
import { buildMetadata } from '@/lib/metadata';
import { Link } from '@/i18n/navigation';
import type { Metadata } from 'next';

/*
 * Consultation /refonte : CLOSE le 29/09/2026.
 *
 * Premier vote le 28/04/2026, dernier le 11/05/2026 (spec bgm-ops 2026-04-28-homepage-refonte-
 * participatory-design.md), en francais seulement. Elle a recueilli 16 votes
 * (compte lu en lecture seule sur la base de production le 29/09/2026), sous
 * le seuil de validite de 50 votes complets que fixait sa propre spec.
 * L'accueil a ete refait le 18/09/2026 (#493). La page promettait une synthese
 * « a la cloture » : la note dit qu'il n'y en aura pas, et pourquoi.
 *
 * Le formulaire, les quatre maquettes (/refonte/preview/*) et leur gabarit ont
 * ete retires ; ils restent dans l'historique git. La route
 * /api/refonte-vote refuse tout vote (410). Les votes deja recus restent
 * consultables dans /admin/refonte.
 *
 * La note est servie dans les quatre langues, alors que le formulaire n'etait
 * qu'en francais : un lien partage vers /nl/refonte recoit une reponse, pas
 * une 404.
 */

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'refonte' });
  const base = buildMetadata({
    locale,
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: '/refonte',
  });
  return {
    ...base,
    robots: { index: false, follow: false },
  };
}

export default async function RefontePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <RefonteClose />;
}

function RefonteClose() {
  const t = useTranslations('refonte');

  return (
    <section className="py-12">
      <div className="mx-auto max-w-3xl px-4">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.22em] text-neutral-500">
          {t('eyebrow')}
        </p>
        <h1 className="text-2xl font-bold text-neutral-900 md:text-3xl">{t('title')}</h1>
        <p className="mt-2 text-sm text-neutral-500">{t('noteDate')}</p>

        <div className="mt-8 space-y-4 text-base leading-relaxed text-neutral-700">
          <p>{t('intro')}</p>
          <p>{t('participation')}</p>
          <p>{t('home')}</p>
          <p>{t('next')}</p>
          <p className="text-sm text-neutral-600">
            {t('privacy')}{' '}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-neutral-900">
              {t('privacyLink')}
            </Link>
          </p>
        </div>

        <Link
          href="/"
          className="mt-10 inline-flex items-center text-sm text-neutral-500 hover:text-neutral-700"
        >
          <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('homeLink')}
        </Link>
      </div>
    </section>
  );
}
