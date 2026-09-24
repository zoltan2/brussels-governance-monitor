// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { ReactElement } from 'react';
import { PROGRAMMES, type SourceProgramme } from './data/programmes';
import type { Locale } from './data/types';

const T: Record<
  Locale,
  {
    caption: string;
    cols: [string, string, string, string, string];
    nonEvalue: string;
    nonConnu: string;
    /** Préfixe du lien vers la source propre d'une cellule, ponctuation de la langue comprise. */
    source: string;
    /** Même préfixe, au pluriel : quand la cellule cite plusieurs sources distinctes. */
    sources: string;
  }
> = {
  fr: {
    caption: 'Programmes de revitalisation : promis, fait, évalué',
    cols: ['Programme', 'Promis', 'Fait', 'Évalué', 'Source'],
    nonEvalue: 'non évalué',
    nonConnu: 'non publié',
    source: 'source\u00a0:',
    sources: 'sources\u00a0:',
  },
  nl: {
    caption: "Herwaarderingsprogramma's: beloofd, gedaan, geëvalueerd",
    cols: ['Programma', 'Beloofd', 'Gedaan', 'Geëvalueerd', 'Bron'],
    nonEvalue: 'niet geëvalueerd',
    nonConnu: 'niet gepubliceerd',
    source: 'bron:',
    sources: 'bronnen:',
  },
  en: {
    caption: 'Revitalisation programmes: promised, done, evaluated',
    cols: ['Programme', 'Promised', 'Done', 'Evaluated', 'Source'],
    nonEvalue: 'not evaluated',
    nonConnu: 'not published',
    source: 'source:',
    sources: 'sources:',
  },
  de: {
    caption: 'Revitalisierungsprogramme: versprochen, umgesetzt, bewertet',
    cols: ['Programm', 'Versprochen', 'Umgesetzt', 'Bewertet', 'Quelle'],
    nonEvalue: 'nicht bewertet',
    nonConnu: 'nicht veröffentlicht',
    source: 'Quelle:',
    sources: 'Quellen:',
  },
};

/** Lien externe vers une source : mêmes attributs que la liste des sources du dossier (voir LegendeSource). */
function LienSource({ source }: { source: SourceProgramme }): ReactElement {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-brand-700 underline underline-offset-2 [overflow-wrap:anywhere] hover:text-brand-900"
    >
      {source.libelle}
    </a>
  );
}

/**
 * Valeur de cellule, suivie du lien vers sa (ou ses) source(s) propre(s) quand elle diffère
 * de la source de la ligne. `source` peut être un tableau : plusieurs évaluations distinctes
 * citées dans le même texte (ex. contrats de quartier, audit de 2001 et évaluation de 2018),
 * chacune avec son propre lien, séparées par une virgule.
 */
function Valeur({
  valeur,
  repli,
  source,
  libelleSource,
  libelleSources,
}: {
  valeur: string | null;
  repli: string;
  source?: SourceProgramme | SourceProgramme[];
  libelleSource: string;
  libelleSources: string;
}): ReactElement {
  if (valeur === null) return <span className="italic text-neutral-600">{repli}</span>;
  const sources = source === undefined ? [] : Array.isArray(source) ? source : [source];
  return (
    <>
      {valeur}
      {sources.length > 0 && (
        <>
          {' '}
          <span className="text-xs text-neutral-600">
            ({sources.length > 1 ? libelleSources : libelleSource}{' '}
            {sources.map((s, i) => (
              <span key={s.url}>
                {i > 0 && ', '}
                <LienSource source={s} />
              </span>
            ))}
            )
          </span>
        </>
      )}
    </>
  );
}

/**
 * Tableau « promis, fait, évalué » des programmes publics qui visent les quartiers
 * pauvres. Une valeur absente est écrite en toutes lettres (« non publié »,
 * « non évalué »), jamais laissée vide. Composant serveur uniquement.
 */
export function ZruProgrammes({ locale = 'fr' }: { locale?: Locale }): ReactElement {
  const t = T[locale];
  return (
    <div
      role="region"
      aria-label={t.caption}
      tabIndex={0}
      className="my-8 overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-50"
    >
      <table className="w-full text-sm">
        <caption className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-neutral-600">
          {t.caption}
        </caption>
        <thead>
          <tr>
            {t.cols.map((c) => (
              <th key={c} scope="col" className="px-3 py-2 text-left text-xs font-semibold text-neutral-700">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PROGRAMMES.map((p) => (
            <tr key={p.id} className="border-t border-neutral-200 align-top">
              <th scope="row" className="px-3 py-2 text-left font-medium text-neutral-900">
                {p.libelle[locale]}
              </th>
              <td className="px-3 py-2 text-neutral-700">
                <Valeur
                  valeur={p.promis[locale]}
                  repli={t.nonConnu}
                  source={p.sourcePromis}
                  libelleSource={t.source}
                  libelleSources={t.sources}
                />
              </td>
              <td className="px-3 py-2 text-neutral-700">
                <Valeur
                  valeur={p.fait[locale]}
                  repli={p.faitNonPublie?.[locale] ?? t.nonConnu}
                  source={p.sourceFait}
                  libelleSource={t.source}
                  libelleSources={t.sources}
                />
              </td>
              <td className="px-3 py-2 text-neutral-700">
                <Valeur
                  valeur={p.evalue[locale]}
                  repli={t.nonEvalue}
                  source={p.sourceEvalue}
                  libelleSource={t.source}
                  libelleSources={t.sources}
                />
              </td>
              <td className="px-3 py-2">
                <LienSource source={p.source} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
