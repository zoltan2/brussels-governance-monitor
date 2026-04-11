// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { CrisisCounter } from '@/components/crisis-counter';
import { DomainCard } from '@/components/domain-card';
import { SubscribeForm } from '@/components/subscribe-form';
import { getDomainCards, getSectorCards, getDossierCards, getAllDossierTopicOptions } from '@/lib/content';
import { getActiveSignals, getVeilleSourceCount } from '@/lib/radar';
import { getLatestUpdate } from '@/lib/changelog';
import { LatestUpdateBar } from '@/components/latest-update-bar';
import { GovernmentTable } from '@/components/government-table';
import { formatDate } from '@/lib/utils';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import type { DossierCard as DossierCardType, SectorCard as SectorCardType } from '@/lib/content';
import type { LocalizedRadarEntry } from '@/lib/radar';
import { buildMetadata } from '@/lib/metadata';
import { SupportCtaHome } from '@/components/support-cta';
import { BookBanner } from '@/components/book-banner';
import {
  Radio,
  BookOpen,
  Eye,
  ArrowRight,
  Map,
  Building,
  Users,
  Scale,
  Target,
  FolderOpen,
  LayoutGrid,
  Building2,
} from 'lucide-react';

const titles: Record<string, string> = {
  fr: 'Gouvernance bruxelloise — Suivi citoyen et factuel',
  nl: 'Brussels bestuur — Onafhankelijke burgeropvolging',
  en: 'Brussels Governance — Independent Citizen Monitoring',
  de: 'Brüsseler Regierungsführung — Unabhängige Bürgerüberwachung',
};

const descriptions: Record<string, string> = {
  fr: 'Moniteur indépendant de la gouvernance à Bruxelles. Engagements de la DPR, dossiers clés, composition du gouvernement et données ouvertes.',
  nl: 'Onafhankelijke monitor van het Brusselse bestuur. DPR-engagementen, sleuteldossiers, regeringssamenstelling en open data.',
  en: 'Independent Brussels governance monitor. DPR commitments, key dossiers, government composition and open data.',
  de: 'Unabhängiger Monitor der Brüsseler Regierungsführung. DPR-Verpflichtungen, Schlüsseldossiers, Regierungszusammensetzung und offene Daten.',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const title = titles[locale] || titles.fr;
  const description = descriptions[locale] || descriptions.fr;

  return buildMetadata({
    locale,
    title,
    description,
    ogParams: `title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent('governance.brussels')}`,
  });
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const domainCards = getDomainCards(locale as Locale);
  const sectorCards = getSectorCards(locale as Locale);
  const dossierCards = getDossierCards(locale as Locale);
  const radarSignals = getActiveSignals(locale as Locale, 3);
  const veilleSourceCount = getVeilleSourceCount();
  const latestUpdate = getLatestUpdate(locale as Locale);

  // Sort by lastModified desc for homepage previews
  const recentDossiers = [...dossierCards]
    .sort((a, b) => b.lastModified.localeCompare(a.lastModified))
    .slice(0, 4);
  const recentDomains = [...domainCards]
    .sort((a, b) => b.lastModified.localeCompare(a.lastModified))
    .slice(0, 4);
  const recentSectors = [...sectorCards]
    .sort((a, b) => b.lastModified.localeCompare(a.lastModified))
    .slice(0, 6);

  return (
    <>
      <CrisisCounter />

      <CommemorationBanner locale={locale} />

      <LatestUpdateBar
        date={latestUpdate.date}
        description={latestUpdate.description}
        summary={latestUpdate.summary}
        section={latestUpdate.section}
        targetSlug={latestUpdate.targetSlug}
        anchor={latestUpdate.anchor}
        locale={locale}
      />

      <TwoColumnSection
        signals={radarSignals}
        locale={locale}
        veilleSourceCount={veilleSourceCount}
      />

      <DashboardCta />

      <DossiersPreview dossierCards={recentDossiers} locale={locale} totalCount={dossierCards.length} />

      <DomainsPreview domainCards={recentDomains} locale={locale} totalCount={domainCards.length} />

      <SectorsPreview sectorCards={recentSectors} totalCount={sectorCards.length} />

      <BookBanner />

      <QuizPromo />

      <SupportCtaHome />

      <SubscribeSection dossierOptions={getAllDossierTopicOptions(locale as Locale).map((d) => ({ id: d.topicId, label: d.label }))} />
    </>
  );
}

// ──────────────────────────────────────────────
// Two-column section: Suivre + Comprendre
// ──────────────────────────────────────────────

function TwoColumnSection({
  signals,
  locale,
  veilleSourceCount,
}: {
  signals: LocalizedRadarEntry[];
  locale: string;
  veilleSourceCount: number;
}) {
  return (
    <section className="py-10">
      <div className="mx-auto max-w-5xl px-4">
        <div className="grid gap-8 md:grid-cols-[3fr_2fr]">
          <FollowColumn signals={signals} locale={locale} veilleSourceCount={veilleSourceCount} />
          <UnderstandColumn locale={locale} />
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────
// Left column: Suivre (Veille badge + Signals + Shield footnote)
// ──────────────────────────────────────────────

function FollowColumn({
  signals,
  locale,
  veilleSourceCount,
}: {
  signals: LocalizedRadarEntry[];
  locale: string;
  veilleSourceCount: number;
}) {
  const t = useTranslations('home');
  const tr = useTranslations('radar');

  return (
    <div className="flex flex-col">
      {/* Column title */}
      <div className="mb-4 flex items-center gap-2">
        <Radio size={18} className="text-neutral-500" aria-hidden={true} />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
          {t('columnFollow')}
        </h2>
      </div>

      <div className="flex-1 rounded-lg border border-neutral-200 bg-neutral-50">
        {/* 1. Veille badge — reassuring opener */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-2 text-xs text-neutral-700">
            <Eye size={14} className="shrink-0 text-neutral-500" aria-hidden={true} />
            <span className="font-medium">
              {t('veilleActive', { count: veilleSourceCount })}
            </span>
          </div>
          <Link
            href="/methodology"
            className="mt-1.5 inline-flex items-center gap-1 pl-[22px] text-xs font-medium text-brand-700 hover:text-brand-900"
          >
            {t('veilleMethod')}
            <ArrowRight size={12} className="text-brand-700" aria-hidden={true} />
          </Link>
        </div>

        {/* 2. Separator */}
        <div className="border-t border-neutral-100" />

        {/* 3. Signals title — neutral, not alarming */}
        <h3 className="px-4 pt-3 pb-2 text-sm font-medium text-neutral-500">
          {t('signalsTitle')}
        </h3>

        {/* 4. Signals — date + description only, no confidence badges */}
        {signals.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-neutral-500">{tr('noActiveSignals')}</p>
        ) : (
          <div className="space-y-3 px-4">
            {signals.map((signal) => (
              <div
                key={signal.id}
                className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
              >
                <time
                  dateTime={signal.date}
                  className="shrink-0 text-xs tabular-nums text-neutral-500"
                >
                  {formatDate(signal.date, locale)}
                </time>
                <p className="flex-1 text-sm leading-snug text-neutral-700">
                  {signal.description}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* 5. See all radar */}
        <div className="mt-4 border-t border-neutral-100 px-4 py-3">
          <Link
            href="/radar"
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-900"
          >
            {tr('seeAll')}
            <ArrowRight size={12} className="text-brand-700" aria-hidden={true} />
          </Link>
        </div>

        {/* 6. Shield footnote — discrete safety net */}
        <div className="border-t border-neutral-100 px-4 py-3">
          <div className="border-l-2 border-brand-700/30 pl-3">
            <p className="text-xs text-neutral-500">
              {t('shieldFootnote')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Right column: Comprendre (Explainers + GovernmentTable)
// ──────────────────────────────────────────────

function UnderstandColumn({ locale }: { locale: string }) {
  const t = useTranslations('home');

  const explainers = [
    { href: '/how-to-read' as const, label: t('explainerMap'), Icon: Map },
    { href: '/explainers/brussels-overview' as const, label: t('explainerBuilding'), Icon: Building },
    { href: '/explainers/levels-of-power' as const, label: t('explainerUsers'), Icon: Users },
    { href: '/explainers/brussels-paradox' as const, label: t('explainerScale'), Icon: Scale },
  ];

  return (
    <div className="flex flex-col">
      {/* Column title */}
      <div className="mb-4 flex items-center gap-2">
        <BookOpen size={18} className="text-neutral-500" aria-hidden={true} />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
          {t('columnUnderstand')}
        </h2>
      </div>

      {/* Explainer links card */}
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
        <p className="mb-3 text-xs font-medium text-neutral-500">{t('newHere')}</p>
        <div className="space-y-2">
          {explainers.map((exp) => (
            <Link
              key={exp.href}
              href={exp.href}
              className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
            >
              <exp.Icon size={16} className="shrink-0 text-neutral-500" aria-hidden={true} />
              {exp.label}
            </Link>
          ))}
        </div>
        <div className="mt-3 border-t border-neutral-100 pt-3">
          <Link
            href="/understand"
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-900"
          >
            {t('allExplainers')}
            <ArrowRight size={12} className="text-brand-700" aria-hidden={true} />
          </Link>
        </div>
      </div>

      {/* Government table */}
      <div className="mt-4">
        <GovernmentTable locale={locale} inline />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Dashboard CTA (full width)
// ──────────────────────────────────────────────

function DashboardCta() {
  const t = useTranslations('home');

  return (
    <section className="py-8">
      <div className="mx-auto max-w-5xl px-4">
        <div className="rounded-lg border border-brand-200 bg-brand-50/30 p-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Target size={18} className="mt-0.5 shrink-0 text-neutral-500" aria-hidden={true} />
              <div>
                <h2 className="text-base font-semibold text-neutral-900">{t('dashboardTitle')}</h2>
                <p className="mt-0.5 text-sm text-neutral-500">{t('dashboardSubtitle')}</p>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-brand-700 px-5 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-700 hover:text-neutral-50"
            >
              {t('viewDashboard')}
              <ArrowRight size={14} aria-hidden={true} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────
// Dossiers preview (4 most recent)
// ──────────────────────────────────────────────

const phaseStyles: Record<string, string> = {
  announced: 'border-neutral-400 text-neutral-600',
  planned: 'border-brand-600 text-brand-700',
  'in-progress': 'border-status-ongoing text-status-ongoing',
  stalled: 'border-status-blocked text-status-blocked',
  completed: 'border-status-resolved text-status-resolved',
  cancelled: 'border-neutral-400 text-neutral-500',
};

function DossiersPreview({
  dossierCards,
  locale,
  totalCount,
}: {
  dossierCards: DossierCardType[];
  locale: string;
  totalCount: number;
}) {
  const t = useTranslations('home');
  const td = useTranslations('dossiers');

  return (
    <section className="py-10">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-6 flex items-center gap-2">
          <FolderOpen size={18} className="text-neutral-500" aria-hidden={true} />
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">{t('dossiersHomeTitle')}</h2>
            <p className="text-sm text-neutral-500">{t('dossiersHomeSubtitle')}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {dossierCards.map((card) => (
            <Link
              key={card.slug}
              href={{ pathname: '/dossiers/[slug]', params: { slug: card.slug } }}
              className="flex flex-col rounded-lg border border-neutral-200 bg-neutral-50 p-5 transition-shadow hover:shadow-md"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-neutral-900">{card.title}</h3>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${phaseStyles[card.phase]}`}
                >
                  {td(`phase.${card.phase}`)}
                </span>
              </div>
              {card.metrics.length > 0 && (
                <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
                  {card.metrics.slice(0, 2).map((m) => (
                    <div key={m.label} className="rounded bg-neutral-50 p-2">
                      <p className="text-base font-bold text-brand-900">
                        {m.value}
                        {m.unit && <span className="ml-1 text-xs font-normal text-neutral-500">{m.unit}</span>}
                      </p>
                      <p className="text-xs text-neutral-500">{m.label}</p>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-2 text-xs text-neutral-500">
                {td('lastModified', { date: formatDate(card.lastModified, locale) })}
              </p>
            </Link>
          ))}
        </div>

        <div className="mt-4 text-center">
          <Link
            href="/dossiers"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-900"
          >
            {t('viewAllDossiers', { count: totalCount })}
            <ArrowRight size={14} className="text-brand-700" aria-hidden={true} />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────
// Domains preview (4 most recent)
// ──────────────────────────────────────────────

function DomainsPreview({
  domainCards,
  locale,
  totalCount,
}: {
  domainCards: ReturnType<typeof getDomainCards>;
  locale: string;
  totalCount: number;
}) {
  const t = useTranslations('home');

  return (
    <section className="py-10">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-6 flex items-center gap-2">
          <LayoutGrid size={18} className="text-neutral-500" aria-hidden={true} />
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">{t('domainsHomeTitle')}</h2>
            <p className="text-sm text-neutral-500">{t('domainsHomeSubtitle')}</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {domainCards.map((card) => (
            <DomainCard key={card.slug} card={card} locale={locale} />
          ))}
        </div>

        <div className="mt-4 text-center">
          <Link
            href="/domains"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-900"
          >
            {t('viewAllDomains', { count: totalCount })}
            <ArrowRight size={14} className="text-brand-700" aria-hidden={true} />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────
// Sectors preview (6 most recent, 3-col grid)
// ──────────────────────────────────────────────

function SectorsPreview({
  sectorCards,
  totalCount,
}: {
  sectorCards: SectorCardType[];
  totalCount: number;
}) {
  const t = useTranslations('home');

  return (
    <section className="py-10">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-6 flex items-center gap-2">
          <Building2 size={18} className="text-neutral-500" aria-hidden={true} />
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">{t('sectorsHomeTitle')}</h2>
            <p className="text-sm text-neutral-500">{t('sectorsHomeSubtitle')}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {sectorCards.map((card) => (
            <Link
              key={card.slug}
              href={{ pathname: '/sectors/[slug]', params: { slug: card.slug } }}
              className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 transition-shadow hover:shadow-md"
            >
              <h3 className="mb-1 text-sm font-semibold text-neutral-900">{card.title}</h3>
              <p className="text-xs text-neutral-500">
                {card.frozenMechanisms.length + card.activeMechanisms.length} {t('sectorsTitle').toLowerCase()}
              </p>
            </Link>
          ))}
        </div>

        <div className="mt-4 text-center">
          <Link
            href="/sectors"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-900"
          >
            {t('viewAllSectorsCount', { count: totalCount })}
            <ArrowRight size={14} className="text-brand-700" aria-hidden={true} />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────
// Subscribe section (full width)
// ──────────────────────────────────────────────

function SubscribeSection({
  dossierOptions,
}: {
  dossierOptions: Array<{ id: string; label: string }>;
}) {
  return (
    <section id="subscribe" className="bg-neutral-50 py-16">
      <div className="mx-auto max-w-5xl px-4">
        <SubscribeForm dossierOptions={dossierOptions} />
      </div>
    </section>
  );
}

// ---------- 22 mars — 10e anniversaire attentats ----------

const commemorationTexts: Record<string, { title: string; body: string }> = {
  fr: {
    title: '22 mars 2016 – 22 mars 2026',
    body: 'Il y a dix ans, 32 personnes perdaient la vie et plus de 340 étaient blessées dans les attentats de Zaventem et Maelbeek. Ce site documente la gouvernance bruxelloise au quotidien\u00A0— aujourd\u2019hui, il s\u2019arrête un instant pour se souvenir.',
  },
  nl: {
    title: '22 maart 2016 – 22 maart 2026',
    body: 'Tien jaar geleden verloren 32 mensen het leven en raakten meer dan 340 gewond bij de aanslagen in Zaventem en Maalbeek. Deze site documenteert het Brusselse bestuur\u00A0— vandaag staat hij even stil om te herdenken.',
  },
  en: {
    title: '22 March 2016 – 22 March 2026',
    body: 'Ten years ago, 32 people lost their lives and more than 340 were injured in the attacks at Zaventem and Maelbeek. This site documents Brussels governance every day\u00A0— today, it pauses to remember.',
  },
  de: {
    title: '22. März 2016 – 22. März 2026',
    body: 'Vor zehn Jahren verloren 32 Menschen ihr Leben und mehr als 340 wurden bei den Anschlägen in Zaventem und Maalbeek verletzt. Diese Website dokumentiert die Brüsseler Regierungsführung\u00A0— heute hält sie inne, um zu gedenken.',
  },
};

function CommemorationBanner({ locale }: { locale: string }) {
  // Always render on March 22 — for SSG, this is build-time.
  // Since the site rebuilds daily via Vercel deploy, this is accurate.
  const now = new Date();
  const isCommemorationDay =
    now.getMonth() === 2 && now.getDate() === 22; // March = month 2 (0-indexed)

  if (!isCommemorationDay) return null;

  const text = commemorationTexts[locale] || commemorationTexts.fr;

  return (
    <div className="mx-auto mt-6 max-w-5xl border-l-4 border-slate-700 bg-slate-50 px-6 py-5">
      <p className="text-sm font-semibold text-slate-800">{text.title}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-700">{text.body}</p>
    </div>
  );
}

// ──��───────────────────────────────────────────
// Quiz promo (between Book and Support)
// ─────────���────────────���───────────────────────

function QuizPromo() {
  const t = useTranslations('home');

  return (
    <section className="py-8">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex flex-col items-center gap-4 rounded-lg border border-neutral-200 bg-neutral-50 px-6 py-8 text-center sm:flex-row sm:text-left">
          <div className="flex-1">
            <h2 className="text-base font-semibold text-neutral-900">
              {t('quizTitle')}
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              {t('quizSubtitle')}
            </p>
          </div>
          <Link
            href="/quiz"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-brand-700 px-5 py-2.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-700 hover:text-neutral-50"
          >
            {t('quizCta')}
            <ArrowRight size={14} aria-hidden={true} />
          </Link>
        </div>
      </div>
    </section>
  );
}
