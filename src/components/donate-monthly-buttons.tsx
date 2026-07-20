// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

const AMOUNTS_CENTS = [500, 1000, 2500];

export function DonateMonthlyButtons({ locale }: { locale: string }) {
  const t = useTranslations('support');
  const [pendingCents, setPendingCents] = useState<number | null>(null);
  const [error, setError] = useState(false);

  async function handleClick(cents: number) {
    setError(false);
    setPendingCents(cents);
    try {
      const res = await fetch('/api/donate/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cents, locale }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'checkout failed');
      window.location.href = data.url;
    } catch {
      setError(true);
      setPendingCents(null);
    }
  }

  return (
    <div className="mb-3">
      <div className="flex justify-center gap-2">
        {AMOUNTS_CENTS.map((cents) => (
          <button
            key={cents}
            type="button"
            onClick={() => handleClick(cents)}
            disabled={pendingCents !== null}
            className="rounded-md border border-brand-800 px-4 py-2 text-xs font-medium text-brand-800 transition-colors hover:bg-brand-800 hover:text-neutral-50 disabled:opacity-60"
          >
            {pendingCents === cents ? '…' : `${cents / 100} €/${t('month')}`}
          </button>
        ))}
      </div>
      {error && (
        <p className="mt-2 text-center text-xs text-amber-600">
          {t('donateError')}
        </p>
      )}
    </div>
  );
}
