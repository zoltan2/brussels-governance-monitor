import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { notFound } from 'next/navigation';
import { getSectorCard, getAllSectorSlugs } from '@/lib/content';
import { routing, type Locale } from '@/i18n/routing';
import { formatDate } from '@/lib/utils';
import { buildMetadata } from '@/lib/metadata';
import { FallbackBanner } from '@/components/fallback-banner';
import { DraftBanner } from '@/components/draft-banner';
import { MdxContent } from '@/components/mdx-content';
import { ShareButton } from '@/components/share-button';
import { CiteButton } from '@/components/cite-button';
import { FeedbackButton } from '@/components/feedback-button';
import { FreshnessBadge } from '@/components/freshness-badge';
import { CardSubscribe } from '@/components/card-subscribe';
import { HeritageCallout } from '@/components/heritage-callout';
import { Breadcrumb } from '@/components/breadcrumb';

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
  const description = card.humanImpact || card.title;
  return buildMetadata({
    locale,
    title: card.title,
    description,
    path: `/sectors/${slug}`,
    ogParams: `title=${encodeURIComponent(card.title)}&type=sector`,
  });
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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  return <SectorDetail card={card} locale={locale} isFallback={isFallback} siteUrl={siteUrl} />;
}

function SectorDetail({
  card,
  locale,
  isFallback,
  siteUrl,
}: {
  card: ReturnType<typeof getSectorCard> extends { card: infer C } | null ? C : never;
  locale: string;
  isFallback: boolean;
  siteUrl: string;
}) {
  const t = useTranslations('sectors');
  const tb = useTranslations('breadcrumb');
  const tShare = useTranslations('share');
  const tFeedback = useTranslations('feedback');
  const tSub = useTranslations('cardSubscribe');

  return (
    <article className="py-12">
      <div className="mx-auto max-w-5xl px-4">
        <Breadcrumb items={[
          { label: tb('home'), href: '/' },
          { label: tb('sectors'), href: '/sectors' },
          { label: card.title },
        ]} />

        {card.draft && <DraftBanner />}
        {isFallback && <FallbackBanner targetLocale={locale} />}

        <h1 className="mt-4 mb-6 text-3xl font-bold text-neutral-900">{card.title}</h1>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <FreshnessBadge lastModified={card.lastModified} locale={locale} />
          <ShareButton
            url={`${siteUrl}/${locale}/sectors/${card.slug}`}
            title={card.title}
            description={card.humanImpact || card.title}
            labels={{ share: tShare('share'), copyLink: tShare('copyLink'), copied: tShare('copied'), shareVia: tShare('shareVia'), email: tShare('email') }}
          />
          <CiteButton
            url={`${siteUrl}/${locale}/sectors/${card.slug}`}
            title={card.title}
            date={card.lastModified}
            locale={locale}
            labels={{ cite: tShare('cite'), standard: tShare('standard'), academic: tShare('academic'), copy: tShare('copy'), copied: tShare('citationCopied'), exportBibtex: tShare('exportBibtex'), close: tShare('close') }}
          />
        </div>

        {card.humanImpact && (
          <p className="mb-6 text-base leading-relaxed text-neutral-600">{card.humanImpact}</p>
        )}

        {card.frozenMechanisms.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              {t('frozenMechanisms')}
            </h2>
            <p className="mb-3 rounded border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
              {t('frozenMechanismsNote')}
            </p>
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
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
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
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              {t('impactIndicators')}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {card.impactIndicators.map((ind) => (
                <div key={ind.label} className="rounded-lg bg-neutral-50 p-4">
                  <p className="text-2xl font-bold text-brand-900">{ind.value}</p>
                  <p className="mt-1 text-xs text-neutral-500">{ind.label}</p>
                  <p className="text-xs text-neutral-500">{ind.source}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8">
          <MdxContent code={card.content} />
        </div>

        <HeritageCallout slug={card.slug} locale={locale} type="sector" />

        {card.stakeholders.length > 0 && (
          <div className="mt-10 border-t border-neutral-200 pt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
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

        <p className="mt-6 text-xs text-neutral-500">
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
              successExisting: tSub('successExisting'),
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
