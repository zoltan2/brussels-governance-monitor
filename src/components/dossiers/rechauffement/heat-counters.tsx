// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { ReactElement } from 'react';
import {
  HEAT_COUNTERS,
  HEAT_MAP,
  CONFIANCE_LABELS,
  type HeatCounter,
  type HeatConfiance,
  type Locale,
} from './data/heat';

const COUNTERS_CAPTION_ID = 'rechauffement-heat-counters-caption';

/** Libelles du titre de la section compteurs, par locale */
const COUNTERS_CAPTION: Record<Locale, string> = {
  fr: 'Chiffres cles - chaleur urbaine a Bruxelles',
  nl: 'Kerncijfers - stedelijke hitte in Brussel',
  en: 'Key figures - urban heat in Brussels',
  de: 'Kennzahlen - städtische Hitze in Brüssel',
};

/** Libelle aria de la liste des communes, par locale */
const COMMUNES_ARIA: Record<Locale, string> = {
  fr: 'Communes les plus exposees a la chaleur',
  nl: 'Gemeenten met de hoogste hitte-blootstelling',
  en: 'Municipalities most exposed to heat',
  de: 'Am stärksten hitzebelastete Gemeinden',
};

/** Libelle aria densite dans la barre, par locale */
const DENSITE_ARIA_PREFIX: Record<Locale, string> = {
  fr: 'Densite de',
  nl: 'Dichtheid van',
  en: 'Density of',
  de: 'Dichte von',
};

/** Libelle aria niveau de confiance, par locale */
const CONFIANCE_ARIA_PREFIX: Record<Locale, string> = {
  fr: 'Niveau de confiance :',
  nl: 'Betrouwbaarheidsniveau:',
  en: 'Confidence level:',
  de: 'Vertrauensniveau:',
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

export function CountersRow({
  counters,
  caption,
  captionId,
  locale,
}: {
  counters: HeatCounter[];
  caption: Record<Locale, string>;
  captionId: string;
  locale: Locale;
}): ReactElement {
  const confianceLabel = CONFIANCE_LABELS[locale] ?? CONFIANCE_LABELS.fr;
  const countersCaption = caption[locale] ?? caption.fr;
  const confianceAriaPfx = CONFIANCE_ARIA_PREFIX[locale] ?? CONFIANCE_ARIA_PREFIX.fr;

  return (
    <figure
      aria-labelledby={captionId}
      className="overflow-hidden rounded-lg border border-neutral-200 bg-white"
    >
      <figcaption
        id={captionId}
        className="border-b border-neutral-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500"
      >
        {countersCaption}
      </figcaption>

      <ul className="grid grid-cols-1 divide-y divide-neutral-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-5 lg:divide-y-0">
        {counters.map((counter) => {
          const label = counter.label[locale] ?? counter.label.fr;
          const detail = counter.detail[locale] ?? counter.detail.fr;
          const valeur = counter.valeur[locale] ?? counter.valeur.fr;
          return (
            <li key={counter.id} className="px-4 py-4">
              <div className="flex items-start justify-between gap-2">
                <span
                  className="text-xl font-bold leading-tight text-blue-900"
                  aria-label={`${valeur} : ${label}`}
                >
                  {valeur}
                </span>
                <span
                  className={`shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium ${CONFIANCE_TONE[counter.confiance]}`}
                  aria-label={`${confianceAriaPfx} ${confianceLabel[counter.confiance]}`}
                >
                  {confianceLabel[counter.confiance]}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-neutral-800">{label}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">{detail}</p>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}

export function RechauffementHeatCounters({ locale = 'fr' }: { locale?: Locale }): ReactElement {
  const confianceLabel = CONFIANCE_LABELS[locale] ?? CONFIANCE_LABELS.fr;
  const communesAria = COMMUNES_ARIA[locale] ?? COMMUNES_ARIA.fr;
  const densiteAriaPfx = DENSITE_ARIA_PREFIX[locale] ?? DENSITE_ARIA_PREFIX.fr;
  const heatMapTitre = HEAT_MAP.titre[locale] ?? HEAT_MAP.titre.fr;
  const heatMapLegende = HEAT_MAP.legende[locale] ?? HEAT_MAP.legende.fr;

  return (
    <div className="my-8 space-y-6">
      {/* Section 1 : rangee de compteurs */}
      <CountersRow
        counters={HEAT_COUNTERS}
        caption={COUNTERS_CAPTION}
        captionId={COUNTERS_CAPTION_ID}
        locale={locale}
      />

      {/* Section 2 : encadre quartiers les plus chauds */}
      <figure
        aria-labelledby={HEAT_MAP.captionId}
        className="overflow-hidden rounded-lg border border-amber-200 bg-amber-50"
      >
        <figcaption
          id={HEAT_MAP.captionId}
          className="border-b border-amber-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-amber-800"
        >
          {heatMapTitre}
        </figcaption>

        <div className="px-4 py-4">
          <ul className="space-y-3" role="list" aria-label={communesAria}>
            {HEAT_MAP.quartiers.map((q) => {
              const communeName = q.commune[locale] ?? q.commune.fr;
              const habitants = parseHabitants(q.densite);
              const barWidth = Math.round((habitants / MAX_DENSITE) * 100);
              return (
                <li key={q.id}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-neutral-900">{communeName}</span>
                    <span className="shrink-0 text-xs text-neutral-600">{q.densite}</span>
                  </div>
                  {q.note && (
                    <p className="mt-0.5 text-[11px] text-amber-700">
                      {q.note[locale] ?? q.note.fr}
                    </p>
                  )}
                  {/* Barre de densite accessible */}
                  <div
                    role="img"
                    aria-label={`${densiteAriaPfx} ${communeName} : ${q.densite}`}
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
            {heatMapLegende}
          </p>

          <div className="mt-2 flex items-center gap-1.5">
            <span
              className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${CONFIANCE_TONE[HEAT_MAP.confiance]}`}
            >
              {confianceLabel[HEAT_MAP.confiance]}
            </span>
          </div>
        </div>
      </figure>
    </div>
  );
}
