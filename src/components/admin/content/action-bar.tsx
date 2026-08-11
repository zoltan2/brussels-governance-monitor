'use client';

// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import type { CheckState } from '@/lib/github-pr';

const POLL_MS = 20_000;

export function ActionBar({
  number,
  sha,
  checks,
  truncated,
  locale,
}: {
  number: number;
  sha: string;
  checks: CheckState;
  truncated: boolean;
  locale: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- garde de montage, rendu unique volontaire (même motif qu'accessibility-toolbar.tsx:358)
  useEffect(() => { setMounted(true); }, []);

  // Tant que des contrôles tournent, on redemande la page. Sans cela le
  // bouton reste gris indéfiniment dans le cas nominal.
  useEffect(() => {
    if (checks.pending === 0) return;
    const id = setInterval(() => router.refresh(), POLL_MS);
    return () => clearInterval(id);
  }, [checks.pending, router]);

  const blocked =
    checks.failed.length > 0 ||
    checks.pending > 0 ||
    checks.missing.length > 0 ||
    truncated;

  const label = truncated
    ? 'Publication indisponible'
    : checks.failed.length > 0
      ? 'Contrôles en échec'
      : checks.pending > 0
        ? `Contrôles en cours (${checks.passed}/${checks.total})`
        : checks.missing.length > 0
          ? 'Contrôles manquants'
          : busy
            ? 'Publication…'
            : 'Publier maintenant';

  async function publish() {
    setBusy(true);
    setError(null);
    const res = await fetch('/api/admin/content/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number, sha }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? 'La publication a échoué.');
    }
    setBusy(false);
  }

  // Le <header> du site porte `backdrop-filter`, qui casse `position: fixed`
  // chez ses descendants. La barre doit donc être montée sur document.body.
  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-neutral-50 p-4 shadow-lg">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
        <a href={`/${locale}/admin/content`} className="text-sm underline">
          Retour
        </a>
        <div className="flex items-center gap-3">
          {error && <span className="text-sm text-neutral-900">{error}</span>}
          <button
            type="button"
            onClick={publish}
            disabled={blocked || busy}
            className="rounded bg-brand-800 px-5 py-3 text-base font-medium text-neutral-50 disabled:opacity-50"
          >
            {label}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
