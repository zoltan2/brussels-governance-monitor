import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { notFound } from 'next/navigation';
import { getSolutionCard, getAllSolutionSlugs } from '@/lib/content';
import { routing, type Locale } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { FallbackBanner } from '@/components/fallback-banner';
import { MdxContent } from '@/components/mdx-content';
import { Link } from '@/i18n/navigation';

export function generateStaticParams() {
  const slugs = getAllSolutionSlugs();
  return routing.locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

const feasibilityStyles: Record<string, string> = {
  high: 'bg-feasibility-high text-white',
  medium: 'bg-feasibility-medium text-white',
  low: 'bg-feasibility-low text-white',
  'very-low': 'bg-feasibility-very-low text-white',
  'near-zero': 'bg-feasibility-near-zero text-white',
};

export default async function SolutionDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const result = getSolutionCard(slug, locale as Locale);
  if (!result) notFound();

  const { card, isFallback } = result;

  return <SolutionDetail card={card} locale={locale} isFallback={isFallback} />;
}

function SolutionDetail({
  card,
  locale,
  isFallback,
}: {
  card: ReturnType<typeof getSolutionCard> extends { card: infer C } | null ? C : never;
  locale: string;
  isFallback: boolean;
}) {
  const t = useTranslations('solutions');

  return (
    <article className="py-12">
      <div className="mx-auto max-w-3xl px-4">
        <Link
          href="/"
          className="mb-6 inline-flex items-center text-sm text-neutral-500 hover:text-neutral-700"
        >
          <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          {t('backToHome')}
        </Link>

        {isFallback && <FallbackBanner targetLocale={locale} />}

        <div className="mt-4 mb-6 flex items-start justify-between gap-3">
          <h1 className="text-3xl font-bold text-neutral-900">{card.title}</h1>
          <span
            className={cn(
              'shrink-0 rounded-full px-3 py-1 text-sm font-medium',
              feasibilityStyles[card.feasibility],
            )}
          >
            {t(`feasibility.${card.feasibility}`)}
          </span>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-neutral-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              {t('mechanism')}
            </p>
            <p className="mt-1 text-sm text-neutral-700">{card.mechanism}</p>
          </div>

          <div className="rounded-lg bg-neutral-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              {t('whoCanTrigger')}
            </p>
            <p className="mt-1 text-sm text-neutral-700">{card.whoCanTrigger}</p>
          </div>

          <div className="rounded-lg bg-neutral-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Timeline
            </p>
            <p className="mt-1 text-sm text-neutral-700">{t(`timeline.${card.timeline}`)}</p>
          </div>
        </div>

        {card.precedent && (
          <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              {t('precedent')}
            </h2>
            <p className="text-sm text-neutral-700">
              {card.precedent.description} ({card.precedent.country}, {card.precedent.year})
            </p>
          </div>
        )}

        {card.legalBasis && (
          <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              {t('legalBasis')}
            </h2>
            <p className="text-sm text-neutral-700">{card.legalBasis}</p>
          </div>
        )}

        {card.risks.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              {t('risks')}
            </h2>
            <ul className="space-y-2">
              {card.risks.map((risk) => (
                <li key={risk} className="flex items-start gap-2 text-sm text-neutral-700">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-status-delayed" />
                  {risk}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="prose-sm">
          <MdxContent code={card.content} />
        </div>
      </div>
    </article>
  );
}
