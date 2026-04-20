// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

interface MagazineLinkProps {
  weekShort: string; // e.g. "s15"
  lang: string;
}

const MAGAZINE_BASE =
  'https://zoltan2.github.io/brussels-governance-monitor/magazine';

export function MagazineLink({ weekShort, lang }: MagazineLinkProps) {
  if (lang !== 'fr') return null;
  const href = `${MAGAZINE_BASE}/${weekShort}/`;
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 rounded border border-slate-900 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-900 hover:text-white"
      target="_blank"
      rel="noopener noreferrer"
    >
      <span aria-hidden>📖</span>
      <span>Lire en version magazine</span>
      <span aria-hidden>→</span>
    </a>
  );
}
