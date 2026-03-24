// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

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
  'security',
  'economy',
  'cleanliness',
  'institutional',
  'urban-planning',
  'digital',
  'education',
  'engagements',
] as const;

const SECTOR_OPTIONS = [
  'commerce',
  'construction',
  'culture',
  'environment',
  'health-social',
  'horeca',
  'housing-sector',
  'nonprofit',
  'transport',
] as const;

const COMMUNE_OPTIONS = [
  'commune-anderlecht',
  'commune-auderghem',
  'commune-berchem-sainte-agathe',
  'commune-bruxelles-ville',
  'commune-etterbeek',
  'commune-evere',
  'commune-forest',
  'commune-ganshoren',
  'commune-ixelles',
  'commune-jette',
  'commune-koekelberg',
  'commune-molenbeek-saint-jean',
  'commune-saint-gilles',
  'commune-saint-josse-ten-noode',
  'commune-schaerbeek',
  'commune-uccle',
  'commune-watermael-boitsfort',
  'commune-woluwe-saint-lambert',
  'commune-woluwe-saint-pierre',
] as const;

type SubmitState = 'idle' | 'loading' | 'success' | 'successExisting' | 'error';

interface SubscribeFormProps {
  dossierOptions: Array<{ id: string; label: string }>;
}

export function SubscribeForm({ dossierOptions }: SubscribeFormProps) {
  const t = useTranslations('subscribe');
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [topics, setTopics] = useState<string[]>(['budget', 'mobility', 'engagements']);
  const [sectors, setSectors] = useState<string[]>([]);
  const [dossiers, setDossiers] = useState<string[]>([]);
  const [communes, setCommunes] = useState<string[]>([]);
  const [state, setState] = useState<SubmitState>('idle');

  function toggleItem(setter: typeof setTopics) {
    return (item: string) => {
      setter((prev) =>
        prev.includes(item) ? prev.filter((t) => t !== item) : [...prev, item],
      );
    };
  }

  const toggleTopic = toggleItem(setTopics);
  const toggleSector = toggleItem(setSectors);
  const toggleDossier = toggleItem(setDossiers);
  const toggleCommune = toggleItem(setCommunes);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const allTopics = [...topics, ...sectors, ...dossiers, ...communes];
    if (!email || allTopics.length === 0) return;

    setState('loading');

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          locale: ['fr', 'nl', 'en', 'de'].includes(locale) ? locale : 'fr',
          topics: allTopics,
          website, // honeypot
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setState(data.alreadySubscribed ? 'successExisting' : 'success');
        setEmail('');
      } else {
        const data = await res.json().catch(() => ({}));
        console.error(`Subscribe failed (${res.status}):`, data);
        setState('error');
      }
    } catch (err) {
      console.error('Subscribe network error:', err);
      setState('error');
    }
  }

  if (state === 'success' || state === 'successExisting') {
    return (
      <div className="rounded-lg border border-brand-600/20 bg-brand-900/5 p-6 text-center" role="status" aria-live="polite">
        <p className="text-sm font-medium text-brand-900">
          {state === 'successExisting' ? t('successExistingTitle') : t('successTitle')}
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          {state === 'successExisting' ? t('successExistingMessage') : t('successMessage')}
        </p>
      </div>
    );
  }

  const totalSelected = topics.length + sectors.length + dossiers.length + communes.length;

  const pillClass = (selected: boolean) =>
    `cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
      selected
        ? 'border-brand-600 bg-brand-900 text-white'
        : 'border-neutral-300 bg-neutral-50 text-neutral-600 hover:border-neutral-400'
    }`;

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-neutral-200 bg-neutral-50 p-6">
      <h3 className="mb-1 text-lg font-semibold text-neutral-900">{t('title')}</h3>
      <p className="mb-4 text-sm text-neutral-500">{t('subtitle')}</p>

      {/* Honeypot field — hidden from users, filled by bots */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="subscribe-website">Website</label>
        <input
          id="subscribe-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

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
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-500 focus-visible:border-brand-600 focus-visible:ring-1 focus-visible:ring-brand-600"
        />
      </div>

      <fieldset className="mb-4">
        <legend className="mb-2 text-xs font-medium text-neutral-600">{t('topicsLabel')}</legend>
        <div className="flex flex-wrap gap-2">
          {TOPIC_OPTIONS.map((topic) => (
            <label key={topic} className={pillClass(topics.includes(topic))}>
              <input
                type="checkbox"
                name={`topic-${topic}`}
                checked={topics.includes(topic)}
                onChange={() => toggleTopic(topic)}
                className="sr-only"
              />
              {t(`topics.${topic}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <details className="mb-4">
        <summary className="cursor-pointer text-xs font-medium text-neutral-600 hover:text-neutral-800">
          {t('sectorsLabel')}
          {sectors.length > 0 && (
            <span className="ml-1 text-brand-900">({sectors.length})</span>
          )}
        </summary>
        <div className="mt-2 flex flex-wrap gap-2">
          {SECTOR_OPTIONS.map((sector) => (
            <label key={sector} className={pillClass(sectors.includes(sector))}>
              <input
                type="checkbox"
                name={`sector-${sector}`}
                checked={sectors.includes(sector)}
                onChange={() => toggleSector(sector)}
                className="sr-only"
              />
              {t(`topics.${sector}`)}
            </label>
          ))}
        </div>
      </details>

      <details className="mb-4">
        <summary className="cursor-pointer text-xs font-medium text-neutral-600 hover:text-neutral-800">
          {t('dossiersLabel')}
          {dossiers.length > 0 && (
            <span className="ml-1 text-brand-900">({dossiers.length})</span>
          )}
        </summary>
        <div className="mt-2 flex flex-wrap gap-2">
          {dossierOptions.map((option) => (
            <label key={option.id} className={pillClass(dossiers.includes(option.id))}>
              <input
                type="checkbox"
                name={`dossier-${option.id}`}
                checked={dossiers.includes(option.id)}
                onChange={() => toggleDossier(option.id)}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
      </details>

      <details className="mb-4">
        <summary className="cursor-pointer text-xs font-medium text-neutral-600 hover:text-neutral-800">
          {t('communesLabel')}
          {communes.length > 0 && (
            <span className="ml-1 text-brand-900">({communes.length})</span>
          )}
        </summary>
        <div className="mt-2 flex flex-wrap gap-2">
          {COMMUNE_OPTIONS.map((commune) => (
            <label key={commune} className={pillClass(communes.includes(commune))}>
              <input
                type="checkbox"
                name={`commune-${commune}`}
                checked={communes.includes(commune)}
                onChange={() => toggleCommune(commune)}
                className="sr-only"
              />
              {t(`topics.${commune}`)}
            </label>
          ))}
        </div>
      </details>

      <button
        type="submit"
        disabled={state === 'loading' || totalSelected === 0}
        className="w-full rounded-md bg-brand-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state === 'loading' ? t('submitting') : t('submit')}
      </button>

      {state === 'error' && (
        <p className="mt-2 text-xs text-status-delayed" role="alert">{t('errorMessage')}</p>
      )}

      <p className="mt-3 text-center text-xs text-neutral-500">{t('privacy')}</p>
    </form>
  );
}
