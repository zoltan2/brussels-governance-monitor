// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { EXPLAINER_LAST_MODIFIED, SITE_LAUNCH_DATE, getExplainerLastModified } from '../explainer-dates';

const EXPLAINERS_DIR = join(__dirname, '../../app/[locale]/explainers');

function routesReellesSurDisque(): string[] {
  return readdirSync(EXPLAINERS_DIR).filter((entry) =>
    statSync(join(EXPLAINERS_DIR, entry)).isDirectory(),
  );
}

describe('EXPLAINER_LAST_MODIFIED', () => {
  // Garde-fou explicitement demandé : sans lui, la table pourrit en silence
  // dès qu'une route src/app/[locale]/explainers/<slug>/ est ajoutée sans
  // qu'on pense à documenter sa date ici — elle recevrait alors une date par
  // défaut invisible (SITE_LAUNCH_DATE) sans qu'un test ne le remarque.
  it('a une entrée pour chaque route réellement présente sous src/app/[locale]/explainers/', () => {
    const routes = routesReellesSurDisque();
    expect(routes.length).toBeGreaterThan(0);
    const manquantes = routes.filter((slug) => !(slug in EXPLAINER_LAST_MODIFIED));
    expect(manquantes).toEqual([]);
  });

  it("ne garde pas d'entrée pour une route qui n'existe plus (table à jour dans les deux sens)", () => {
    const routes = new Set(routesReellesSurDisque());
    const perimees = Object.keys(EXPLAINER_LAST_MODIFIED).filter((slug) => !routes.has(slug));
    expect(perimees).toEqual([]);
  });

  it('donne une date ISO valide (YYYY-MM-DD) pour chaque entrée', () => {
    for (const [slug, date] of Object.entries(EXPLAINER_LAST_MODIFIED)) {
      expect(date, `date de ${slug}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("garde la réécriture connue du paradoxe bruxellois (19/09/2026), distincte du lancement", () => {
    expect(EXPLAINER_LAST_MODIFIED['brussels-paradox']).toBe('2026-09-19');
    expect(EXPLAINER_LAST_MODIFIED['brussels-paradox']).not.toBe(SITE_LAUNCH_DATE);
  });
});

describe('getExplainerLastModified', () => {
  it('renvoie la date connue pour une route seedée', () => {
    expect(getExplainerLastModified('brussels-paradox').toISOString()).toContain('2026-09-19');
  });

  it("lève pour une route absente de la table, plutôt que de deviner une date", () => {
    expect(() => getExplainerLastModified('route-inexistante-xyz')).toThrow();
  });
});
