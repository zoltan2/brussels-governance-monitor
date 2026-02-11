'use client';

import { useState } from 'react';

interface FeedbackButtonProps {
  cardTitle: string;
  cardType: string;
  cardSlug: string;
  labels: {
    button: string;
    title: string;
    typeLabel: string;
    types: {
      error: string;
      correction: string;
      source: string;
      other: string;
    };
    messageLabel: string;
    messagePlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    submit: string;
    submitting: string;
    success: string;
    errorMessage: string;
    cancel: string;
  };
}

export function FeedbackButton({ cardTitle, cardType, cardSlug, labels }: FeedbackButtonProps) {
  const [open, setOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState('error');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    setStatus('submitting');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardTitle,
          cardType,
          cardSlug,
          feedbackType,
          message: message.trim(),
          email: email.trim() || undefined,
          url: window.location.href,
        }),
      });

      if (res.ok) {
        setStatus('success');
        setTimeout(() => {
          setOpen(false);
          setStatus('idle');
          setMessage('');
          setEmail('');
          setFeedbackType('error');
        }, 3000);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        {labels.button}
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-neutral-900">{labels.title}</h3>

      {status === 'success' ? (
        <p className="text-sm text-teal-700" role="status" aria-live="polite">{labels.success}</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="feedback-type" className="mb-1 block text-xs font-medium text-neutral-600">
              {labels.typeLabel}
            </label>
            <select
              id="feedback-type"
              value={feedbackType}
              onChange={(e) => setFeedbackType(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900"
            >
              <option value="error">{labels.types.error}</option>
              <option value="correction">{labels.types.correction}</option>
              <option value="source">{labels.types.source}</option>
              <option value="other">{labels.types.other}</option>
            </select>
          </div>

          <div>
            <label htmlFor="feedback-message" className="mb-1 block text-xs font-medium text-neutral-600">
              {labels.messageLabel}
            </label>
            <textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={labels.messagePlaceholder}
              rows={3}
              required
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-500"
            />
          </div>

          <div>
            <label htmlFor="feedback-email" className="mb-1 block text-xs font-medium text-neutral-600">
              {labels.emailLabel}
            </label>
            <input
              id="feedback-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={labels.emailPlaceholder}
              className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 placeholder:text-neutral-500"
            />
          </div>

          {status === 'error' && (
            <p className="text-xs text-status-delayed" role="alert">{labels.errorMessage}</p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={status === 'submitting' || !message.trim()}
              className="rounded-md bg-brand-900 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-800 disabled:opacity-50"
            >
              {status === 'submitting' ? labels.submitting : labels.submit}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setStatus('idle');
              }}
              className="rounded-md px-4 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100"
            >
              {labels.cancel}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
