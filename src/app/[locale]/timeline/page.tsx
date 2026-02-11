import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { getFormationRounds, getFormationEvents, getCurrentPhase } from '@/lib/content';
import { routing, type Locale } from '@/i18n/routing';
import { formatDate } from '@/lib/utils';
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
    fr: 'Chronologie de la formation',
    nl: 'Chronologie van de formatie',
    en: 'Formation timeline',
    de: 'Chronologie der Regierungsbildung',
  };
  const descriptions: Record<string, string> = {
    fr: 'Tous les événements officiels de la formation du gouvernement bruxellois, dans l\'ordre chronologique.',
    nl: 'Alle officiële gebeurtenissen van de Brusselse regeringsvorming, in chronologische volgorde.',
    en: 'All official events of the Brussels government formation, in chronological order.',
    de: 'Alle offiziellen Ereignisse der Brüsseler Regierungsbildung in chronologischer Reihenfolge.',
  };
  return buildMetadata({ locale, title: titles[locale] || titles.en, description: descriptions[locale] || descriptions.en, path: '/timeline' });
}

export default async function TimelinePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const rounds = getFormationRounds(locale as Locale);
  const events = getFormationEvents(locale as Locale);
  const currentPhase = getCurrentPhase();

  return <TimelineView rounds={rounds} events={events} currentPhase={currentPhase} locale={locale} />;
}

const PHASES = ['exploration', 'negotiation', 'agreement', 'government'] as const;

const PHASE_COLORS: Record<string, string> = {
  exploration: 'bg-amber-500',
  negotiation: 'bg-blue-600',
  agreement: 'bg-indigo-600',
  government: 'bg-slate-800',
};

const RESULT_COLORS: Record<string, string> = {
  ongoing: 'bg-blue-100 text-blue-800',
  recommendation: 'bg-indigo-100 text-indigo-800',
  stalled: 'bg-amber-100 text-amber-800',
  failed: 'bg-neutral-100 text-neutral-600',
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  designation: 'bg-slate-700',
  consultation: 'bg-blue-600',
  proposal: 'bg-indigo-500',
  blockage: 'bg-amber-500',
  resignation: 'bg-neutral-500',
  citizen: 'bg-blue-500',
  budget: 'bg-amber-600',
  initiative: 'bg-blue-800',
};

function TimelineView({
  rounds,
  events,
  currentPhase,
  locale,
}: {
  rounds: ReturnType<typeof getFormationRounds>;
  events: ReturnType<typeof getFormationEvents>;
  currentPhase: string;
  locale: string;
}) {
  const t = useTranslations('timeline');
  const tb = useTranslations('breadcrumb');

  return (
    <section className="py-12">
      <div className="mx-auto max-w-4xl px-4">
        <Breadcrumb items={[
          { label: tb('home'), href: '/' },
          { label: tb('understand'), href: '/understand' },
          { label: t('title') },
        ]} />

        <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="mt-1 mb-8 text-sm text-neutral-500">{t('subtitle')}</p>

        {/* Phase tracker */}
        <div className="mb-12 rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            {t('phaseTracker')}
          </h2>
          <div className="flex items-center gap-1">
            {PHASES.map((phase, i) => {
              const isActive = phase === currentPhase;
              const isPast = PHASES.indexOf(currentPhase as typeof phase) > i;
              return (
                <div key={phase} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex w-full items-center">
                    <div
                      className={`h-2 w-full rounded-full ${
                        isActive
                          ? PHASE_COLORS[phase]
                          : isPast
                            ? 'bg-neutral-400'
                            : 'bg-neutral-200'
                      }`}
                    />
                  </div>
                  <span
                    className={`text-xs ${
                      isActive ? 'font-bold text-neutral-900' : 'text-neutral-400'
                    }`}
                  >
                    {t(`phases.${phase}`)}
                    {isActive && (
                      <span className="ml-1 inline-block h-2 w-2 rounded-full bg-amber-500" />
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-neutral-400">
            {t('currentPhase')}: {t(`phases.${currentPhase}`)}
          </p>
        </div>

        {/* Rounds */}
        {rounds.length === 0 ? (
          <p className="text-sm text-neutral-500">Aucune donnée disponible.</p>
        ) : (
          <div className="space-y-8">
            {[...rounds].reverse().map((round) => {
              const roundEvents = events
                .filter((e) => e.round === round.number)
                .sort((a, b) => b.date.localeCompare(a.date) || (b.order ?? 0) - (a.order ?? 0));

              return (
                <div
                  key={round.number}
                  id={`round-${round.number}`}
                  className="rounded-lg border border-neutral-200 bg-white"
                >
                  {/* Round header */}
                  <div className="border-b border-neutral-100 p-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-neutral-900">
                          {round.label}
                        </h3>
                        <p className="mt-1 text-sm text-neutral-500">
                          <span className="font-medium">{t('actor')}:</span> {round.actor}
                        </p>
                      </div>
                      <span
                        className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-medium ${
                          RESULT_COLORS[round.result] || 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        {t(`results.${round.result}`)}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <span className="font-medium text-neutral-600">{t('period')}:</span>{' '}
                        <span className="text-neutral-500">
                          {formatDate(round.startDate, locale)}
                          {' — '}
                          {round.endDate ? formatDate(round.endDate, locale) : t('ongoing')}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-neutral-600">{t('formula')}:</span>{' '}
                        <span className="text-neutral-500">{round.formulaAttempted}</span>
                      </div>
                    </div>

                    {round.failureReason && (
                      <div className="mt-3 rounded-md bg-neutral-50 px-3 py-2 text-sm">
                        <span className="font-medium text-neutral-600">{t('failureReason')}:</span>{' '}
                        <span className="text-neutral-500">{round.failureReason}</span>
                      </div>
                    )}
                  </div>

                  {/* Events */}
                  {roundEvents.length > 0 && (
                    <div className="p-6">
                      <h4 className="mb-4 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                        {t('events')}
                      </h4>
                      <div className="relative space-y-0">
                        {/* Vertical line */}
                        <div className="absolute top-2 bottom-2 left-[7px] w-px bg-neutral-200" />

                        {roundEvents.map((event) => (
                          <div
                            key={event.slug}
                            id={`event-${event.slug}`}
                            className="relative flex gap-4 pb-4 last:pb-0"
                          >
                            {/* Dot */}
                            <div className="relative z-10 mt-1.5 flex shrink-0">
                              <div
                                className={`h-[15px] w-[15px] rounded-full border-2 border-white ${
                                  EVENT_TYPE_COLORS[event.eventType] || 'bg-neutral-400'
                                }`}
                              />
                            </div>

                            {/* Content */}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
                                <span className="text-xs font-medium text-neutral-400">
                                  {formatDate(event.date, locale)}
                                </span>
                                <span
                                  className={`inline-flex w-fit rounded px-1.5 py-0.5 text-[10px] font-medium text-white ${
                                    EVENT_TYPE_COLORS[event.eventType] || 'bg-neutral-400'
                                  }`}
                                >
                                  {t(`eventTypes.${event.eventType}`)}
                                </span>
                              </div>
                              <p className="mt-1 text-sm font-medium text-neutral-800">
                                {event.title}
                              </p>
                              <p className="mt-0.5 text-sm text-neutral-500">{event.summary}</p>
                              {event.impact && (
                                <p className="mt-1 text-xs text-neutral-400 italic">
                                  {event.impact}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
