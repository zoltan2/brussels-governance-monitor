import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { routing, type Locale } from '@/i18n/routing';
import { getActiveSignals, getConfirmedSignals, getArchivedSignals } from '@/lib/radar';
import { Breadcrumb } from '@/components/breadcrumb';
import { Link } from '@/i18n/navigation';
import { formatDate } from '@/lib/utils';
import { buildMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';
import type { LocalizedRadarEntry } from '@/lib/radar';

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
    fr: 'Radar',
    nl: 'Radar',
    en: 'Radar',
    de: 'Radar',
  };
  const descriptions: Record<string, string> = {
    fr: 'Signaux en cours de vérification par le Brussels Governance Monitor.',
    nl: 'Signalen in verificatie door de Brussels Governance Monitor.',
    en: 'Signals under verification by the Brussels Governance Monitor.',
    de: 'Signale in Überprüfung durch den Brussels Governance Monitor.',
  };
  return buildMetadata({
    locale,
    title: titles[locale] || titles.fr,
    description: descriptions[locale] || descriptions.fr,
    path: '/radar',
  });
}

export default async function RadarPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const active = getActiveSignals(locale as Locale);
  const confirmed = getConfirmedSignals(locale as Locale);
  const archived = getArchivedSignals(locale as Locale);

  return (
    <section className="py-12">
      <div className="mx-auto max-w-5xl px-4">
        <RadarContent
          active={active}
          confirmed={confirmed}
          archived={archived}
          locale={locale}
        />
      </div>
    </section>
  );
}

// ---------- Confidence badge ----------

const CONFIDENCE_STYLES: Record<string, string> = {
  official: 'bg-blue-50 text-blue-700 border-blue-200',
  estimated: 'bg-amber-50 text-amber-700 border-amber-200',
  unconfirmed: 'bg-neutral-100 text-neutral-500 border-neutral-200',
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-blue-50 text-blue-700 border-blue-200',
  confirmed: 'bg-teal-50 text-teal-700 border-teal-200',
  archived: 'bg-neutral-50 text-neutral-400 border-neutral-200',
};

function RadarContent({
  active,
  confirmed,
  archived,
  locale,
}: {
  active: LocalizedRadarEntry[];
  confirmed: LocalizedRadarEntry[];
  archived: LocalizedRadarEntry[];
  locale: string;
}) {
  const t = useTranslations('radar');
  const tb = useTranslations('breadcrumb');

  return (
    <>
      <Breadcrumb items={[
        { label: tb('home'), href: '/' },
        { label: tb('radar') },
      ]} />

      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="text-sm text-neutral-500">{t('subtitle')}</p>
      </div>

      {/* Shield callout */}
      <div className="mb-8 rounded-md border-l-4 border-blue-300 bg-blue-50/50 px-4 py-3">
        <p className="text-sm leading-relaxed text-neutral-600">
          {t('shieldText')}
        </p>
      </div>

      {/* Active signals */}
      {active.length > 0 && (
        <div className="mb-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            {t('homepageTitle')}
          </h2>
          <div className="space-y-4">
            {active.map((signal) => (
              <SignalCard key={signal.id} signal={signal} locale={locale} />
            ))}
          </div>
        </div>
      )}

      {active.length === 0 && (
        <p className="mb-10 text-sm text-neutral-500">{t('noActiveSignals')}</p>
      )}

      {/* Confirmed signals */}
      {confirmed.length > 0 && (
        <div className="mb-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            {t('confirmedSection')}
          </h2>
          <div className="space-y-4">
            {confirmed.map((signal) => (
              <SignalCard key={signal.id} signal={signal} locale={locale} />
            ))}
          </div>
        </div>
      )}

      {/* Archive */}
      {archived.length > 0 && (
        <details className="group">
          <summary className="mb-4 flex cursor-pointer list-none items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-400 [&::-webkit-details-marker]:hidden">
            <svg
              className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {t('archiveSection')} ({archived.length})
          </summary>
          <div className="space-y-4">
            {archived.map((signal) => (
              <SignalCard key={signal.id} signal={signal} locale={locale} />
            ))}
          </div>
        </details>
      )}
    </>
  );
}

// ---------- Signal card ----------

function SignalCard({
  signal,
  locale,
}: {
  signal: LocalizedRadarEntry;
  locale: string;
}) {
  const t = useTranslations('radar');
  const isArchived = signal.status === 'archived';

  return (
    <div
      className={`rounded-lg border p-4 ${
        isArchived
          ? 'border-neutral-100 bg-neutral-50'
          : 'border-neutral-200 bg-white'
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <time
          dateTime={signal.date}
          className="text-xs tabular-nums text-neutral-400"
        >
          {formatDate(signal.date, locale)}
        </time>
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${CONFIDENCE_STYLES[signal.confidence] ?? CONFIDENCE_STYLES.unconfirmed}`}
        >
          {t(`confidence.${signal.confidence}`)}
        </span>
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[signal.status] ?? STATUS_STYLES.active}`}
        >
          {t(`status.${signal.status}`)}
        </span>
      </div>

      <p className={`text-sm leading-relaxed ${isArchived ? 'text-neutral-400' : 'text-neutral-700'}`}>
        {signal.description}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
        <span className="text-neutral-400">
          {t('source')} :{' '}
          <a
            href={signal.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-700 underline underline-offset-2 hover:text-brand-900"
          >
            {signal.source.label}
          </a>
        </span>

        {signal.nextStep && (
          <span className="text-neutral-400">
            {t('nextStep')} : <span className="text-neutral-600">{signal.nextStep}</span>
          </span>
        )}

        {signal.promotedTo && (
          <Link
            href={{ pathname: '/domains/[slug]', params: { slug: signal.promotedTo } }}
            className="font-medium text-teal-700 underline underline-offset-2 hover:text-teal-900"
          >
            {t('seeCard')}
          </Link>
        )}
      </div>
    </div>
  );
}
