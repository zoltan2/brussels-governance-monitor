// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Une même source citée deux fois dans le `sources:` d'une fiche.
 *
 * #547 (22/09/2026) a retiré un doublon sur `data-centers-ia-energie`, sans
 * garde. Six jours plus tard, 14 fichiers portaient 21 URL en double (revue
 * orange), par exemple le même article de La Libre du 22/08 sous deux
 * libellés dans `domain-cards/institutional.*`, ajouté par deux veilles
 * successives. Le compte de sources affiché est gonflé, et deux libellés
 * divergent pour une même source.
 *
 * Deux URL sont la même source si elles coïncident après normalisation : sans
 * paramètres `utm_*`, sans fragment, sans barre oblique finale, schéma et hôte
 * en minuscules. Le reste de l'URL est gardé tel quel : deux pages d'un même
 * site restent deux sources.
 *
 * Module pur, sans accès disque.
 */

export function normalizeSourceUrl(url: string): string {
  const raw = url.trim();
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    // URL illisible : Velite la refusera ; on compare le texte brut sans fragment.
    return raw.replace(/#.*$/, '').replace(/\/+$/, '');
  }
  u.hash = '';
  for (const key of [...u.searchParams.keys()]) {
    if (key.toLowerCase().startsWith('utm_')) u.searchParams.delete(key);
  }
  let out = u.toString();
  // `URL` garde un « ? » vide quand on a retiré tous les paramètres.
  out = out.replace(/\?$/, '');
  return out.replace(/\/+$/, '');
}

export interface DuplicateSource {
  /** URL normalisée. */
  url: string;
  /** Libellés des entrées concernées, dans l'ordre du fichier. */
  labels: string[];
}

/** Sources citées plus d'une fois, ou [] si aucune. Lit `url` et `label` de chaque entrée. */
export function findDuplicateSources(sources: unknown): DuplicateSource[] {
  if (!Array.isArray(sources)) return [];
  const byUrl = new Map<string, string[]>();
  for (const s of sources) {
    if (!s || typeof s !== 'object') continue;
    const { url, label } = s as { url?: unknown; label?: unknown };
    if (typeof url !== 'string' || !url.trim()) continue;
    const key = normalizeSourceUrl(url);
    const labels = byUrl.get(key) ?? [];
    labels.push(typeof label === 'string' ? label : '(sans libellé)');
    byUrl.set(key, labels);
  }
  return [...byUrl.entries()].filter(([, labels]) => labels.length > 1).map(([url, labels]) => ({ url, labels }));
}
