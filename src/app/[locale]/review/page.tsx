import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { getDraftCards } from '@/lib/content';
import { routing, type Locale } from '@/i18n/routing';
import { formatDate } from '@/lib/utils';
import { Link } from '@/i18n/navigation';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Review — Draft Cards',
    robots: { index: false, follow: false },
  };
}

const typeLabels: Record<string, string> = {
  domain: 'Domaine',
  solution: 'Solution',
  sector: 'Secteur',
  comparison: 'Comparaison',
};

const typeColors: Record<string, string> = {
  domain: 'bg-brand-900 text-white',
  solution: 'bg-feasibility-medium text-white',
  sector: 'bg-status-ongoing text-white',
  comparison: 'bg-neutral-600 text-white',
};

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const drafts = getDraftCards(locale as Locale);

  return <ReviewContent drafts={drafts} locale={locale} />;
}

function ReviewContent({
  drafts,
  locale,
}: {
  drafts: ReturnType<typeof getDraftCards>;
  locale: string;
}) {
  const t = useTranslations('review');

  return (
    <div className="py-12">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">{t('title')}</h1>
          <p className="mt-2 text-neutral-500">{t('description')}</p>
        </div>

        {drafts.length === 0 ? (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-8 text-center">
            <p className="text-neutral-500">{t('empty')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-neutral-400">
              {t('count', { count: drafts.length })}
            </p>
            {drafts.map((draft) => {
              const href =
                draft.type === 'domain'
                  ? ({ pathname: '/domains/[slug]' as const, params: { slug: draft.slug } })
                  : draft.type === 'solution'
                    ? ({ pathname: '/solutions/[slug]' as const, params: { slug: draft.slug } })
                    : draft.type === 'sector'
                      ? ({ pathname: '/sectors/[slug]' as const, params: { slug: draft.slug } })
                      : ({ pathname: '/comparisons/[slug]' as const, params: { slug: draft.slug } });

              return (
                <div
                  key={`${draft.type}-${draft.slug}`}
                  className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${typeColors[draft.type]}`}
                      >
                        {typeLabels[draft.type]}
                      </span>
                      <span className="text-xs text-neutral-400">
                        {formatDate(draft.lastModified, locale)}
                      </span>
                    </div>
                    <p className="font-medium text-neutral-900">{draft.title}</p>
                    <p className="mt-0.5 text-xs text-neutral-400">
                      {draft.slug} · {draft.locale}
                    </p>
                  </div>
                  <Link
                    href={href}
                    className="ml-4 shrink-0 rounded-md bg-brand-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-800"
                  >
                    {t('view')}
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-10 rounded-lg border border-neutral-200 bg-neutral-50 p-6">
          <h2 className="mb-2 text-sm font-semibold text-neutral-700">{t('howTitle')}</h2>
          <ol className="list-inside list-decimal space-y-1 text-sm text-neutral-600">
            <li>{t('step1')}</li>
            <li>{t('step2')}</li>
            <li>{t('step3')}</li>
            <li>{t('step4')}</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
