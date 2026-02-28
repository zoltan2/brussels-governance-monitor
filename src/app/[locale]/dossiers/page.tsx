// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { getDossierCards } from '@/lib/content';
import { buildMetadata } from '@/lib/metadata';
import { Breadcrumb } from '@/components/breadcrumb';
import { SuggestDossier } from '@/components/suggest-dossier';
import { routing, type Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
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
    fr: 'Dossiers clés',
    nl: 'Sleuteldossiers',
    en: 'Key dossiers',
    de: 'Schlüsseldossiers',
  };
  const descriptions: Record<string, string> = {
    fr: "Les dossiers qui façonnent l'avenir de Bruxelles, suivis et sourcés.",
    nl: 'De dossiers die de toekomst van Brussel vormgeven, gevolgd en onderbouwd.',
    en: 'The dossiers shaping the future of Brussels, tracked and sourced.',
    de: 'Die Dossiers, die die Zukunft Brüssels gestalten — verfolgt und belegt.',
  };
  return buildMetadata({
    locale,
    title: titles[locale] || titles.en,
    description: descriptions[locale] || descriptions.en,
    path: '/dossiers',
  });
}

export default async function DossiersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const dossierCards = getDossierCards(locale as Locale);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <DossiersContent dossierCards={dossierCards} />
    </div>
  );
}

const phaseStyles: Record<string, string> = {
  announced: 'border-neutral-400 text-neutral-600',
  planned: 'border-brand-600 text-brand-700',
  'in-progress': 'border-status-ongoing text-status-ongoing',
  stalled: 'border-status-blocked text-status-blocked',
  completed: 'border-status-resolved text-status-resolved',
  cancelled: 'border-neutral-400 text-neutral-500',
};

function DossiersContent({
  dossierCards,
}: {
  dossierCards: ReturnType<typeof getDossierCards>;
}) {
  const t = useTranslations('dossiers');
  const tb = useTranslations('breadcrumb');

  return (
    <>
      <Breadcrumb
        items={[
          { label: tb('home'), href: '/' },
          { label: tb('dossiers') },
        ]}
      />
      <h1 className="mb-2 text-2xl font-bold text-neutral-900">{t('title')}</h1>
      <p className="mb-8 text-sm text-neutral-500">{t('subtitle')}</p>

      {dossierCards.length === 0 ? (
        <p className="text-sm text-neutral-500">{t('noData')}</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {dossierCards.map((card) => (
            <Link
              key={card.slug}
              href={{ pathname: '/dossiers/[slug]', params: { slug: card.slug } }}
              className="group rounded-lg border border-neutral-200 bg-white p-5 transition-shadow hover:shadow-md"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${phaseStyles[card.phase]}`}
                >
                  {t(`phase.${card.phase}`)}
                </span>
              </div>
              <h2 className="mb-2 text-lg font-semibold text-neutral-900 group-hover:text-brand-700">
                {card.title}
              </h2>
              <p className="mb-3 text-sm leading-relaxed text-neutral-600">{card.summary}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
                {card.estimatedBudget && (
                  <span>{t('estimatedBudget')} : {card.estimatedBudget}</span>
                )}
                <span>{t(`decisionLevel.${card.decisionLevel}`)}</span>
                <span>{t(`dossierType.${card.dossierType}`)}</span>
              </div>
            </Link>
          ))}
          <SuggestDossier
            labels={{
              title: t('suggest.title'),
              description: t('suggest.description'),
              nameLabel: t('suggest.nameLabel'),
              namePlaceholder: t('suggest.namePlaceholder'),
              reasonLabel: t('suggest.reasonLabel'),
              reasonPlaceholder: t('suggest.reasonPlaceholder'),
              emailLabel: t('suggest.emailLabel'),
              emailPlaceholder: t('suggest.emailPlaceholder'),
              submit: t('suggest.submit'),
              submitting: t('suggest.submitting'),
              success: t('suggest.success'),
              errorMessage: t('suggest.errorMessage'),
            }}
          />
        </div>
      )}
    </>
  );
}
