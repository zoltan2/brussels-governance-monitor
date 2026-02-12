import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { notFound } from 'next/navigation';
import {
  getDossierCard,
  getAllDossierSlugs,
  getDomainCard,
  getSectorCard,
  getCommuneCard,
  getFormationEvents,
} from '@/lib/content';
import { routing, type Locale } from '@/i18n/routing';
import { formatDate, cn } from '@/lib/utils';
import { buildMetadata } from '@/lib/metadata';
import { FallbackBanner } from '@/components/fallback-banner';
import { DraftBanner } from '@/components/draft-banner';
import { MdxContent } from '@/components/mdx-content';
import { ShareButton } from '@/components/share-button';
import { CiteButton } from '@/components/cite-button';
import { FeedbackButton } from '@/components/feedback-button';
import { FreshnessBadge } from '@/components/freshness-badge';
import { CardSubscribe } from '@/components/card-subscribe';
import { Link } from '@/i18n/navigation';
import { Breadcrumb } from '@/components/breadcrumb';

export function generateStaticParams() {
  const slugs = getAllDossierSlugs();
  return routing.locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const result = getDossierCard(slug, locale as Locale);
  if (!result) return {};

  const { card } = result;
  return buildMetadata({
    locale,
    title: card.title,
    description: card.summary,
    path: `/dossiers/${slug}`,
    ogParams: `title=${encodeURIComponent(card.title)}&type=dossier`,
  });
}

const impactStyles: Record<string, string> = {
  blocked: 'bg-status-blocked text-white',
  delayed: 'bg-status-delayed text-white',
  reduced: 'bg-status-ongoing text-white',
  unaffected: 'bg-neutral-400 text-white',
};

const phaseStyles: Record<string, string> = {
  announced: 'border-neutral-400 text-neutral-600',
  planned: 'border-brand-600 text-brand-700',
  'in-progress': 'border-status-ongoing text-status-ongoing',
  stalled: 'border-status-blocked text-status-blocked',
  completed: 'border-status-resolved text-status-resolved',
  cancelled: 'border-neutral-400 text-neutral-500',
};

export default async function DossierDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const result = getDossierCard(slug, locale as Locale);
  if (!result) notFound();

  const { card, isFallback } = result;

  return <DossierDetail card={card} locale={locale as Locale} isFallback={isFallback} />;
}

function DossierDetail({
  card,
  locale,
  isFallback,
}: {
  card: ReturnType<typeof getDossierCard> extends { card: infer C } | null ? C : never;
  locale: Locale;
  isFallback: boolean;
}) {
  const t = useTranslations('dossiers');
  const tb = useTranslations('breadcrumb');
  const tCite = useTranslations('cite');
  const tFeedback = useTranslations('feedback');
  const tSub = useTranslations('cardSubscribe');

  // Blocked days counter
  const blockedDays = card.blockedSince
    ? Math.floor((Date.now() - new Date(card.blockedSince).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Resolve related cards
  const relatedDomainCards = card.relatedDomains
    .map((slug) => getDomainCard(slug, locale))
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .map((r) => r.card);

  const relatedSectorCards = card.relatedSectors
    .map((slug) => getSectorCard(slug, locale))
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .map((r) => r.card);

  const relatedCommuneCards = card.relatedCommunes
    .map((slug) => getCommuneCard(slug, locale))
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .map((r) => r.card);

  // Resolve related formation events
  const allEvents = getFormationEvents(locale);
  const relatedEvents = card.relatedFormationEvents.length > 0
    ? allEvents.filter((e) => card.relatedFormationEvents.includes(e.slug))
    : [];

  return (
    <article className="py-12">
      <div className="mx-auto max-w-3xl px-4">
        <Breadcrumb
          items={[
            { label: tb('home'), href: '/' },
            { label: tb('dossiers'), href: '/dossiers' },
            { label: card.title },
          ]}
        />

        {card.draft && <DraftBanner />}
        {isFallback && <FallbackBanner targetLocale={locale} />}

        {/* Header + badges */}
        <h1 className="mt-4 mb-3 text-3xl font-bold text-neutral-900">{card.title}</h1>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${impactStyles[card.crisisImpact]}`}
          >
            {t(`crisisImpact.${card.crisisImpact}`)}
          </span>
          <span
            className={`rounded-full border px-3 py-1 text-sm font-medium ${phaseStyles[card.phase]}`}
          >
            {t(`phase.${card.phase}`)}
          </span>
          <span className="rounded-full border border-neutral-300 px-3 py-1 text-sm text-neutral-600">
            {t(`decisionLevel.${card.decisionLevel}`)}
          </span>
          <span
            className={cn(
              'text-xs font-medium',
              card.confidenceLevel === 'official' && 'text-brand-700',
              card.confidenceLevel === 'estimated' && 'text-status-delayed',
              card.confidenceLevel === 'unconfirmed' && 'text-neutral-500',
            )}
          >
            {t(`confidence.${card.confidenceLevel}`)}
          </span>
        </div>

        {/* Blocked counter */}
        {blockedDays !== null && blockedDays > 0 && (
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4">
            <p className="text-lg font-bold text-amber-800">
              {t('blockedSince', { days: blockedDays })}
            </p>
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <FreshnessBadge lastModified={card.lastModified} locale={locale} />
          <ShareButton
            title={card.title}
            text={card.summary}
            label={t('share')}
            copiedLabel={t('copied')}
          />
          <CiteButton
            title={card.title}
            lastModified={card.lastModified}
            label={tCite('label')}
            copiedLabel={tCite('copied')}
          />
        </div>

        {/* Summary */}
        <p className="mb-6 text-base leading-relaxed text-neutral-600">{card.summary}</p>

        {/* Budget + Cost of inaction */}
        {(card.estimatedBudget || card.estimatedCostOfInaction) && (
          <div className="mb-8 grid gap-3 sm:grid-cols-2">
            {card.estimatedBudget && (
              <div className="rounded-lg bg-neutral-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  {t('estimatedBudget')}
                </p>
                <p className="mt-1 text-xl font-bold text-brand-900">{card.estimatedBudget}</p>
              </div>
            )}
            {card.estimatedCostOfInaction && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                  {t('estimatedCostOfInaction')}
                </p>
                <p className="mt-1 text-xl font-bold text-amber-800">
                  {card.estimatedCostOfInaction}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Metrics */}
        {card.metrics.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              {t('metrics')}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {card.metrics.map((metric) => (
                <div key={metric.label} className="rounded-lg bg-neutral-50 p-4">
                  <p className="text-2xl font-bold text-brand-900">
                    {metric.value}
                    {metric.unit && (
                      <span className="ml-1 text-sm font-normal text-neutral-500">
                        {metric.unit}
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">{metric.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alerts */}
        {card.alerts.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              {t('alerts')}
            </h2>
            <ul className="space-y-2">
              {card.alerts.map((alert) => (
                <li
                  key={`${alert.date}-${alert.label}`}
                  className={`rounded-lg border p-3 text-sm ${
                    alert.severity === 'critical'
                      ? 'border-amber-300 bg-amber-50'
                      : alert.severity === 'warning'
                        ? 'border-amber-200 bg-amber-50/50'
                        : 'border-neutral-200 bg-neutral-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-neutral-700">{alert.label}</span>
                    <span className="shrink-0 text-xs text-neutral-500">
                      {formatDate(alert.date, locale)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Stakeholders */}
        {card.stakeholders.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              {t('stakeholders')}
            </h2>
            <div className="flex flex-wrap gap-2">
              {card.stakeholders.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-sm text-neutral-700"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* MDX content */}
        <div
          className="mt-8"
          {...(isFallback && card.locale !== locale ? { lang: card.locale } : {})}
        >
          <MdxContent code={card.content} />
        </div>

        {/* Related domains */}
        {relatedDomainCards.length > 0 && (
          <div className="mt-10 border-t border-neutral-200 pt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              {t('relatedDomains')}
            </h2>
            <div className="flex flex-wrap gap-2">
              {relatedDomainCards.map((d) => (
                <Link
                  key={d.slug}
                  href={{ pathname: '/domains/[slug]', params: { slug: d.slug } }}
                  className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-brand-700 hover:bg-neutral-50"
                >
                  {d.title}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Related sectors */}
        {relatedSectorCards.length > 0 && (
          <div className="mt-6 border-t border-neutral-200 pt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              {t('relatedSectors')}
            </h2>
            <div className="flex flex-wrap gap-2">
              {relatedSectorCards.map((s) => (
                <Link
                  key={s.slug}
                  href={{ pathname: '/sectors/[slug]', params: { slug: s.slug } }}
                  className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-brand-700 hover:bg-neutral-50"
                >
                  {s.title}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Related communes */}
        {relatedCommuneCards.length > 0 && (
          <div className="mt-6 border-t border-neutral-200 pt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              {t('relatedCommunes')}
            </h2>
            <div className="flex flex-wrap gap-2">
              {relatedCommuneCards.map((c) => (
                <Link
                  key={c.slug}
                  href={{ pathname: '/communes/[slug]', params: { slug: c.slug } }}
                  className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-brand-700 hover:bg-neutral-50"
                >
                  {c.title}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Related formation events */}
        {relatedEvents.length > 0 && (
          <div className="mt-6 border-t border-neutral-200 pt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              {t('relatedFormationEvents')}
            </h2>
            <ul className="space-y-2">
              {relatedEvents.map((e) => (
                <li key={e.slug} className="text-sm">
                  <span className="text-neutral-500">{formatDate(e.date, locale)}</span>
                  {' — '}
                  <span className="text-neutral-700">{e.title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Sources */}
        <div className="mt-10 border-t border-neutral-200 pt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            {t('sources')}
          </h2>
          <ul className="space-y-2">
            {card.sources.map((source) => (
              <li key={source.url} className="text-sm">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-700 underline underline-offset-2 hover:text-brand-900"
                >
                  {source.label}
                </a>
                <time dateTime={source.accessedAt} className="ml-2 text-xs text-neutral-500">
                  ({t('accessedAt', { date: formatDate(source.accessedAt, locale) })})
                </time>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-xs text-neutral-500">
            <time dateTime={card.lastModified}>
              {t('lastModified', { date: formatDate(card.lastModified, locale) })}
            </time>
          </p>
        </div>

        <div className="mt-8">
          <CardSubscribe
            topic="dossiers"
            locale={locale}
            labels={{
              title: tSub('title'),
              emailPlaceholder: tSub('emailPlaceholder'),
              submit: tSub('submit'),
              submitting: tSub('submitting'),
              success: tSub('success'),
              successExisting: tSub('successExisting'),
              error: tSub('error'),
              privacy: tSub('privacy'),
            }}
          />
        </div>

        <div className="mt-8">
          <FeedbackButton
            cardTitle={card.title}
            cardType="dossier"
            cardSlug={card.slug}
            labels={{
              button: tFeedback('button'),
              title: tFeedback('title'),
              typeLabel: tFeedback('typeLabel'),
              types: {
                error: tFeedback('types.error'),
                correction: tFeedback('types.correction'),
                source: tFeedback('types.source'),
                other: tFeedback('types.other'),
              },
              messageLabel: tFeedback('messageLabel'),
              messagePlaceholder: tFeedback('messagePlaceholder'),
              emailLabel: tFeedback('emailLabel'),
              emailPlaceholder: tFeedback('emailPlaceholder'),
              submit: tFeedback('submit'),
              submitting: tFeedback('submitting'),
              success: tFeedback('success'),
              errorMessage: tFeedback('errorMessage'),
              cancel: tFeedback('cancel'),
            }}
          />
        </div>
      </div>
    </article>
  );
}
