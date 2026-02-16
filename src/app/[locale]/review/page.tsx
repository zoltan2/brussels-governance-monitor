import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { auth, signOut } from '@/auth';
import { redirect } from 'next/navigation';
import { getDraftCards } from '@/lib/content';
import { type Locale } from '@/i18n/routing';
import { ReviewCard } from '@/components/review-card';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Review — Draft Cards',
    robots: { index: false, follow: false },
  };
}

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const session = await auth();
  if (!session) {
    redirect(`/${locale}/login`);
  }

  const t = await getTranslations('review');
  const drafts = getDraftCards(locale as Locale);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const rejectReasons: Record<string, string> = {
    'out-of-scope': t('rejectReasons.outOfScope'),
    'insufficient-source': t('rejectReasons.insufficientSource'),
    duplicate: t('rejectReasons.duplicate'),
    'not-priority': t('rejectReasons.notPriority'),
    'factual-error': t('rejectReasons.factualError'),
  };

  return (
    <div className="py-12">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">{t('title')}</h1>
            <p className="mt-2 text-neutral-500">{t('description')}</p>
          </div>
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/' });
            }}
          >
            <button
              type="submit"
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-50"
            >
              {t('signOut')}
            </button>
          </form>
        </div>

        {drafts.length === 0 ? (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-8 text-center">
            <p className="text-neutral-500">{t('empty')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-neutral-500">
              {t('count', { count: drafts.length })}
            </p>
            {drafts.map((draft) => {
              const typePathMap: Record<string, string> = {
                domain: 'domains',
                solution: 'solutions',
                sector: 'sectors',
                comparison: 'comparisons',
              };
              const permalink = `${siteUrl}/${locale}/${typePathMap[draft.type]}/${draft.slug}`;

              return (
                <ReviewCard
                  key={`${draft.type}-${draft.slug}-${draft.locale}`}
                  title={draft.title}
                  slug={draft.slug}
                  type={draft.type}
                  locale={draft.locale}
                  lastModified={draft.lastModified}
                  permalink={permalink}
                  labels={{
                    publish: t('publish'),
                    reject: t('reject'),
                    published: t('published'),
                    rejected: t('rejected'),
                    preview: t('preview'),
                    rejectReasons,
                    confirmPublish: t('confirmPublish'),
                    confirmReject: t('confirmReject'),
                    cancel: t('cancel'),
                    error: t('error'),
                  }}
                />
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
