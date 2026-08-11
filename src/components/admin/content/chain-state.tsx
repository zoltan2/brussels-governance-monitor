// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { ChainState } from '@/lib/publication-deadlines';

export function ChainStateBanner({ state }: { state: ChainState }) {
  return (
    <section
      aria-labelledby="chaines-titre"
      className={`rounded-lg border p-5 ${
        state.urgent ? 'border-amber-500 bg-amber-50/60' : 'border-neutral-200 bg-neutral-50'
      }`}
    >
      <h2 id="chaines-titre" className="font-semibold text-neutral-900">
        {state.headline}
      </h2>

      {/* L'email d'abord : c'est la seule chose que GitHub ne peut pas dire. */}
      <p className="mt-2 text-sm text-neutral-900">{state.emailDetail}</p>
      <p className="mt-2 text-sm text-neutral-600">{state.mdxDetail}</p>
    </section>
  );
}
