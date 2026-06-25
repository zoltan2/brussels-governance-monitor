// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { ReactElement } from 'react';
import { HEAT_COUNTERS, HEAT_MAP, type HeatConfiance } from './data/heat';

const COUNTERS_CAPTION_ID = 'rechauffement-heat-counters-caption';

const CONFIANCE_LABEL: Record<HeatConfiance, string> = {
  official: 'officiel',
  estimated: 'estime',
  unconfirmed: 'non confirme',
};

const CONFIANCE_TONE: Record<HeatConfiance, string> = {
  official: 'border-neutral-300 bg-neutral-50 text-neutral-700',
  estimated: 'border-amber-300 bg-amber-50 text-amber-800',
  unconfirmed: 'border-slate-300 bg-slate-100 text-slate-600',
};

/** Largeur relative de la barre de densite (max = 23 266, arrondie a 24 000) */
const MAX_DENSITE = 24000;

function parseHabitants(densite: string): number {
  // Extrait le premier nombre de la chaine (ex. "23 266 hab/km²" → 23266)
  const clean = densite.replace(/\s/g, '').match(/\d+/);
  return clean ? parseInt(clean[0], 10) : 0;
}

export function RechauffementHeatCounters(): ReactElement {
  return (
    <div className="my-8 space-y-6">
      {/* Section 1 : rangee de compteurs */}
      <figure
        aria-labelledby={COUNTERS_CAPTION_ID}
        className="overflow-hidden rounded-lg border border-neutral-200 bg-white"
      >
        <figcaption
          id={COUNTERS_CAPTION_ID}
          className="border-b border-neutral-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500"
        >
          Chiffres cles - chaleur urbaine a Bruxelles
        </figcaption>

        <ul className="grid grid-cols-1 divide-y divide-neutral-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-5 lg:divide-y-0">
          {HEAT_COUNTERS.map((counter) => (
            <li key={counter.id} className="px-4 py-4">
              <div className="flex items-start justify-between gap-2">
                <span
                  className="text-xl font-bold leading-tight text-blue-900"
                  aria-label={`${counter.valeur} : ${counter.label}`}
                >
                  {counter.valeur}
                </span>
                <span
                  className={`shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium ${CONFIANCE_TONE[counter.confiance]}`}
                  aria-label={`Niveau de confiance : ${CONFIANCE_LABEL[counter.confiance]}`}
                >
                  {CONFIANCE_LABEL[counter.confiance]}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-neutral-800">{counter.label}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">{counter.detail}</p>
            </li>
          ))}
        </ul>
      </figure>

      {/* Section 2 : encadre quartiers les plus chauds */}
      <figure
        aria-labelledby={HEAT_MAP.captionId}
        className="overflow-hidden rounded-lg border border-amber-200 bg-amber-50"
      >
        <figcaption
          id={HEAT_MAP.captionId}
          className="border-b border-amber-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-amber-800"
        >
          {HEAT_MAP.titre}
        </figcaption>

        <div className="px-4 py-4">
          <ul className="space-y-3" role="list" aria-label="Communes les plus exposees a la chaleur">
            {HEAT_MAP.quartiers.map((q) => {
              const habitants = parseHabitants(q.densite);
              const barWidth = Math.round((habitants / MAX_DENSITE) * 100);
              return (
                <li key={q.id}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-neutral-900">{q.commune}</span>
                    <span className="shrink-0 text-xs text-neutral-600">{q.densite}</span>
                  </div>
                  {q.note && (
                    <p className="mt-0.5 text-[11px] text-amber-700">{q.note}</p>
                  )}
                  {/* Barre de densite accessible */}
                  <div
                    role="img"
                    aria-label={`Densite de ${q.commune} : ${q.densite}`}
                    className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-amber-100"
                  >
                    <div
                      className="h-2 rounded-full bg-amber-500"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="mt-4 text-[11px] leading-relaxed text-neutral-500">
            {HEAT_MAP.legende}
          </p>

          <div className="mt-2 flex items-center gap-1.5">
            <span
              className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${CONFIANCE_TONE[HEAT_MAP.confiance]}`}
            >
              {CONFIANCE_LABEL[HEAT_MAP.confiance]}
            </span>
          </div>
        </div>
      </figure>
    </div>
  );
}
