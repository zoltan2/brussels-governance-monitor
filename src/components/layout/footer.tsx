// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';

export function Footer() {
  const t = useTranslations('footer');
  const locale = useLocale();

  const podcastUrl =
    locale === 'nl'
      ? 'https://podcast.governance.brussels/@debriefingbgm'
      : locale === 'fr'
        ? 'https://podcast.governance.brussels/@lebriefingbgm'
        : null;

  return (
    <footer className="border-t border-neutral-200 bg-neutral-50">
      <div className="mx-auto max-w-5xl px-4 py-10">
        {/* Support banner */}
        <div className="mb-8 flex flex-col items-center gap-3 rounded-lg border border-brand-700/20 bg-brand-900/5 px-6 py-5 sm:flex-row sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-neutral-800">{t('supportTitle')}</p>
            <p className="mt-0.5 text-xs text-neutral-500">{t('supportSubtitle')}</p>
          </div>
          <Link
            href="/support"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-brand-900 px-5 py-2.5 text-xs font-semibold text-neutral-50 shadow-sm transition-all hover:bg-brand-800 hover:shadow-md"
          >
            {t('supportCta')}
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>
          </Link>
        </div>

        <div className="grid gap-8 sm:grid-cols-3">
          {/* Column 1: Explorer */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              {t('explorerTitle')}
            </p>
            <nav aria-label={t('explorerTitle')} className="flex flex-col gap-1 text-xs text-neutral-600 [&>a]:py-1 [&>a]:min-h-[24px]">
              <Link href="/domains" className="hover:text-neutral-700">
                {t('domains')}
              </Link>
              <Link href="/sectors" className="hover:text-neutral-700">
                {t('sectors')}
              </Link>
              <Link href="/solutions" className="hover:text-neutral-700">
                {t('solutions')}
              </Link>
              <Link href="/comparisons" className="hover:text-neutral-700">
                {t('comparisons')}
              </Link>
              <Link href="/communes" className="hover:text-neutral-700">
                {t('communes')}
              </Link>
              <Link href="/dossiers" className="hover:text-neutral-700">
                {t('dossiers')}
              </Link>
            </nav>
          </div>

          {/* Column 2: Comprendre */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              {t('comprendreTitle')}
            </p>
            <nav aria-label={t('comprendreTitle')} className="flex flex-col gap-1 text-xs text-neutral-600 [&>a]:py-1 [&>a]:min-h-[24px]">
              <Link href="/timeline" className="hover:text-neutral-700">
                {t('timeline')}
              </Link>
              <Link href="/glossary" className="hover:text-neutral-700">
                {t('glossary')}
              </Link>
              <Link href="/faq" className="hover:text-neutral-700">
                {t('faq')}
              </Link>
              <Link href="/data" className="hover:text-neutral-700">
                {t('data')}
              </Link>
              <Link href="/changelog" className="hover:text-neutral-700">
                {t('changelog')}
              </Link>
              <Link href="/radar" className="hover:text-neutral-700">
                {t('radar')}
              </Link>
              {podcastUrl && (
                <a
                  href={podcastUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-neutral-700"
                >
                  {t('podcast')}
                  <span className="ml-1 text-neutral-500" aria-hidden="true">&#8599;</span>
                  <span className="sr-only"> ({t('newTab')})</span>
                </a>
              )}
            </nav>
          </div>

          {/* Column 3: Transparence */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              {t('transparenceTitle')}
            </p>
            <nav aria-label={t('transparenceTitle')} className="flex flex-col gap-1 text-xs text-neutral-600 [&>a]:py-1 [&>a]:min-h-[24px]">
              <Link href="/transparency" className="hover:text-neutral-700">
                {t('transparenceTitle')}
              </Link>
              <Link href="/editorial" className="hover:text-neutral-700">
                {t('editorial')}
              </Link>
              <Link href="/methodology" className="hover:text-neutral-700">
                {t('methodology')}
              </Link>
              <Link href="/accessibility" className="hover:text-neutral-700">
                {t('accessibility')}
              </Link>
              <Link href="/about" className="hover:text-neutral-700">
                {t('about')}
              </Link>
              <Link href="/press" className="hover:text-neutral-700">
                {t('press')}
              </Link>
            </nav>
          </div>
        </div>

        {/* Legal bar */}
        <div className="mt-8 border-t border-neutral-200 pt-6 text-center">
          <p className="text-sm font-medium text-neutral-600">{t('project')}</p>
          <p className="mt-1 text-xs text-neutral-500">{t('identity')}</p>
          <p className="mt-2 text-xs text-neutral-500">
            <Link href="/privacy" className="hover:text-neutral-700">{t('privacy')}</Link>
            {' · '}
            <Link href="/legal" className="hover:text-neutral-700">{t('legal')}</Link>
          </p>
          <p className="mt-1 text-xs text-neutral-500">{t('disclaimer')}</p>
        </div>
      </div>
    </footer>
  );
}
