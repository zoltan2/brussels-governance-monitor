// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export function Footer() {
  const t = useTranslations('footer');

  return (
    <footer className="border-t border-neutral-200 bg-neutral-50">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid gap-8 sm:grid-cols-3">
          {/* Column 1: Explorer */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              {t('explorerTitle')}
            </p>
            <nav aria-label={t('explorerTitle')} className="flex flex-col gap-2 text-xs text-neutral-600">
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
            <nav aria-label={t('comprendreTitle')} className="flex flex-col gap-2 text-xs text-neutral-600">
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
            </nav>
          </div>

          {/* Column 3: Transparence */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              {t('transparenceTitle')}
            </p>
            <nav aria-label={t('transparenceTitle')} className="flex flex-col gap-2 text-xs text-neutral-600">
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
