'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

const TOPIC_OPTIONS = [
  'budget',
  'mobility',
  'employment',
  'housing',
  'climate',
  'social',
  'solutions',
] as const;

type SubmitState = 'idle' | 'loading' | 'success' | 'error';

export function SubscribeForm() {
  const t = useTranslations('subscribe');
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [topics, setTopics] = useState<string[]>(['budget', 'mobility', 'solutions']);
  const [state, setState] = useState<SubmitState>('idle');

  function toggleTopic(topic: string) {
    setTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || topics.length === 0) return;

    setState('loading');

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          locale: locale === 'fr' || locale === 'nl' ? locale : 'fr',
          topics,
        }),
      });

      if (res.ok) {
        setState('success');
        setEmail('');
      } else {
        setState('error');
      }
    } catch {
      setState('error');
    }
  }

  if (state === 'success') {
    return (
      <div className="rounded-lg border border-brand-600/20 bg-brand-900/5 p-6 text-center">
        <p className="text-sm font-medium text-brand-900">{t('successTitle')}</p>
        <p className="mt-1 text-xs text-neutral-500">{t('successMessage')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-neutral-200 bg-white p-6">
      <h3 className="mb-1 text-lg font-semibold text-neutral-900">{t('title')}</h3>
      <p className="mb-4 text-sm text-neutral-500">{t('subtitle')}</p>

      <div className="mb-4">
        <label htmlFor="subscribe-email" className="mb-1 block text-xs font-medium text-neutral-600">
          {t('emailLabel')}
        </label>
        <input
          id="subscribe-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('emailPlaceholder')}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-600 focus:ring-1 focus:ring-brand-600 focus:outline-none"
        />
      </div>

      <fieldset className="mb-4">
        <legend className="mb-2 text-xs font-medium text-neutral-600">{t('topicsLabel')}</legend>
        <div className="flex flex-wrap gap-2">
          {TOPIC_OPTIONS.map((topic) => (
            <label
              key={topic}
              className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                topics.includes(topic)
                  ? 'border-brand-600 bg-brand-900 text-white'
                  : 'border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400'
              }`}
            >
              <input
                type="checkbox"
                checked={topics.includes(topic)}
                onChange={() => toggleTopic(topic)}
                className="sr-only"
              />
              {t(`topics.${topic}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={state === 'loading' || topics.length === 0}
        className="w-full rounded-md bg-brand-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state === 'loading' ? t('submitting') : t('submit')}
      </button>

      {state === 'error' && (
        <p className="mt-2 text-xs text-status-delayed">{t('errorMessage')}</p>
      )}

      <p className="mt-3 text-center text-xs text-neutral-400">{t('privacy')}</p>
    </form>
  );
}
