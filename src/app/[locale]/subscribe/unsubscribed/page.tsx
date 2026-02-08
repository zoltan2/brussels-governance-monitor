import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { routing } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function UnsubscribedPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { status } = await searchParams;

  return <UnsubscribedView status={status} />;
}

function UnsubscribedView({ status }: { status: string | undefined }) {
  const t = useTranslations('subscribeUnsubscribed');

  return (
    <section className="py-12">
      <div className="mx-auto max-w-lg px-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
          {status === 'success' && (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                <svg
                  className="h-6 w-6 text-blue-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-neutral-900">
                {t('successTitle')}
              </h1>
              <p className="mt-2 text-sm text-neutral-600">
                {t('successMessage')}
              </p>
            </>
          )}

          {(!status || status === 'error') && (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <svg
                  className="h-6 w-6 text-slate-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-neutral-900">
                {t('errorTitle')}
              </h1>
              <p className="mt-2 text-sm text-neutral-600">
                {t('errorMessage')}
              </p>
            </>
          )}

          <Link
            href="/"
            className="mt-6 inline-flex items-center text-sm text-neutral-500 hover:text-neutral-700"
          >
            <svg
              className="mr-1 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            {t('backHome')}
          </Link>
        </div>
      </div>
    </section>
  );
}
