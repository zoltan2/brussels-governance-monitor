// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { buildMetadata } from '@/lib/metadata';
import { Breadcrumb } from '@/components/breadcrumb';
import type { Metadata } from 'next';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'signalPage' });
  return buildMetadata({
    locale,
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: '/signal',
  });
}

const LINKEDIN_SUBSCRIBE_URL =
  'https://www.linkedin.com/newsletters/le-signal-bgm-7430513857359527936/';

export default async function SignalPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'signalPage' });
  // Le Signal ne paraît qu'en français, sur LinkedIn. La page est traduite, mais
  // elle le dit en tête dans les autres langues, et la carte de l'accueil n'est
  // montrée que sur l'accueil français (demande du 17/11/2026).
  const frenchOnly = locale !== 'fr';

  return (
    <section className="py-12">
      <div className="mx-auto max-w-2xl px-4">
        <Breadcrumb
          items={[{ label: t('breadcrumbHome'), href: `/${locale}` }, { label: 'Le Signal' }]}
        />

        {/* Visuel du Signal, le même que la carte de la page d'accueil. Décoratif :
            le titre et le chapeau portent le sens, d'où alt vide. */}
        <Image
          src="/merci-cafe/signal-bgm.webp"
          alt=""
          width={800}
          height={450}
          className="mb-8 w-full rounded-xl border border-neutral-200"
        />

        {/* Hero */}
        <div className="mb-10">
          <div className="mb-3 text-xs uppercase tracking-widest text-neutral-500">
            {t('eyebrow')}
          </div>
          {/* Nom propre de la newsletter, en français dans toutes les langues. */}
          <h1 lang="fr" className="text-3xl font-bold text-neutral-900 sm:text-4xl">
            Le Signal
          </h1>
          <p className="mt-3 text-lg leading-relaxed text-neutral-600">
            {t('intro')}
            <br />
            <strong className="text-neutral-900">{t('introStrong')}</strong>
          </p>
          {frenchOnly && (
            <p className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm leading-relaxed text-neutral-700">
              {t('frenchOnly')}
            </p>
          )}
        </div>

        {/* CTA principal */}
        <div className="mb-10 rounded-xl border border-neutral-200 bg-neutral-50 p-6 sm:p-8">
          <div className="text-center">
            <p className="mb-4 text-sm text-neutral-600">{t('ctaNote')}</p>
            <a
              href={LINKEDIN_SUBSCRIBE_URL}
              target="_blank"
              rel="noopener noreferrer"
              hrefLang="fr"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-900 px-6 py-3 text-sm font-medium text-neutral-50 transition hover:bg-brand-800"
            >
              <LinkedInIcon />
              {t('ctaButton')}
            </a>
          </div>
        </div>

        {/* Ce que c'est */}
        <div className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-neutral-900">{t('whatTitle')}</h2>
          <p className="text-sm leading-relaxed text-neutral-600">{t('whatBody')}</p>
        </div>

        {/* Format */}
        <div className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-neutral-900">{t('formatTitle')}</h2>
          <ul className="space-y-3 text-sm text-neutral-600">
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-800" />
              <span>
                <strong className="font-medium text-neutral-900">{t('item1Title')}</strong> :{' '}
                {t('item1Body')}
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-800" />
              <span>
                <strong className="font-medium text-neutral-900">{t('item2Title')}</strong> :{' '}
                {t('item2Body')}
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-800" />
              <span>
                <strong className="font-medium text-neutral-900">{t('item3Title')}</strong> :{' '}
                {t('item3Body')}
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-800" />
              <span>
                <strong className="font-medium text-neutral-900">{t('item4Title')}</strong> :{' '}
                {t('item4Body')}
              </span>
            </li>
          </ul>
        </div>

        {/* Pour qui */}
        <div className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-neutral-900">{t('forWhomTitle')}</h2>
          <p className="mb-3 text-sm leading-relaxed text-neutral-600">{t('forWhomIntro')}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                'audience1',
                'audience2',
                'audience3',
                'audience4',
                'audience5',
                'audience6',
              ] as const
            ).map((key) => (
              <div
                key={key}
                className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700"
              >
                {t(key)}
              </div>
            ))}
          </div>
        </div>

        {/* CTA secondaire */}
        <div className="mb-10 rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-center">
          <p className="mb-1 text-sm font-medium text-neutral-900">{t('cta2Title')}</p>
          <p className="mb-4 text-xs text-neutral-500">{t('cta2Note')}</p>
          <a
            href={LINKEDIN_SUBSCRIBE_URL}
            target="_blank"
            rel="noopener noreferrer"
            hrefLang="fr"
            className="inline-flex items-center gap-2 rounded-lg border border-brand-800 px-6 py-3 text-sm font-medium text-brand-800 transition hover:bg-neutral-100"
          >
            <LinkedInIcon />
            {t('cta2Button')}
          </a>
        </div>

        {/* Séparation + digest email */}
        <div className="border-t border-neutral-100 pt-8 text-center">
          <p className="mb-1 text-xs uppercase tracking-widest text-neutral-500">
            {t('emailEyebrow')}
          </p>
          <p className="mb-3 text-sm text-neutral-600">{t('emailBody')}</p>
          <a
            href={`/${locale}/subscribe`}
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-800 hover:underline"
          >
            {t('emailLink')} →
          </a>
        </div>
      </div>
    </section>
  );
}

function LinkedInIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}
