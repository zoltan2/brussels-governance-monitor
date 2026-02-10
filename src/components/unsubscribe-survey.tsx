'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface UnsubscribeSurveyProps {
  onConfirm: (rating: number | null, feedback: string) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function UnsubscribeSurvey({
  onConfirm,
  onCancel,
  isSubmitting,
}: UnsubscribeSurveyProps) {
  const t = useTranslations('subscribePreferences');
  const [rating, setRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6">
      <h2 className="mb-1 text-lg font-semibold text-neutral-900">
        {t('surveyTitle')}
      </h2>

      <div className="mb-4 mt-4">
        <p className="mb-2 text-sm text-neutral-600">{t('surveyRating')}</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className="rounded p-1 transition-colors hover:bg-neutral-100"
              aria-label={`${star}/5`}
            >
              <svg
                className={`h-7 w-7 ${
                  rating !== null && star <= rating
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-none text-neutral-300'
                }`}
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                />
              </svg>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label htmlFor="unsubscribe-feedback" className="mb-1 block text-sm text-neutral-600">
          {t('surveyFeedback')}
        </label>
        <textarea
          id="unsubscribe-feedback"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder={t('surveyFeedbackPlaceholder')}
          rows={3}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-600 focus:ring-1 focus:ring-brand-600 focus:outline-none"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 rounded-md border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
        >
          {t('cancelUnsubscribe')}
        </button>
        <button
          type="button"
          onClick={() => onConfirm(rating, feedback)}
          disabled={isSubmitting}
          className="flex-1 rounded-md bg-neutral-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-50"
        >
          {isSubmitting ? '...' : t('confirmUnsubscribe')}
        </button>
      </div>
    </div>
  );
}
