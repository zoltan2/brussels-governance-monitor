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
  const titles: Record<string, string> = { fr: 'Notre méthode', nl: 'Onze methode', en: 'Our Method', de: 'Unsere Methode' };
  const descriptions: Record<string, string> = {
    fr: 'Comment nous vérifions, estimons et corrigeons nos informations sur la gouvernance bruxelloise.',
    nl: 'Hoe wij onze informatie over het Brusselse bestuur verifiëren, schatten en corrigeren.',
    en: 'How we verify, estimate and correct our information on Brussels governance.',
    de: 'Wie wir unsere Informationen zur Brüsseler Regierungsführung überprüfen, schätzen und korrigieren.',
  };
  return buildMetadata({ locale, title: titles[locale] || titles.en, description: descriptions[locale] || descriptions.en, path: '/methodology' });
}

export default async function MethodologyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <MethodologyView />;
}

function MethodologyView() {
  const t = useTranslations('methodology');
  const tb = useTranslations('breadcrumb');
  const td = useTranslations('domains');

  return (
    <section className="py-12">
      <div className="mx-auto max-w-5xl px-4">
        <Breadcrumb items={[
          { label: tb('home'), href: '/' },
          { label: tb('transparency'), href: '/transparency' },
          { label: tb('methodology') },
        ]} />

        <h1 className="mb-4 text-2xl font-bold text-neutral-900">{t('title')}</h1>

        <div className="space-y-8 text-sm leading-relaxed text-neutral-700">
          {/* Intro */}
          <p className="text-base">{t('intro')}</p>

          {/* Mission */}
          <div>
            <h2 className="mb-2 text-lg font-semibold text-neutral-900">{t('mission.title')}</h2>
            <ul className="ml-4 list-disc space-y-1">
              <li>{t('mission.what')}</li>
              <li>{t('mission.whatNot')}</li>
              <li>{t('mission.known')}</li>
            </ul>
          </div>

          {/* Model */}
          <div>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">{t('model.title')}</h2>
            <div className="space-y-3">
              <div className="rounded-lg bg-neutral-50 p-4">
                <p className="font-medium text-neutral-900">{t('model.cards')}</p>
                <p className="mt-1">{t('model.cardsDesc')}</p>
              </div>
              <div className="rounded-lg bg-neutral-50 p-4">
                <p className="font-medium text-neutral-900">{t('model.events')}</p>
                <p className="mt-1">{t('model.eventsDesc')}</p>
              </div>
              <div className="rounded-lg bg-neutral-50 p-4">
                <p className="font-medium text-neutral-900">{t('model.verifications')}</p>
                <p className="mt-1">{t('model.verificationsDesc')}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-neutral-500 italic">{t('model.conclusion')}</p>
          </div>

          {/* Statuses */}
          <div>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">{t('statuses.title')}</h2>
            <p className="mb-3">{t('statuses.description')}</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-neutral-200 p-3">
                <span className="inline-block rounded-full bg-status-blocked px-2 py-0.5 text-xs font-medium text-white">
                  blocked
                </span>
                <p className="mt-1.5 text-xs">{t('statuses.blocked')}</p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-3">
                <span className="inline-block rounded-full bg-status-delayed px-2 py-0.5 text-xs font-medium text-white">
                  delayed
                </span>
                <p className="mt-1.5 text-xs">{t('statuses.delayed')}</p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-3">
                <span className="inline-block rounded-full bg-status-ongoing px-2 py-0.5 text-xs font-medium text-white">
                  ongoing
                </span>
                <p className="mt-1.5 text-xs">{t('statuses.ongoing')}</p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-3">
                <span className="inline-block rounded-full bg-status-resolved px-2 py-0.5 text-xs font-medium text-white">
                  resolved
                </span>
                <p className="mt-1.5 text-xs">{t('statuses.resolved')}</p>
              </div>
            </div>
            <p className="mt-3">{t('statuses.criteria')}</p>
            <p className="mt-1 text-xs text-neutral-500 italic">{t('statuses.prudence')}</p>
          </div>

          {/* Data Sources */}
          <div>
            <h2 className="mb-2 text-lg font-semibold text-neutral-900">{t('dataSources.title')}</h2>
            <p className="mb-2">{t('dataSources.description')}</p>
            <ul className="ml-4 list-disc space-y-2">
              <li><strong>{t('dataSources.tierA')}</strong> — {t('dataSources.tierADesc')}</li>
              <li><strong>{t('dataSources.tierB')}</strong> — {t('dataSources.tierBDesc')}</li>
              <li><strong>{t('dataSources.tierC')}</strong> — {t('dataSources.tierCDesc')}</li>
              <li><strong>{t('dataSources.tierD')}</strong> — {t('dataSources.tierDDesc')}</li>
            </ul>
            <p className="mt-3">{t('dataSources.noSource')}</p>
            <p className="mt-2">
              <Link
                href="/data"
                className="text-brand-700 underline underline-offset-2 hover:text-brand-900"
              >
                {t('dataSources.allSources')}
              </Link>
            </p>
          </div>

          {/* Estimations */}
          <div>
            <h2 className="mb-2 text-lg font-semibold text-neutral-900">{t('estimations.title')}</h2>
            <p className="mb-2">{t('estimations.description')}</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>{t('estimations.signaled')}</li>
              <li>{t('estimations.publicData')}</li>
              <li>{t('estimations.documented')}</li>
              <li>{t('estimations.margin')}</li>
            </ul>
            <p className="mt-3 text-xs text-neutral-500 italic">{t('estimations.conclusion')}</p>
          </div>

          {/* Uncertainty */}
          <div>
            <h2 className="mb-2 text-lg font-semibold text-neutral-900">{t('uncertainty.title')}</h2>
            <p className="mb-2">{t('uncertainty.description')}</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>{t('uncertainty.flagged')}</li>
              <li>{t('uncertainty.maintained')}</li>
              <li>{t('uncertainty.suspended')}</li>
            </ul>
            <p className="mt-3 text-xs text-neutral-500 italic">{t('uncertainty.conclusion')}</p>
          </div>

          {/* Confidence Levels */}
          <div>
            <h2 className="mb-2 text-lg font-semibold text-neutral-900">{t('confidence.title')}</h2>
            <ul className="ml-4 list-disc space-y-2">
              <li>
                <strong>{td('confidence.official')}</strong> — {t('confidence.officialDesc')}
              </li>
              <li>
                <strong>{td('confidence.estimated')}</strong> — {t('confidence.estimatedDesc')}
              </li>
              <li>
                <strong>{td('confidence.unconfirmed')}</strong> — {t('confidence.unconfirmedDesc')}
              </li>
            </ul>
          </div>

          {/* Limitations */}
          <div>
            <h2 className="mb-2 text-lg font-semibold text-neutral-900">{t('limitations.title')}</h2>
            <ul className="ml-4 list-disc space-y-1">
              <li>{t('limitations.noPrediction')}</li>
              <li>{t('limitations.noJudgment')}</li>
              <li>{t('limitations.noEmotional')}</li>
              <li>{t('limitations.noPersonalization')}</li>
              <li>{t('limitations.noCausation')}</li>
            </ul>
            <p className="mt-2">{t('limitations.conclusion')}</p>
          </div>

          {/* Transparency */}
          <div>
            <h2 className="mb-2 text-lg font-semibold text-neutral-900">{t('transparency.title')}</h2>
            <p className="mb-2">{t('transparency.description')}</p>
            <p className="mb-1">{t('transparency.channel')}</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>{t('transparency.reportError')}</li>
              <li>{t('transparency.suggestSource')}</li>
              <li>{t('transparency.askClarification')}</li>
            </ul>
            <p className="mt-2">{t('transparency.response')}</p>
          </div>

          {/* Verification Protocol */}
          <div>
            <h2 className="mb-2 text-lg font-semibold text-neutral-900">{t('protocol.title')}</h2>
            <p className="mb-3">{t('protocol.intro')}</p>
            <div className="space-y-2">
              <div className="rounded-lg border border-teal-200 bg-teal-50 p-3">
                <p className="text-xs font-medium text-teal-800">{t('protocol.v1Title')}</p>
                <p className="mt-1 text-xs text-teal-700">{t('protocol.v1Desc')}</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-medium text-amber-800">{t('protocol.v2Title')}</p>
                <p className="mt-1 text-xs text-amber-700">{t('protocol.v2Desc')}</p>
              </div>
              <div className="rounded-lg border border-neutral-300 bg-neutral-100 p-3">
                <p className="text-xs font-medium text-neutral-700">{t('protocol.v3Title')}</p>
                <p className="mt-1 text-xs text-neutral-600">{t('protocol.v3Desc')}</p>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-xs font-medium text-neutral-600">{t('protocol.v4Title')}</p>
                <p className="mt-1 text-xs text-neutral-500">{t('protocol.v4Desc')}</p>
              </div>
            </div>
          </div>

          {/* Corrections */}
          <div>
            <h2 className="mb-2 text-lg font-semibold text-neutral-900">{t('corrections.title')}</h2>
            <p className="mb-2">{t('corrections.description')}</p>
            <ul className="ml-4 list-disc space-y-2">
              <li><strong>{t('corrections.minor')}</strong> — {t('corrections.minorDesc')}</li>
              <li><strong>{t('corrections.substantial')}</strong> — {t('corrections.substantialDesc')}</li>
              <li><strong>{t('corrections.retraction')}</strong> — {t('corrections.retractionDesc')}</li>
            </ul>
          </div>

          {/* Independence */}
          <div>
            <h2 className="mb-2 text-lg font-semibold text-neutral-900">{t('independence.title')}</h2>
            <p>{t('independence.description')}</p>
          </div>

          {/* Citation policy */}
          <div>
            <h2 className="mb-2 text-lg font-semibold text-neutral-900">{t('citation.title')}</h2>
            <p className="mb-2">{t('citation.description')}</p>
            <blockquote className="border-l-2 border-brand-200 pl-4 text-sm italic text-neutral-600">
              {t('citation.format')}
            </blockquote>
            <p className="mt-2">{t('citation.encouraged')}</p>
          </div>

          {/* Self-limitations */}
          <div>
            <h2 className="mb-2 text-lg font-semibold text-neutral-900">{t('selfLimitations.title')}</h2>
            <p className="mb-2">{t('selfLimitations.description')}</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>{t('selfLimitations.framing')}</li>
              <li>{t('selfLimitations.coverage')}</li>
              <li>{t('selfLimitations.dataDependency')}</li>
              <li>{t('selfLimitations.team')}</li>
            </ul>
            <p className="mt-2 text-xs text-neutral-500">{t('selfLimitations.conclusion')}</p>
          </div>

          {/* See editorial */}
          <p className="mt-4">
            <Link href="/editorial" className="text-brand-700 underline underline-offset-2 hover:text-brand-900">
              {t('seeEditorial')}
            </Link>
          </p>

          {/* Tagline */}
          <div className="mt-8 rounded-lg border border-brand-200 bg-brand-50 p-5 text-center">
            <p className="text-sm font-medium text-brand-900">{t('tagline')}</p>
          </div>

          <p className="mt-4 text-xs text-neutral-500">
            {t('lastUpdated', { date: '2026-02-08' })}
          </p>
        </div>
      </div>
    </section>
  );
}
