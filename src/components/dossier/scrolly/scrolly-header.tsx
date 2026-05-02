// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { formatDate } from '@/lib/utils';

interface ScrollyHeaderProps {
  slug: string;
  locale: string;
  lastModified: string;
}

/**
 * Minimal header for the scrolly view.
 *
 * Intentionally épuré: back-link to structured view + freshness indicator.
 * No nav, no logo, no subtitle — the scrolly is meant to feel like an
 * uninterrupted reading experience. The global BGM site header above
 * (provided by [locale]/layout) still gives access to the rest of the site.
 */
export function ScrollyHeader({ slug, locale, lastModified }: ScrollyHeaderProps) {
  return (
    <div className="border-b border-slate-200 bg-slate-50/60">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <a
          href={`/${locale}/dossiers/${slug}`}
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 transition-colors hover:text-brand-700"
          aria-label="Retour à la vue détaillée du dossier"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M9.78 4.22a.75.75 0 010 1.06L6.06 9h9.69a.75.75 0 010 1.5H6.06l3.72 3.72a.75.75 0 11-1.06 1.06l-5-5a.75.75 0 010-1.06l5-5a.75.75 0 011.06 0z"
              clipRule="evenodd"
            />
          </svg>
          Vue détaillée
        </a>
        <div className="text-xs text-slate-500">
          Mis à jour le {formatDate(lastModified, locale)}
        </div>
      </div>
    </div>
  );
}
