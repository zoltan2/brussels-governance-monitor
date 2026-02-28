// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { routing } from '@/i18n/routing';
import { Breadcrumb } from '@/components/breadcrumb';
import { SubscribeForm } from '@/components/subscribe-form';
import { buildMetadata } from '@/lib/metadata';
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
    fr: 'Suivez la gouvernance bruxelloise',
    nl: 'Volg het Brusselse bestuur',
    en: 'Follow Brussels governance',
    de: 'Verfolgen Sie die Brüsseler Regierungsführung',
  };
  const descriptions: Record<string, string> = {
    fr: 'Recevez chaque lundi un résumé des évolutions de la gouvernance bruxelloise.',
    nl: 'Ontvang elke maandag een samenvatting van de ontwikkelingen in het Brusselse bestuur.',
    en: 'Receive a weekly summary of Brussels governance developments every Monday.',
    de: 'Erhalten Sie jeden Montag eine Zusammenfassung der Brüsseler Regierungsentwicklungen.',
  };
  return buildMetadata({
    locale,
    title: titles[locale] || titles.en,
    description: descriptions[locale] || descriptions.en,
  });
}

export default async function SubscribePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <SubscribeView />;
}

function SubscribeView() {
  const t = useTranslations('subscribePage');
  const tb = useTranslations('breadcrumb');

  return (
    <section className="py-12">
      <div className="mx-auto max-w-2xl px-4">
        <Breadcrumb
          items={[
            { label: tb('home'), href: '/' },
            { label: tb('subscribe') },
          ]}
        />

        <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">
          {t('title')}
        </h1>
        <p className="mt-2 text-neutral-600">{t('subtitle')}</p>

        <div className="mt-8">
          <SubscribeForm />
        </div>

        {/* Ce que vous recevrez */}
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-neutral-900">
            {t('whatYouGet')}
          </h2>
          <p className="mt-2 text-sm text-neutral-600">{t('digestContent')}</p>
          <ul className="mt-3 space-y-2 text-sm text-neutral-600">
            <li className="flex items-start gap-2">
              <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-900" />
              {t('digestItem1')}
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-900" />
              {t('digestItem2')}
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-900" />
              {t('digestItem3')}
            </li>
          </ul>
        </div>

        {/* Vos choix, votre langue */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-neutral-900">
            {t('yourChoices')}
          </h2>
          <p className="mt-2 text-sm text-neutral-600">{t('choicesText')}</p>
          <p className="mt-1 text-sm text-neutral-500">{t('choicesDetail')}</p>
        </div>

        {/* GDPR compact */}
        <p className="mt-8 text-xs text-neutral-400">{t('gdpr')}</p>
      </div>
    </section>
  );
}
