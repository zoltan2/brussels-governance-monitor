'use client';

import { useState } from 'react';

interface CardSubscribeProps {
  topic: string;
  locale: string;
  labels: {
    title: string;
    emailPlaceholder: string;
    submit: string;
    submitting: string;
    success: string;
    error: string;
    privacy: string;
  };
}

export function CardSubscribe({ topic, locale, labels }: CardSubscribeProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('submitting');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          locale: locale === 'fr' || locale === 'nl' ? locale : 'fr',
          topics: [topic],
          website: '', // honeypot
        }),
      });

      if (res.ok) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-lg border border-teal-200 bg-teal-50 p-4" role="status" aria-live="polite">
        <p className="text-sm text-teal-700">{labels.success}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <p className="mb-3 text-sm font-medium text-neutral-700">{labels.title}</p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <label htmlFor={`card-subscribe-${topic}`} className="sr-only">{labels.emailPlaceholder}</label>
        <input
          type="email"
          id={`card-subscribe-${topic}`}
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={labels.emailPlaceholder}
          required
          className="min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
        />
        <button
          type="submit"
          disabled={status === 'submitting' || !email.trim()}
          className="shrink-0 rounded-md bg-brand-900 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-800 disabled:opacity-50"
        >
          {status === 'submitting' ? labels.submitting : labels.submit}
        </button>
      </form>
      {status === 'error' && (
        <p className="mt-2 text-xs text-status-delayed" role="alert">{labels.error}</p>
      )}
      <p className="mt-2 text-xs text-neutral-400">{labels.privacy}</p>
    </div>
  );
}
