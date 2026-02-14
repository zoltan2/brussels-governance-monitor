import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { CrisisCounter } from '@/components/crisis-counter';
import { LatestEvent } from '@/components/latest-event';
import { DomainCard } from '@/components/domain-card';
import { SubscribeForm } from '@/components/subscribe-form';
import { getDomainCards, getSectorCards, getFormationEvents, getCurrentPhase } from '@/lib/content';
import { getRecentChanges } from '@/lib/changelog';
import { RecentChanges } from '@/components/recent-changes';
import { GovernmentTable } from '@/components/government-table';
import { formatDate } from '@/lib/utils';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const domainCards = getDomainCards(locale as Locale);
  const sectorCards = getSectorCards(locale as Locale);
  const events = getFormationEvents(locale as Locale);
  const latestEvent = events.length > 0 ? events[events.length - 1] : undefined;

  const recentChanges = getRecentChanges(locale as Locale, 3);

  const lastVerified = domainCards
    .map((c) => c.lastModified)
    .sort()
    .pop();

  return (
    <>
      <CrisisCounter currentPhase={getCurrentPhase()} />

      <CitizenIntro />

      {latestEvent && <LatestEvent event={latestEvent} locale={locale} />}

      <GovernmentTable locale={locale} />

      <DashboardCta />

      <DomainsSection domainCards={domainCards} locale={locale} lastVerified={lastVerified} />

      {sectorCards.length > 0 && <SectorsPreview sectorCards={sectorCards} />}

      <RecentActivitySection recentChanges={recentChanges} locale={locale} />

      <TimelineSection />

      <ExplainersSection />

      <section id="subscribe" className="py-16">
        <div className="mx-auto max-w-5xl px-4">
          <SubscribeForm />
        </div>
      </section>
    </>
  );
}

function CitizenIntro() {
  const t = useTranslations('home');

  return (
    <section className="py-6">
      <div className="mx-auto max-w-3xl px-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-xs leading-relaxed text-neutral-500 italic">
            {t('citizenIntroFalc')}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <Link
              href="/how-to-read"
              className="text-xs font-medium text-brand-700 underline underline-offset-2 hover:text-brand-900"
            >
              {t('howToReadLink')}
            </Link>
            <a
              href="#subscribe"
              className="text-xs font-medium text-brand-700 underline underline-offset-2 hover:text-brand-900"
            >
              {t('subscribeCta')}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function RecentActivitySection({
  recentChanges,
  locale,
}: {
  recentChanges: ReturnType<typeof getRecentChanges>;
  locale: string;
}) {
  if (recentChanges.length === 0) return null;

  return (
    <section className="py-8">
      <div className="mx-auto max-w-3xl px-4">
        <RecentChanges entries={recentChanges} locale={locale} />
      </div>
    </section>
  );
}

function DomainsSection({
  domainCards,
  locale,
  lastVerified,
}: {
  domainCards: ReturnType<typeof getDomainCards>;
  locale: string;
  lastVerified?: string;
}) {
  const t = useTranslations('domains');

  return (
    <section id="domains" className="py-16">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="mb-2 text-2xl font-bold text-neutral-900">{t('title')}</h2>
            <p className="text-sm text-neutral-500">{t('subtitle')}</p>
          </div>
          {lastVerified && (
            <p className="text-xs text-neutral-500">
              {t('lastModified', { date: formatDate(lastVerified, locale) })}
            </p>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {domainCards.map((card) => (
            <DomainCard key={card.slug} card={card} locale={locale} />
          ))}
        </div>
      </div>
    </section>
  );
}

function SectorsPreview({
  sectorCards,
}: {
  sectorCards: ReturnType<typeof getSectorCards>;
}) {
  const t = useTranslations('home');

  return (
    <section className="py-12">
      <div className="mx-auto max-w-5xl px-4">
        <h2 className="mb-2 text-lg font-semibold text-neutral-900">{t('sectorsTitle')}</h2>
        <p className="mb-6 text-sm text-neutral-500">{t('sectorsSubtitle')}</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {sectorCards.map((card) => (
            <Link
              key={card.slug}
              href={{ pathname: '/sectors/[slug]', params: { slug: card.slug } }}
              className="rounded-lg border border-neutral-200 bg-white p-4 transition-shadow hover:shadow-md"
            >
              <h3 className="mb-1 text-sm font-semibold text-neutral-900">{card.title}</h3>
              <p className="text-xs text-neutral-500">
                {card.frozenMechanisms.length} {t('sectorsTitle').toLowerCase()}
              </p>
            </Link>
          ))}
        </div>
        <div className="mt-4 text-center">
          <Link
            href="/sectors"
            className="text-sm font-medium text-brand-700 underline underline-offset-2 hover:text-brand-900"
          >
            {t('viewAllSectors')}
          </Link>
        </div>
      </div>
    </section>
  );
}

function TimelineSection() {
  const t = useTranslations('home');

  return (
    <section className="bg-neutral-50 py-12">
      <div className="mx-auto max-w-5xl px-4 text-center">
        <h2 className="mb-2 text-lg font-semibold text-neutral-900">{t('timelineTitle')}</h2>
        <p className="mb-4 text-sm text-neutral-500">{t('timelineSubtitle')}</p>
        <Link
          href="/timeline"
          className="inline-flex items-center rounded-lg border border-brand-700 px-5 py-2.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-700 hover:text-white"
        >
          {t('viewTimeline2')}
          <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </section>
  );
}

function DashboardCta() {
  const t = useTranslations('home');

  return (
    <section className="py-8">
      <div className="mx-auto max-w-3xl px-4">
        <div className="rounded-lg border border-brand-200 bg-brand-50/30 p-5 text-center">
          <h2 className="mb-1 text-base font-semibold text-neutral-900">{t('dashboardTitle')}</h2>
          <p className="mb-4 text-sm text-neutral-500">{t('dashboardSubtitle')}</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-lg border border-brand-700 px-5 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-700 hover:text-white"
          >
            {t('viewDashboard')}
            <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}

function ExplainersSection() {
  const t = useTranslations('home');

  const explainers = [
    { href: '/explainers/brussels-overview' as const, label: t('explainerOverview') },
    { href: '/explainers/levels-of-power' as const, label: t('explainerLevels') },
    { href: '/explainers/government-formation' as const, label: t('explainerFormation') },
    { href: '/explainers/brussels-paradox' as const, label: t('explainerParadox') },
    { href: '/explainers/parliament-powers' as const, label: t('explainerParliament') },
    { href: '/explainers/brussels-cosmopolitan' as const, label: t('explainerCosmopolitan') },
  ];

  return (
    <section className="py-12">
      <div className="mx-auto max-w-5xl px-4">
        <h2 className="mb-2 text-lg font-semibold text-neutral-900">{t('explainersTitle')}</h2>
        <p className="mb-6 text-sm text-neutral-500">{t('explainersSubtitle')}</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {explainers.map((exp) => (
            <Link
              key={exp.href}
              href={exp.href}
              className="rounded-lg border border-neutral-200 p-4 text-sm text-neutral-700 transition-colors hover:border-brand-600 hover:text-brand-800"
            >
              {exp.label}
            </Link>
          ))}
        </div>
        <div className="mt-4 text-right">
          <Link
            href="/understand"
            className="text-sm font-medium text-brand-700 underline underline-offset-2 hover:text-brand-900"
          >
            {t('viewAllExplainers')}
          </Link>
        </div>
      </div>
    </section>
  );
}
