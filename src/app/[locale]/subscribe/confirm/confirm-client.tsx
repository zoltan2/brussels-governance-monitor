'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

type ConfirmState = 'idle' | 'loading' | 'success' | 'already' | 'expired' | 'error';

export function ConfirmClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const t = useTranslations('subscribeConfirm');

  const [state, setState] = useState<ConfirmState>('idle');
  const [topics, setTopics] = useState<string[]>([]);

  async function handleConfirm() {
    if (!token) return;
    setState('loading');

    try {
      const res = await fetch('/api/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (res.ok) {
        const data = await res.json();
        setTopics(data.topics || []);
        setState(data.alreadyConfirmed ? 'already' : 'success');
      } else if (res.status === 410) {
        setState('expired');
      } else {
        setState('error');
      }
    } catch {
      setState('error');
    }
  }

  if (!token) {
    return (
      <section className="py-12">
        <div className="mx-auto max-w-lg px-4">
          <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
            <h1 className="text-xl font-bold text-neutral-900">{t('errorTitle')}</h1>
            <p className="mt-2 text-sm text-neutral-600">{t('errorMessage')}</p>
            <BackHome label={t('backHome')} />
          </div>
        </div>
      </section>
    );
  }

  if (state === 'success' || state === 'already') {
    return (
      <section className="py-12">
        <div className="mx-auto max-w-lg px-4">
          <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
              <svg className="h-6 w-6 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-neutral-900">
              {state === 'already' ? t('alreadyTitle') : t('successTitle')}
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              {state === 'already' ? t('alreadyMessage') : t('successMessage')}
            </p>
            {topics.length > 0 && (
              <div className="mt-4 rounded-md bg-slate-50 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  {t('successTopics')}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {topics.map((topic) => (
                    <span
                      key={topic}
                      className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800"
                    >
                      {t(`topicLabels.${topic}`)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <BackHome label={t('backHome')} />
          </div>
        </div>
      </section>
    );
  }

  if (state === 'expired') {
    return (
      <section className="py-12">
        <div className="mx-auto max-w-lg px-4">
          <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
              <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-neutral-900">{t('expiredTitle')}</h1>
            <p className="mt-2 text-sm text-neutral-600">{t('expiredMessage')}</p>
            <BackHome label={t('backHome')} />
          </div>
        </div>
      </section>
    );
  }

  if (state === 'error') {
    return (
      <section className="py-12">
        <div className="mx-auto max-w-lg px-4">
          <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <svg className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-neutral-900">{t('errorTitle')}</h1>
            <p className="mt-2 text-sm text-neutral-600">{t('errorMessage')}</p>
            <BackHome label={t('backHome')} />
          </div>
        </div>
      </section>
    );
  }

  // idle or loading — show the confirm button
  return (
    <section className="py-12">
      <div className="mx-auto max-w-lg px-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
            <svg className="h-6 w-6 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-neutral-900">{t('title')}</h1>
          <p className="mt-2 text-sm text-neutral-600">{t('message')}</p>
          <button
            onClick={handleConfirm}
            disabled={state === 'loading'}
            className="mt-6 w-full rounded-md bg-brand-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {state === 'loading' ? t('confirming') : t('confirmButton')}
          </button>
        </div>
      </div>
    </section>
  );
}

function BackHome({ label }: { label: string }) {
  return (
    <Link
      href="/"
      className="mt-6 inline-flex items-center text-sm text-neutral-500 hover:text-neutral-700"
    >
      <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      {label}
    </Link>
  );
}
