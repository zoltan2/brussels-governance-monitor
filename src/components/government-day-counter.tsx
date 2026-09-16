// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

// PROTOTYPE LOCAL (branche proto/accueil-refonte). Textes FR en dur.
//
// The homepage is prerendered once per deploy: a day count computed at build time
// would freeze. The server renders a placeholder (null snapshot, no mismatch) and the
// browser fills in the count from the visitor's date right after hydration.

import { useSyncExternalStore } from 'react';

const DAY_MS = 86_400_000;

function daysSince(isoDate: string, now: Date): number {
  const start = Date.parse(`${isoDate}T00:00:00Z`);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.floor((today - start) / DAY_MS));
}

const subscribe = () => () => {};

export function GovernmentDayCounter({
  oathDate,
  oathLabel,
}: {
  /** ISO date of the swearing-in (data/government.json → oathDate). */
  oathDate: string;
  /** Human-readable date, formatted server-side. */
  oathLabel: string;
}) {
  const days = useSyncExternalStore<number | null>(
    subscribe,
    () => daysSince(oathDate, new Date()),
    () => null,
  );

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-white/75">Gouvernement bruxellois</p>
      <p className="mt-1 min-h-[2.5rem] text-4xl font-extrabold tabular-nums">
        {days ?? <span className="text-white/40">…</span>}
      </p>
      <p className="mt-1 text-sm text-white/85">
        jours d’exercice, depuis la prestation de serment du {oathLabel}
      </p>
    </div>
  );
}
