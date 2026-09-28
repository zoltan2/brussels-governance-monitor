// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Reduit un rapport de violation CSP a ce qui sert a diagnostiquer, sans
 * donnee personnelle. Utilise par `src/app/api/csp-report/route.ts`.
 *
 * Deux formats arrivent :
 *  - `report-uri` (ancien, encore le seul de Firefox) : `{"csp-report": {...}}`,
 *    cles en kebab-case ;
 *  - `report-to` (Reporting API, Chromium) : tableau de `{type, body}`, cles en
 *    camelCase.
 *
 * Ce qui est garde : la directive, la ressource bloquee reduite a son ORIGINE
 * (ou au mot-cle `inline`, `eval`...), la page reduite a son CHEMIN (sans la
 * chaine de requete, qui peut porter un jeton d'abonne ou de desinscription),
 * le fichier source reduit a son chemin, la ligne. Chaque champ est tronque.
 */

export interface ResumeCsp {
  directive: string;
  bloque: string;
  page: string;
  source?: string;
  ligne?: number;
  disposition?: string;
}

const MAX_RAPPORTS = 5;
const MAX_CHAMP = 200;

function texte(v: unknown): string {
  return typeof v === 'string' ? v.slice(0, MAX_CHAMP) : '';
}

/** Chemin seul, sans requete ni fragment ; `?` si ce n'est pas une URL. */
function cheminSeul(v: unknown): string {
  const s = texte(v);
  if (!s) return '';
  const u = URL.parse(s);
  return u ? `${u.origin}${u.pathname}`.slice(0, MAX_CHAMP) : '?';
}

/** Origine seule pour une URL ; le mot-cle tel quel (`inline`, `eval`, `data`...). */
function origineSeule(v: unknown): string {
  const s = texte(v);
  if (!s) return '';
  const u = URL.parse(s);
  if (!u) return s.replace(/[^a-z-]/gi, '').slice(0, 40);
  return u.origin === 'null' ? `${u.protocol}` : u.origin;
}

function resumer(r: Record<string, unknown>): ResumeCsp | null {
  const directive = texte(r['effectiveDirective'] ?? r['effective-directive'] ?? r['violated-directive']);
  if (!directive) return null;
  const ligne = r['lineNumber'] ?? r['line-number'];
  return {
    directive: directive.split(' ')[0],
    bloque: origineSeule(r['blockedURL'] ?? r['blocked-uri']),
    page: cheminSeul(r['documentURL'] ?? r['document-uri']),
    source: cheminSeul(r['sourceFile'] ?? r['source-file']) || undefined,
    ligne: typeof ligne === 'number' && Number.isFinite(ligne) ? ligne : undefined,
    disposition: texte(r['disposition']) || undefined,
  };
}

function objet(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

export function resumerRapportsCsp(corps: string): ResumeCsp[] {
  let brut: unknown;
  try {
    brut = JSON.parse(corps);
  } catch {
    return [];
  }

  const candidats: Record<string, unknown>[] = [];
  if (Array.isArray(brut)) {
    for (const entree of brut.slice(0, MAX_RAPPORTS)) {
      const e = objet(entree);
      if (e?.type !== 'csp-violation') continue;
      const corpsRapport = objet(e.body);
      if (corpsRapport) candidats.push(corpsRapport);
    }
  } else {
    const ancien = objet(objet(brut)?.['csp-report']);
    if (ancien) candidats.push(ancien);
  }

  return candidats.map(resumer).filter((r): r is ResumeCsp => r !== null);
}
