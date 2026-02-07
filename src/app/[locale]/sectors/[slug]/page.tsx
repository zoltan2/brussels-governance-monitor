import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { notFound } from 'next/navigation';
import { getSectorCard, getAllSectorSlugs } from '@/lib/content';
import { routing, type Locale } from '@/i18n/routing';
import { formatDate } from '@/lib/utils';
import { FallbackBanner } from '@/components/fallback-banner';
import { DraftBanner } from '@/components/draft-banner';
import { MdxContent } from '@/components/mdx-content';
import { ShareButton } from '@/components/share-button';
import { CiteButton } from '@/components/cite-button';
import { FeedbackButton } from '@/components/feedback-button';
import { FreshnessBadge } from '@/components/freshness-badge';
import { CardSubscribe } from '@/components/card-subscribe';
import { Link } from '@/i18n/navigation';

export function generateStaticParams() {
  const slugs = getAllSectorSlugs();
  return routing.locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const result = getSectorCard(slug, locale as Locale);
  if (!result) return {};

  const { card } = result;
  return {
    title: card.title,
    description: card.humanImpact || card.title,
  };
}

export default async function SectorDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const result = getSectorCard(slug, locale as Locale);
  if (!result) notFound();

  const { card, isFallback } = result;

  return <SectorDetail card={card} locale={locale} isFallback={isFallback} />;
}

function SectorDetail({
  card,
  locale,
  isFallback,
}: {
  card: ReturnType<typeof getSectorCard> extends { card: infer C } | null ? C : never;
  locale: string;
  isFallback: boolean;
}) {
  const t = useTranslations('sectors');
  const tCite = useTranslations('cite');
  const tFeedback = useTranslations('feedback');
  const tSub = useTranslations('cardSubscribe');

  return (
    <article className="py-12">
      <div className="mx-auto max-w-3xl px-4">
        <Link
          href="/"
          className="mb-6 inline-flex items-center text-sm text-neutral-500 hover:text-neutral-700"
        >
          <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('backToHome')}
        </Link>

        {card.draft && <DraftBanner />}
        {isFallback && <FallbackBanner targetLocale={locale} />}

        <h1 className="mt-4 mb-6 text-3xl font-bold text-neutral-900">{card.title}</h1>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <FreshnessBadge lastModified={card.lastModified} locale={locale} />
          <ShareButton
            title={card.title}
            text={card.humanImpact || card.title}
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

        {card.humanImpact && (
          <p className="mb-6 text-base leading-relaxed text-neutral-600">{card.humanImpact}</p>
        )}

        {card.frozenMechanisms.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
              {t('frozenMechanisms')}
            </h2>
            <ul className="space-y-3">
              {card.frozenMechanisms.map((m) => (
                <li key={m.name} className="rounded-lg bg-neutral-50 p-4">
                  <p className="font-medium text-neutral-900">{m.name}</p>
                  <p className="mt-1 text-sm text-neutral-600">{m.description}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {card.activeMechanisms.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
              {t('activeMechanisms')}
            </h2>
            <ul className="space-y-3">
              {card.activeMechanisms.map((m) => (
                <li key={m.name} className="rounded-lg bg-neutral-50 p-4">
                  <p className="font-medium text-neutral-900">{m.name}</p>
                  <p className="mt-1 text-sm text-neutral-600">{m.description}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {card.impactIndicators.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
              {t('impactIndicators')}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {card.impactIndicators.map((ind) => (
                <div key={ind.label} className="rounded-lg bg-neutral-50 p-4">
                  <p className="text-2xl font-bold text-brand-900">{ind.value}</p>
                  <p className="mt-1 text-xs text-neutral-500">{ind.label}</p>
                  <p className="text-xs text-neutral-400">{ind.source}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8">
          <MdxContent code={card.content} />
        </div>

        {card.stakeholders.length > 0 && (
          <div className="mt-10 border-t border-neutral-200 pt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
              {t('stakeholders')}
            </h2>
            <ul className="space-y-1">
              {card.stakeholders.map((s) => (
                <li key={s.name} className="text-sm">
                  {s.url ? (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-700 underline underline-offset-2 hover:text-brand-900"
                    >
                      {s.name}
                    </a>
                  ) : (
                    <span className="text-neutral-700">{s.name}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-6 text-xs text-neutral-400">
          {t('backToHome')} — {formatDate(card.lastModified, locale)}
        </p>

        <div className="mt-8">
          <CardSubscribe
            topic={card.slug}
            locale={locale}
            labels={{
              title: tSub('title'),
              emailPlaceholder: tSub('emailPlaceholder'),
              submit: tSub('submit'),
              submitting: tSub('submitting'),
              success: tSub('success'),
              error: tSub('error'),
              privacy: tSub('privacy'),
            }}
          />
        </div>

        <div className="mt-8">
          <FeedbackButton
            cardTitle={card.title}
            cardType="sector"
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
