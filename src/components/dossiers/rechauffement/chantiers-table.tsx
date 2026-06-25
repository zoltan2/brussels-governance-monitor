// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { ReactElement } from 'react';
import { CHANTIERS, NOTE_BAS_TABLEAU, type ChantierConfiance, type ChantierType } from './data/chantiers';

const CAPTION_ID = 'rechauffement-chantiers-caption';

const CONFIANCE_LABEL: Record<ChantierConfiance, string> = {
  official: 'officiel',
  estimated: 'estime',
  unconfirmed: 'non confirme',
};

const CONFIANCE_TONE: Record<ChantierConfiance, string> = {
  official: 'border-neutral-300 bg-neutral-50 text-neutral-700',
  estimated: 'border-amber-300 bg-amber-50 text-amber-800',
  unconfirmed: 'border-slate-300 bg-slate-100 text-slate-600',
};

const TYPE_LABEL: Record<ChantierType, string> = {
  'polemique': 'Chantier polemique',
  'contre-exemple': 'Contre-exemple positif',
};

const TYPE_ROW_TONE: Record<ChantierType, string> = {
  'polemique': '',
  'contre-exemple': 'bg-blue-50/40',
};

export function RechauffementChantiersTable(): ReactElement {
  return (
    <figure
      aria-labelledby={CAPTION_ID}
      className="my-8 overflow-hidden rounded-lg border border-neutral-200 bg-white"
    >
      <figcaption
        id={CAPTION_ID}
        className="border-b border-neutral-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500"
      >
        Chantiers bruxellois et bilan arboricole - chantiers polemiques et contre-exemples
      </figcaption>

      {/* Mobile : cartes empilees */}
      <ul className="divide-y divide-neutral-200 sm:hidden">
        {CHANTIERS.map((row) => (
          <li
            key={row.id}
            className={`px-4 py-3 ${TYPE_ROW_TONE[row.type]}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-neutral-900">{row.chantier}</div>
                <div className="mt-0.5 text-xs text-neutral-500">{TYPE_LABEL[row.type]}</div>
              </div>
              <span
                className={`shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${CONFIANCE_TONE[row.confiance]}`}
              >
                {CONFIANCE_LABEL[row.confiance]}
              </span>
            </div>
            <p className="mt-1 text-xs text-neutral-600">
              <span className="font-medium">Maitre d&apos;ouvrage :</span> {row.maitreDOuvrage}
            </p>
            <p className="mt-1 text-xs text-neutral-700">
              <span className="font-medium">Cout :</span> {row.cout}
            </p>
            <p className="mt-1 text-xs text-neutral-700">
              <span className="font-medium">Arbres/verdure :</span> {row.arbres}
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
              <th scope="col" className="px-4 py-2.5">Chantier</th>
              <th scope="col" className="px-4 py-2.5">Maitre d&apos;ouvrage</th>
              <th scope="col" className="px-4 py-2.5">Cout</th>
              <th scope="col" className="px-4 py-2.5">Arbres / verdure</th>
              <th scope="col" className="px-4 py-2.5">Polemique / contexte</th>
              <th scope="col" className="px-4 py-2.5">Confiance</th>
              <th scope="col" className="px-4 py-2.5">Source</th>
            </tr>
          </thead>
          <tbody>
            {CHANTIERS.map((row) => (
              <tr
                key={row.id}
                className={`border-t border-neutral-100 align-top ${TYPE_ROW_TONE[row.type]}`}
              >
                <td className="px-4 py-2.5">
                  <div className="font-medium text-neutral-900">{row.chantier}</div>
                  <div className="mt-0.5 text-[11px] text-neutral-500">{TYPE_LABEL[row.type]}</div>
                </td>
                <td className="px-4 py-2.5 text-neutral-600">{row.maitreDOuvrage}</td>
                <td className="px-4 py-2.5 text-neutral-700">{row.cout}</td>
                <td className="px-4 py-2.5 text-neutral-600">{row.arbres}</td>
                <td className="px-4 py-2.5 text-neutral-600 italic">{row.polemique}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${CONFIANCE_TONE[row.confiance]}`}
                  >
                    {CONFIANCE_LABEL[row.confiance]}
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
        {NOTE_BAS_TABLEAU}
      </p>
    </figure>
  );
}
