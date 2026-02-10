'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { UnsubscribeSurvey } from '@/components/unsubscribe-survey';

const TOPIC_OPTIONS = [
  'budget',
  'mobility',
  'employment',
  'housing',
  'climate',
  'social',
  'solutions',
] as const;

const LOCALE_OPTIONS = [
  { value: 'fr', label: 'Français' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
] as const;

type FormState =
  | 'loading'
  | 'idle'
  | 'saving'
  | 'saved'
  | 'error'
  | 'invalid'
  | 'unsubscribing';

interface PreferencesFormProps {
  token: string | undefined;
}

export function PreferencesForm({ token }: PreferencesFormProps) {
  const t = useTranslations('subscribePreferences');
  const topicT = useTranslations('subscribe');

  const [state, setState] = useState<FormState>('loading');
  const [email, setEmail] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [locale, setLocale] = useState('fr');
  const [showSurvey, setShowSurvey] = useState(false);

  useEffect(() => {
    if (!token) {
      setState('invalid');
      return;
    }

    fetch(`/api/preferences?token=${encodeURIComponent(token)}`)
      .then((res) => {
        if (!res.ok) {
          setState(res.status === 401 || res.status === 404 ? 'invalid' : 'error');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setEmail(data.email);
          setTopics(data.topics);
          setLocale(data.locale);
          setState('idle');
        }
      })
      .catch(() => {
        setState('error');
      });
  }, [token]);

  function toggleTopic(topic: string) {
    setTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic],
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!token || topics.length === 0) return;

    setState('saving');

    try {
      const res = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, topics, locale }),
      });

      if (res.ok) {
        setState('saved');
      } else {
        setState('error');
      }
    } catch {
      setState('error');
    }
  }

  async function handleUnsubscribe(rating: number | null, feedback: string) {
    if (!token) return;

    setState('unsubscribing');

    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, rating, feedback, locale }),
      });

      if (res.ok) {
        setState('idle');
        // Show unsubscribed state via showSurvey trick
        setShowSurvey(false);
        setEmail('');
        // We'll handle the "unsubscribed" display via a separate flag
        setUnsubscribed(true);
      } else {
        setState('error');
      }
    } catch {
      setState('error');
    }
  }

  const [unsubscribed, setUnsubscribed] = useState(false);

  if (state === 'loading') {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-brand-900" />
        <p className="text-sm text-neutral-500">{t('title')}</p>
      </div>
    );
  }

  if (state === 'invalid') {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
          <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <p className="text-sm text-neutral-600">{t('errorInvalidToken')}</p>
        <a href="/" className="mt-4 inline-flex items-center text-sm text-neutral-500 hover:text-neutral-700">
          {t('backHome')}
        </a>
      </div>
    );
  }

  if (unsubscribed) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
          <svg className="h-6 w-6 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-medium text-neutral-900">{t('unsubscribed')}</p>
        <a href="/" className="mt-4 inline-flex items-center text-sm text-neutral-500 hover:text-neutral-700">
          {t('backHome')}
        </a>
      </div>
    );
  }

  if (showSurvey) {
    return (
      <UnsubscribeSurvey
        onConfirm={handleUnsubscribe}
        onCancel={() => setShowSurvey(false)}
        isSubmitting={state === 'unsubscribing'}
      />
    );
  }

  return (
    <form onSubmit={handleSave} className="rounded-lg border border-neutral-200 bg-white p-6">
      <h1 className="mb-1 text-lg font-semibold text-neutral-900">{t('title')}</h1>
      <p className="mb-6 text-sm text-neutral-500">{t('subtitle')}</p>

      {state === 'saved' && (
        <div className="mb-4 rounded-md border border-brand-600/20 bg-brand-900/5 p-3">
          <p className="text-sm font-medium text-brand-900">{t('saved')}</p>
          <p className="mt-0.5 text-xs text-neutral-500">{t('savedMessage')}</p>
        </div>
      )}

      {state === 'error' && (
        <div className="mb-4 rounded-md border border-status-delayed/20 bg-status-delayed/5 p-3">
          <p className="text-sm text-status-delayed">{t('errorGeneric')}</p>
        </div>
      )}

      <div className="mb-4">
        <p className="mb-1 text-xs text-neutral-400">{email}</p>
      </div>

      <div className="mb-4">
        <label htmlFor="pref-locale" className="mb-1 block text-xs font-medium text-neutral-600">
          {t('languageLabel')}
        </label>
        <select
          id="pref-locale"
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-brand-600 focus:ring-1 focus:ring-brand-600 focus:outline-none"
        >
          {LOCALE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="mb-6">
        <legend className="mb-2 text-xs font-medium text-neutral-600">
          {t('topicsLabel')}
        </legend>
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
                name={`topic-${topic}`}
                checked={topics.includes(topic)}
                onChange={() => toggleTopic(topic)}
                className="sr-only"
              />
              {topicT(`topics.${topic}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={state === 'saving' || topics.length === 0}
        className="w-full rounded-md bg-brand-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state === 'saving' ? t('saving') : t('save')}
      </button>

      <div className="mt-6 border-t border-neutral-100 pt-4 text-center">
        <button
          type="button"
          onClick={() => setShowSurvey(true)}
          className="text-xs text-neutral-400 underline hover:text-neutral-600"
        >
          {t('unsubscribeLink')}
        </button>
      </div>
    </form>
  );
}
