// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLocale, useTranslations } from 'next-intl';
import { excerptSegments } from '@/lib/search-excerpt';
import { track } from '@/lib/analytics';
import {
  trancheResultats,
  typeDeResultat,
  type OrigineRecherche,
} from '@/lib/search-analytics';

/**
 * Délai pendant lequel un affichage de résultats doit rester stable avant
 * d'émettre `recherche-requete` : au-delà du débounce de 200 ms de la recherche,
 * pour ne pas mesurer un mot à moitié tapé. Fermer le dialogue ou cliquer un
 * résultat émet sans attendre.
 */
const DELAI_MESURE_REQUETE_MS = 1000;

interface SearchResult {
  url: string;
  meta: { title?: string };
  excerpt: string;
}

interface PagefindResult {
  id: string;
  data: () => Promise<SearchResult>;
}

const stripDiacritics = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Extrait rendu en texte React, `<mark>` seul conserve : voir src/lib/search-excerpt.ts. */
function Excerpt({ html }: { html: string }) {
  return (
    <>
      {excerptSegments(html).map((s, i) =>
        s.mark ? <mark key={i}>{s.text}</mark> : <span key={i}>{s.text}</span>,
      )}
    </>
  );
}

interface SearchProps {
  /**
   * `barre` : bouton libellé (barre de navigation large).
   * `icone` : loupe seule, cible de 44 × 44 px, pour l'entête mobile.
   */
  variante?: 'barre' | 'icone';
  /**
   * Écoute de Ctrl/Cmd+K. Une seule instance par page doit l'écouter : deux
   * instances montées ouvriraient deux dialogues au même raccourci.
   */
  raccourciClavier?: boolean;
}

export function Search({ variante = 'barre', raccourciClavier = true }: SearchProps = {}) {
  const t = useTranslations('search');
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isMac, setIsMac] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pagefind, setPagefind] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const etaitOuvert = useRef(false);

  // Mesure (src/lib/search-analytics.ts). Origine d'ouverture : déduite des
  // props, les trois instances de l'entête étant distinctes (barre large avec
  // raccourci, loupe mobile, bouton du menu mobile sans raccourci). Le
  // raccourci clavier l'écrase au moment où il ouvre.
  const origineBouton: OrigineRecherche =
    variante === 'icone' ? 'mobile' : raccourciClavier ? 'entete' : 'menu';
  const origineOuverture = useRef<OrigineRecherche>(origineBouton);
  // Nombre de résultats affichés pour la requête courante, `null` tant
  // qu'aucune recherche n'a abouti depuis l'ouverture. Jamais la requête.
  const affichageMesure = useRef<number | null>(null);
  const requeteMesuree = useRef(false);
  const minuterieMesure = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requeteCourante = useRef('');

  const emettreRequete = useCallback(() => {
    if (minuterieMesure.current) clearTimeout(minuterieMesure.current);
    minuterieMesure.current = null;
    if (requeteMesuree.current || affichageMesure.current === null) return;
    requeteMesuree.current = true;
    track('recherche-requete', {
      resultats: trancheResultats(affichageMesure.current),
      langue: locale,
    });
  }, [locale]);

  function ouvrirDepuisBouton() {
    origineOuverture.current = origineBouton;
    setOpen(true);
  }

  useEffect(() => {
    // Lecture d'une API navigateur au montage : la valeur ne peut pas être
    // connue au rendu serveur, donc l'effet est ici le seul point d'entrée.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMac(navigator.platform.toUpperCase().includes('MAC'));
  }, []);

  useEffect(() => {
    if (open && !pagefind) {
      // @ts-expect-error -- pagefind is generated at build time, no TS declarations
      import(/* webpackIgnore: true */ '/pagefind/pagefind.js')
        .then((pf) => {
          pf.init();
          setPagefind(pf);
        })
        .catch(() => {
          // Pagefind not available (dev mode or not yet indexed)
        });
    }
  }, [open, pagefind]);

  useEffect(() => {
    if (open && !etaitOuvert.current) {
      affichageMesure.current = null;
      requeteMesuree.current = false;
      track('recherche-ouverte', { origine: origineOuverture.current });
    } else if (!open && etaitOuvert.current) {
      // Fermeture avant la fin du délai : la requête affichée compte quand même.
      emettreRequete();
    }
    if (open) {
      inputRef.current?.focus();
    } else if (etaitOuvert.current) {
      // À la fermeture, le dialogue disparaît avec le focus : le rendre au
      // bouton qui l'a ouvert, sauf si l'utilisateur l'a déjà posé ailleurs.
      const actif = document.activeElement;
      if (!actif || actif === document.body) triggerRef.current?.focus();
    }
    etaitOuvert.current = open;
  }, [open, emettreRequete]);

  useEffect(
    () => () => {
      if (minuterieMesure.current) clearTimeout(minuterieMesure.current);
    },
    [],
  );

  const search = useCallback(
    async (term: string) => {
      requeteCourante.current = term;
      if (!pagefind || !term.trim()) {
        setResults([]);
        affichageMesure.current = null;
        if (minuterieMesure.current) clearTimeout(minuterieMesure.current);
        minuterieMesure.current = null;
        return;
      }

      const normalized = stripDiacritics(term);
      const queries =
        normalized !== term
          ? [pagefind.search(term), pagefind.search(normalized)]
          : [pagefind.search(term)];

      const responses = await Promise.all(queries);
      const allResults: PagefindResult[] = responses.flatMap(
        (r: { results: PagefindResult[] }) => r.results,
      );

      // Deduplicate by ID, keep first (best score)
      const seen = new Set<string>();
      const unique = allResults.filter((r) => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });

      const data: SearchResult[] = await Promise.all(
        unique.slice(0, 8).map((r) => r.data()),
      );
      // Filter to current locale
      const filtered = data
        .filter((r: SearchResult) => r.url.includes(`/${locale}/`))
        .map((r: SearchResult) => ({ ...r, url: r.url.replace(/\.html$/, '') }));
      setResults(filtered);

      // Réponse périmée (la saisie a changé entre-temps) : pas de mesure.
      if (term !== requeteCourante.current) return;
      affichageMesure.current = filtered.length;
      if (minuterieMesure.current) clearTimeout(minuterieMesure.current);
      minuterieMesure.current = setTimeout(emettreRequete, DELAI_MESURE_REQUETE_MS);
    },
    [pagefind, locale, emettreRequete],
  );

  useEffect(() => {
    const timer = setTimeout(() => search(query), 200);
    return () => clearTimeout(timer);
  }, [query, search]);

  // Keyboard shortcut: Ctrl/Cmd+K
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (raccourciClavier && (e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        origineOuverture.current = 'raccourci';
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [raccourciClavier]);

  function handleDialogKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'input, button, a[href]',
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      {variante === 'icone' ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={ouvrirDepuisBouton}
          className="inline-flex h-11 w-11 items-center justify-center rounded-md text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          aria-label={t('open')}
          aria-haspopup="dialog"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          onClick={ouvrirDepuisBouton}
          className="inline-flex items-center gap-1.5 rounded-md border border-neutral-500 bg-neutral-50 px-2.5 py-1 text-xs text-neutral-500 transition-colors hover:bg-neutral-100"
          aria-label={t('placeholder')}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <span className="hidden sm:inline">{t('placeholder')}</span>
          <kbd className="hidden rounded border border-neutral-300 px-1 font-mono text-[10px] sm:inline" suppressHydrationWarning>
            {isMac ? '\u2318' : 'Ctrl+'}K
          </kbd>
        </button>
      )}

      {/* Portail vers <body> : l'entête porte `backdrop-blur`, et un
          `backdrop-filter` crée un bloc conteneur pour les descendants
          `position: fixed`. Rendu sur place, `inset-0` se calerait sur
          l'entête au lieu de la fenêtre — le dialogue s'affichait alors
          dans le menu mobile, rogné (bug iOS Brave). */}
      {open && createPortal(
        <div
          ref={dialogRef}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[15vh]"
          role="dialog"
          aria-modal="true"
          aria-label={t('placeholder')}
          onKeyDown={handleDialogKeyDown}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-lg rounded-lg bg-neutral-50 shadow-2xl">
            <div className="flex items-center border-b border-neutral-200 px-4">
              <svg className="mr-2 h-4 w-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <label htmlFor="search-input" className="sr-only">{t('placeholder')}</label>
              <input
                ref={inputRef}
                id="search-input"
                type="text"
                role="combobox"
                aria-expanded={results.length > 0}
                aria-controls="search-results"
                aria-autocomplete="list"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('placeholder')}
                className="flex-1 border-none py-3 text-base text-neutral-900 placeholder:text-neutral-500 sm:text-sm"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-[24px] min-w-[24px] rounded border border-neutral-500 px-2 py-1 text-[10px] text-neutral-500"
                aria-label={t('close')}
              >
                ESC
              </button>
            </div>

            <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
              {query.trim() && pagefind
                ? results.length > 0
                  ? `${results.length} ${results.length === 1 ? t('result') : t('results')}`
                  : t('noResults')
                : ''}
            </div>

            {query.trim() && results.length > 0 && (
              <ul id="search-results" role="listbox" className="max-h-80 overflow-y-auto p-2">
                {results.map((result, i) => (
                  <li key={i} role="option" aria-selected={false}>
                    <a
                      href={result.url}
                      onClick={() => {
                        emettreRequete();
                        track('recherche-clic', { rang: i + 1, type: typeDeResultat(result.url) });
                        setOpen(false);
                      }}
                      className="block rounded-md px-3 py-2 hover:bg-neutral-100"
                    >
                      <p className="text-sm font-medium text-neutral-900">
                        {result.meta.title || result.url}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        <Excerpt html={result.excerpt} />
                      </p>
                    </a>
                  </li>
                ))}
              </ul>
            )}

            {query.trim() && results.length === 0 && pagefind && (
              <div className="p-6 text-center text-sm text-neutral-500">
                {t('noResults')}
              </div>
            )}

            {!pagefind && query.trim() && (
              <div className="p-6 text-center text-sm text-neutral-500">
                {t('loading')}
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
