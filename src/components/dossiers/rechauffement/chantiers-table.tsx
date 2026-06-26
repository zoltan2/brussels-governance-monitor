// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { ReactElement } from 'react';
import { getChantiersForLocale, type ChantierConfiance, type ChantierType, type Locale } from './data/chantiers';

const CAPTION_ID = 'rechauffement-chantiers-caption';

type Labels = {
  caption: string;
  cols: {
    chantier: string;
    maitreDOuvrage: string;
    cout: string;
    arbres: string;
    polemique: string;
    confiance: string;
    source: string;
  };
  mobile: {
    maitreDOuvrage: string;
    cout: string;
    arbres: string;
  };
  confiance: Record<ChantierConfiance, string>;
  type: Record<ChantierType, string>;
};

const LABELS: Record<Locale, Labels> = {
  fr: {
    caption: 'Chantiers bruxellois et bilan arboricole - chantiers polemiques et contre-exemples',
    cols: {
      chantier: 'Chantier',
      maitreDOuvrage: "Maitre d'ouvrage",
      cout: 'Cout',
      arbres: 'Arbres / verdure',
      polemique: 'Polemique / contexte',
      confiance: 'Confiance',
      source: 'Source',
    },
    mobile: {
      maitreDOuvrage: "Maitre d'ouvrage",
      cout: 'Cout',
      arbres: 'Arbres/verdure',
    },
    confiance: {
      official: 'officiel',
      estimated: 'estime',
      unconfirmed: 'non confirme',
    },
    type: {
      'polemique': 'Chantier polemique',
      'contre-exemple': 'Contre-exemple positif',
    },
  },
  nl: {
    caption: 'Brusselse werven en bomenbalans - betwiste werven en tegenvoorbeelden',
    cols: {
      chantier: 'Werf',
      maitreDOuvrage: 'Bouwheer',
      cout: 'Kostprijs',
      arbres: 'Bomen / groen',
      polemique: 'Betwisting / context',
      confiance: 'Betrouwbaarheid',
      source: 'Bron',
    },
    mobile: {
      maitreDOuvrage: 'Bouwheer',
      cout: 'Kostprijs',
      arbres: 'Bomen/groen',
    },
    confiance: {
      official: 'officieel',
      estimated: 'geschat',
      unconfirmed: 'niet bevestigd',
    },
    type: {
      'polemique': 'Betwiste werf',
      'contre-exemple': 'Positief tegenvoorbeeld',
    },
  },
  en: {
    caption: 'Brussels construction sites and tree balance - controversial sites and counter-examples',
    cols: {
      chantier: 'Site',
      maitreDOuvrage: 'Project owner',
      cout: 'Cost',
      arbres: 'Trees / greenery',
      polemique: 'Controversy / context',
      confiance: 'Confidence',
      source: 'Source',
    },
    mobile: {
      maitreDOuvrage: 'Project owner',
      cout: 'Cost',
      arbres: 'Trees/greenery',
    },
    confiance: {
      official: 'official',
      estimated: 'estimated',
      unconfirmed: 'unconfirmed',
    },
    type: {
      'polemique': 'Controversial site',
      'contre-exemple': 'Positive counter-example',
    },
  },
  de: {
    caption: 'Brüsseler Baustellen und Baumblanz - umstrittene Projekte und Gegenbeispiele',
    cols: {
      chantier: 'Baustelle',
      maitreDOuvrage: 'Bauherr',
      cout: 'Kosten',
      arbres: 'Bäume / Begrünung',
      polemique: 'Kontroverse / Kontext',
      confiance: 'Vertrauensniveau',
      source: 'Quelle',
    },
    mobile: {
      maitreDOuvrage: 'Bauherr',
      cout: 'Kosten',
      arbres: 'Bäume/Begrünung',
    },
    confiance: {
      official: 'offiziell',
      estimated: 'geschätzt',
      unconfirmed: 'nicht bestätigt',
    },
    type: {
      'polemique': 'Umstrittene Baustelle',
      'contre-exemple': 'Positives Gegenbeispiel',
    },
  },
};

const CONFIANCE_TONE: Record<ChantierConfiance, string> = {
  official: 'border-neutral-300 bg-neutral-50 text-neutral-700',
  estimated: 'border-amber-300 bg-amber-50 text-amber-800',
  unconfirmed: 'border-slate-300 bg-slate-100 text-slate-600',
};

const CONFIANCE_ARIA_PREFIX: Record<Locale, string> = {
  fr: 'Niveau de confiance :',
  nl: 'Betrouwbaarheidsniveau:',
  en: 'Confidence level:',
  de: 'Vertrauensniveau:',
};

const TYPE_ROW_TONE: Record<ChantierType, string> = {
  'polemique': '',
  'contre-exemple': 'bg-blue-50/40',
};

export function RechauffementChantiersTable({ locale = 'fr' }: { locale?: Locale }): ReactElement {
  const labels = LABELS[locale] ?? LABELS.fr;
  const { rows, noteBas } = getChantiersForLocale(locale);

  return (
    <figure
      aria-labelledby={CAPTION_ID}
      className="my-8 overflow-hidden rounded-lg border border-neutral-200 bg-white"
    >
      <figcaption
        id={CAPTION_ID}
        className="border-b border-neutral-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500"
      >
        {labels.caption}
      </figcaption>

      {/* Mobile : cartes empilees */}
      <ul className="divide-y divide-neutral-200 sm:hidden">
        {rows.map((row) => (
          <li
            key={row.id}
            className={`px-4 py-3 ${TYPE_ROW_TONE[row.type]}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-neutral-900">{row.chantier}</div>
                <div className="mt-0.5 text-xs text-neutral-500">{labels.type[row.type]}</div>
              </div>
              <span
                className={`shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${CONFIANCE_TONE[row.confiance]}`}
                aria-label={`${CONFIANCE_ARIA_PREFIX[locale] ?? CONFIANCE_ARIA_PREFIX.fr} ${labels.confiance[row.confiance]}`}
              >
                {labels.confiance[row.confiance]}
              </span>
            </div>
            <p className="mt-1 text-xs text-neutral-600">
              <span className="font-medium">{labels.mobile.maitreDOuvrage} :</span> {row.maitreDOuvrage}
            </p>
            <p className="mt-1 text-xs text-neutral-700">
              <span className="font-medium">{labels.mobile.cout} :</span> {row.cout}
            </p>
            <p className="mt-1 text-xs text-neutral-700">
              <span className="font-medium">{labels.mobile.arbres} :</span> {row.arbres}
            </p>
            <p className="mt-1 text-xs text-neutral-600 italic">{row.polemique}</p>
            <p className="mt-1 text-[11px] text-neutral-400">{row.source}</p>
          </li>
        ))}
      </ul>

      {/* Desktop : tableau */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <tr>
              <th scope="col" className="px-4 py-2.5">{labels.cols.chantier}</th>
              <th scope="col" className="px-4 py-2.5">{labels.cols.maitreDOuvrage}</th>
              <th scope="col" className="px-4 py-2.5">{labels.cols.cout}</th>
              <th scope="col" className="px-4 py-2.5">{labels.cols.arbres}</th>
              <th scope="col" className="px-4 py-2.5">{labels.cols.polemique}</th>
              <th scope="col" className="px-4 py-2.5">{labels.cols.confiance}</th>
              <th scope="col" className="px-4 py-2.5">{labels.cols.source}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={`border-t border-neutral-100 align-top ${TYPE_ROW_TONE[row.type]}`}
              >
                <td className="px-4 py-2.5">
                  <div className="font-medium text-neutral-900">{row.chantier}</div>
                  <div className="mt-0.5 text-[11px] text-neutral-500">{labels.type[row.type]}</div>
                </td>
                <td className="px-4 py-2.5 text-neutral-600">{row.maitreDOuvrage}</td>
                <td className="px-4 py-2.5 text-neutral-700">{row.cout}</td>
                <td className="px-4 py-2.5 text-neutral-600">{row.arbres}</td>
                <td className="px-4 py-2.5 text-neutral-600 italic">{row.polemique}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${CONFIANCE_TONE[row.confiance]}`}
                    aria-label={`${CONFIANCE_ARIA_PREFIX[locale] ?? CONFIANCE_ARIA_PREFIX.fr} ${labels.confiance[row.confiance]}`}
                  >
                    {labels.confiance[row.confiance]}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-[11px] text-neutral-500">{row.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Note de bas de tableau */}
      <p className="border-t border-neutral-100 px-4 py-3 text-[11px] leading-relaxed text-neutral-500">
        {noteBas}
      </p>
    </figure>
  );
}
