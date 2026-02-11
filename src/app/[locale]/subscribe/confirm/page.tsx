import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { ConfirmClient } from './confirm-client';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function ConfirmPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense fallback={<ConfirmSkeleton />}>
      <ConfirmClient />
    </Suspense>
  );
}

function ConfirmSkeleton() {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-lg px-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-full bg-neutral-100" />
          <div className="mx-auto mb-2 h-6 w-48 animate-pulse rounded bg-neutral-100" />
          <div className="mx-auto h-4 w-64 animate-pulse rounded bg-neutral-100" />
        </div>
      </div>
    </section>
  );
}
