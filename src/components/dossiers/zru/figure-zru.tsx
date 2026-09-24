// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { formatDate } from '@/lib/utils';
import { LIBELLES_CONFIANCE, type Locale, type Provenance } from './data/types';

/**
 * Libellés du cadre de figure, par locale. Ne pas ajouter le français en
 * néerlandais/anglais/allemand : un test vérifie l'absence de fuite de locale.
 */
const L: Record<
  Locale,
  {
    source: string;
    extrait: string;
    confiance: string;
    donnees: string;
    modifs: string;
    miseAJour: string;
    licence: string;
    inconnue: string;
  }
> = {
  fr: {
    source: 'Source',
    extrait: 'données extraites le',
    confiance: 'confiance',
    donnees: 'Voir les données',
    modifs: 'Traitements BGM',
    miseAJour: 'mise à jour de la source',
    licence: 'licence',
    inconnue: 'non précisée',
  },
  nl: {
    source: 'Bron',
    extrait: 'gegevens opgehaald op',
    confiance: 'betrouwbaarheid',
    donnees: 'Gegevens bekijken',
    modifs: 'Bewerkingen door BGM',
    miseAJour: 'bijwerking van de bron',
    licence: 'licentie',
    inconnue: 'onbekend',
  },
  en: {
    source: 'Source',
    extrait: 'data extracted on',
    confiance: 'confidence',
    donnees: 'View the data',
    modifs: 'BGM processing',
    miseAJour: 'source updated',
    licence: 'licence',
    inconnue: 'unknown',
  },
  de: {
    source: 'Quelle',
    extrait: 'Daten abgerufen am',
    confiance: 'Vertrauen',
    donnees: 'Daten anzeigen',
    modifs: 'Bearbeitung durch BGM',
    miseAJour: 'Aktualisierung der Quelle',
    licence: 'Lizenz',
    inconnue: 'unbekannt',
  },
};

/** Code Intl (BCP 47) associé à chaque locale du site, pour les dates et les nombres. */
const CODE_INTL: Record<Locale, string> = { fr: 'fr-BE', nl: 'nl-BE', en: 'en-GB', de: 'de-DE' };

/** Formate une cellule de tableau : les nombres suivent la convention locale (virgule décimale et espace insécable pour fr-BE), les chaînes passent telles quelles. */
function formaterCellule(valeur: string | number, locale: Locale): string {
  return typeof valeur === 'number' ? new Intl.NumberFormat(CODE_INTL[locale]).format(valeur) : valeur;
}

export type FigureZruProps = {
  /** Préfixe des identifiants DOM, pour distinguer plusieurs figures sur une même page. */
  idBase: string;
  locale: Locale;
  titre: string;
  indicateur: string;
  periode: string;
  provenance: Provenance;
  /** Résumé textuel du contenu graphique, porté par <desc> dans le SVG (pas de <text> dans le SVG). */
  resumeSvg: string;
  /** Élément SVG unique (carte ou graphique) ; reçoit role="img" et un titre/desc accessibles. */
  svg: ReactNode;
  tableau: { caption: string; colonnes: string[]; lignes: (string | number)[][] };
};

/**
 * Cadre de figure commun aux cartes et graphiques du dossier ZRU : SVG sans
 * texte incrusté, légende HTML (indicateur, période, les 7 champs de
 * provenance, confiance) et tableau de données équivalent replié dans un
 * <details>. Composant serveur uniquement (pas de hook, pas de gestionnaire
 * d'événement, pas de 'use client').
 */
export function FigureZru(p: FigureZruProps): ReactElement {
  const l = L[p.locale];
  const idTitre = `${p.idBase}-titre`;
  const svgIdTitre = `${p.idBase}-svg-titre`;
  const svgIdDesc = `${p.idBase}-svg-desc`;

  const svgSource = Children.only(p.svg);
  const svgAccessible = isValidElement<{ children?: ReactNode }>(svgSource)
    ? cloneElement(
        svgSource as ReactElement<Record<string, unknown>>,
        {
          role: 'img',
          'aria-labelledby': `${svgIdTitre} ${svgIdDesc}`,
          className: 'h-auto w-full',
        },
        <title id={svgIdTitre}>{p.titre}</title>,
        <desc id={svgIdDesc}>{p.resumeSvg}</desc>,
        (svgSource.props as { children?: ReactNode }).children,
      )
    : svgSource;

  const sourceMiseAJour = p.provenance.sourceMiseAJour?.trim();
  const sourceMiseAJourNode = sourceMiseAJour ? (
    <time dateTime={sourceMiseAJour}>{formatDate(sourceMiseAJour, p.locale)}</time>
  ) : (
    <span>{l.inconnue}</span>
  );

  return (
    <figure aria-labelledby={idTitre} className="my-8 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <div className="mb-3">
        <p id={idTitre} className="text-sm font-semibold text-neutral-900">
          {p.titre}
        </p>
        <p className="text-xs text-neutral-600">
          {p.indicateur}, {p.periode}
        </p>
      </div>

      {svgAccessible}

      <figcaption className="mt-3 text-xs leading-relaxed text-neutral-600">
        <span className="font-medium">
          {p.indicateur}, {p.periode}.
        </span>{' '}
        {l.source} :{' '}
        <a
          href={p.provenance.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-700 underline underline-offset-2 [overflow-wrap:anywhere] hover:text-brand-900"
        >
          {p.provenance.producteur}
        </a>{' '}
        ({l.miseAJour} : {sourceMiseAJourNode} ; {l.licence} : {p.provenance.licence}),{' '}
        {l.extrait} <time dateTime={p.provenance.extraitLe}>{formatDate(p.provenance.extraitLe, p.locale)}</time> ; {l.confiance}{' '}
        : {LIBELLES_CONFIANCE[p.locale][p.provenance.confiance]}.
        {p.provenance.modifications.length > 0 && (
          <>
            {' '}
            {l.modifs} : {p.provenance.modifications.join(' ; ')}.
          </>
        )}
      </figcaption>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-brand-700 underline">{l.donnees}</summary>
        <div role="region" aria-label={p.tableau.caption} tabIndex={0} className="mt-2 max-h-96 overflow-auto">
          <table className="w-full text-xs">
            <caption className="sr-only">{p.tableau.caption}</caption>
            <thead>
              <tr>
                {p.tableau.colonnes.map((c) => (
                  <th key={c} scope="col" className="px-2 py-1 text-left font-semibold text-neutral-700">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {p.tableau.lignes.map((r, i) => (
                <tr key={i} className="border-t border-neutral-200">
                  {r.map((c, j) => (
                    <td key={j} className="px-2 py-1 text-neutral-600">
                      {formaterCellule(c, p.locale)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
