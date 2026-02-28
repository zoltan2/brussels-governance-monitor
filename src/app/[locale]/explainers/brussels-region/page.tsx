// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { routing } from '@/i18n/routing';
import { buildMetadata } from '@/lib/metadata';
import { Link } from '@/i18n/navigation';
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
  const titles: Record<string, string> = {
    fr: 'La Région de Bruxelles-Capitale',
    nl: 'Het Brussels Hoofdstedelijk Gewest',
    en: 'The Brussels-Capital Region',
    de: 'Die Region Brüssel-Hauptstadt',
  };
  const descriptions: Record<string, string> = {
    fr: 'Gouvernement, Parlement, compétences et budget de la Région de Bruxelles-Capitale.',
    nl: 'Regering, Parlement, bevoegdheden en begroting van het Brussels Hoofdstedelijk Gewest.',
    en: 'Government, Parliament, competences and budget of the Brussels-Capital Region.',
    de: 'Regierung, Parlament, Zuständigkeiten und Haushalt der Region Brüssel-Hauptstadt.',
  };
  return buildMetadata({ locale, title: titles[locale] || titles.en, description: descriptions[locale] || descriptions.en, path: '/explainers/brussels-region' });
}

export default async function BrusselsRegionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <BrusselsRegionView />;
}

function BrusselsRegionView() {
  const t = useTranslations('explainers.brusselsRegion');
  const tb = useTranslations('breadcrumb');

  return (
    <section className="py-12">
      <div className="mx-auto max-w-5xl px-4">
        <Breadcrumb items={[
          { label: tb('home'), href: '/' },
          { label: tb('understand'), href: '/understand' },
          { label: t('title') },
        ]} />

        <h1 className="mb-4 text-2xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="mb-8 text-sm text-neutral-500">{t('subtitle')}</p>

        <div className="space-y-8 text-sm leading-relaxed text-neutral-700">
          <p>{t('intro')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('government.title')}</h2>
          <p>{t('government.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('parliament.title')}</h2>
          <p>{t('parliament.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('competences.title')}</h2>
          <p>{t('competences.description')}</p>
          <p>{t('competences.list')}</p>
          <p className="text-xs italic text-neutral-500">{t('competences.note')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('budget.title')}</h2>
          <p>{t('budget.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('pararegional.title')}</h2>
          <p>{t('pararegional.description')}</p>

          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <ul className="space-y-2">
              <li>
                <Link href="/explainers/cocom" className="text-brand-700 underline underline-offset-2 hover:text-brand-900">
                  {t('linkCocom')}
                </Link>
              </li>
              <li>
                <Link href="/explainers/levels-of-power" className="text-brand-700 underline underline-offset-2 hover:text-brand-900">
                  {t('linkLevels')}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
