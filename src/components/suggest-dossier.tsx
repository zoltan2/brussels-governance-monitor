// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

import { useState } from 'react';

interface SuggestDossierProps {
  labels: {
    title: string;
    description: string;
    nameLabel: string;
    namePlaceholder: string;
    reasonLabel: string;
    reasonPlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    submit: string;
    submitting: string;
    success: string;
    errorMessage: string;
  };
}

export function SuggestDossier({ labels }: SuggestDossierProps) {
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (website) return;

    setStatus('submitting');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardTitle: name.trim(),
          cardType: 'dossier',
          cardSlug: 'suggestion',
          feedbackType: 'suggest-dossier',
          message: reason.trim() || name.trim(),
          email: email.trim() || undefined,
          url: window.location.href,
        }),
      });

      if (res.ok) {
        setStatus('success');
        setTimeout(() => {
          setStatus('idle');
          setName('');
          setReason('');
          setEmail('');
        }, 4000);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50/50 p-5">
      <h2 className="mb-1 text-lg font-semibold text-neutral-700">{labels.title}</h2>
      <p className="mb-4 text-sm text-neutral-500">{labels.description}</p>

      {status === 'success' ? (
        <p className="text-sm font-medium text-teal-700" role="status" aria-live="polite">
          {labels.success}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="suggest-name" className="mb-1 block text-xs font-medium text-neutral-600">
              {labels.nameLabel}
            </label>
            <input
              id="suggest-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={labels.namePlaceholder}
              required
              maxLength={200}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-900 placeholder:text-neutral-400"
            />
          </div>

          <div>
            <label htmlFor="suggest-reason" className="mb-1 block text-xs font-medium text-neutral-600">
              {labels.reasonLabel}
            </label>
            <textarea
              id="suggest-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={labels.reasonPlaceholder}
              rows={2}
              maxLength={500}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400"
            />
          </div>

          <div>
            <label htmlFor="suggest-email" className="mb-1 block text-xs font-medium text-neutral-600">
              {labels.emailLabel}
            </label>
            <input
              id="suggest-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={labels.emailPlaceholder}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-900 placeholder:text-neutral-400"
            />
          </div>

          {/* Honeypot */}
          <div className="absolute -left-[9999px]" aria-hidden="true">
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          {status === 'error' && (
            <p className="text-xs text-status-delayed" role="alert">{labels.errorMessage}</p>
          )}

          <button
            type="submit"
            disabled={status === 'submitting' || !name.trim()}
            className="rounded-md bg-brand-900 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-800 disabled:opacity-50"
          >
            {status === 'submitting' ? labels.submitting : labels.submit}
          </button>
        </form>
      )}
    </div>
  );
}
