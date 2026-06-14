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
    fr: 'Le vice-gouverneur de Bruxelles',
    nl: 'De vicegouverneur van Brussel',
    en: 'The vice-governor of Brussels',
    de: 'Der Vizegouverneur von Brüssel',
  };
  const descriptions: Record<string, string> = {
    fr: 'Le gardien méconnu des lois linguistiques dans les 19 communes bruxelloises.',
    nl: 'De miskende bewaker van de taalwetten in de 19 Brusselse gemeenten.',
    en: 'The little-known guardian of language laws in the 19 Brussels municipalities.',
    de: 'Der wenig bekannte Hüter der Sprachengesetze in den 19 Brüsseler Gemeinden.',
  };
  return buildMetadata({ locale, title: titles[locale] || titles.en, description: descriptions[locale] || descriptions.en, path: '/explainers/vice-gouverneur' });
}

export default async function ViceGouverneurPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ViceGouverneurView />;
}

function ViceGouverneurView() {
  const t = useTranslations('explainers.viceGouverneur');
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

          <h2 className="text-lg font-semibold text-neutral-900">{t('role.title')}</h2>
          <p>{t('role.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('limits.title')}</h2>
          <p>{t('limits.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('uniqueness.title')}</h2>
          <p>{t('uniqueness.description')}</p>

          <div className="rounded-lg border border-brand-200 bg-brand-50/50 p-4">
            <p className="mb-2 font-semibold text-neutral-900">{t('dossierCta.title')}</p>
            <p className="mb-3">{t('dossierCta.description')}</p>
            <Link href={{ pathname: '/dossiers/[slug]', params: { slug: 'vice-gouverneur' } }} className="text-brand-700 underline underline-offset-2 hover:text-brand-900">
              {t('dossierCta.link')}
            </Link>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <ul className="space-y-2">
              <li>
                <Link href="/explainers/levels-of-power" className="text-brand-700 underline underline-offset-2 hover:text-brand-900">
                  {t('linkLevels')}
                </Link>
              </li>
              <li>
                <Link href="/explainers/who-decides-what" className="text-brand-700 underline underline-offset-2 hover:text-brand-900">
                  {t('linkWhoDecides')}
                </Link>
              </li>
              <li>
                <Link href="/explainers/cocom" className="text-brand-700 underline underline-offset-2 hover:text-brand-900">
                  {t('linkCocom')}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
