// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkStatusBoxes } from './status-boxes';

describe('checkStatusBoxes', () => {
  const boxes = { whyStatus: 'Pourquoi.', concreteImpact: 'Concrètement.' };

  it("refuse la situation du 5 octobre 2026 : fiche republiée, encadrés non relus depuis la veille précédente", () => {
    const r = checkStatusBoxes({ ...boxes, lastModified: '2026-10-05', statusReviewed: '2026-10-02' });
    expect(r.verdict).toBe('stale');
    expect(r.reason).toContain('statusReviewed');
  });

  it('accepte une relecture du jour de la republication', () => {
    expect(checkStatusBoxes({ ...boxes, lastModified: '2026-10-05', statusReviewed: '2026-10-05' }).verdict).toBe('ok');
  });

  it("exige l'attestation dès que la fiche porte les encadrés", () => {
    expect(checkStatusBoxes({ ...boxes, lastModified: '2026-10-05', statusReviewed: undefined }).verdict).toBe('missing');
    expect(checkStatusBoxes({ ...boxes, lastModified: '2026-10-05', statusReviewed: '05/10/2026' }).verdict).toBe('unparsable');
  });

  it('refuse un seul encadré sur deux : la page afficherait un texte du jour et un de mars', () => {
    expect(checkStatusBoxes({ whyStatus: 'Pourquoi.', lastModified: '2026-10-05', statusReviewed: '2026-10-05' }).verdict).toBe('incomplete');
  });

  it('refuse une fiche domaine sans encadrés : la page ne dirait plus pourquoi ce statut', () => {
    const r = checkStatusBoxes({ lastModified: '2026-10-05', statusReviewed: undefined });
    expect(r.verdict).toBe('absent');
    expect(r.reason).toContain('whyStatus');
  });

  it('dispense un brouillon', () => {
    expect(checkStatusBoxes({ ...boxes, lastModified: '2026-10-05', statusReviewed: undefined, draft: true }).verdict).toBe('draft');
    expect(checkStatusBoxes({ lastModified: '2026-10-05', statusReviewed: undefined, draft: true }).verdict).toBe('draft');
  });
});

describe('câblage', () => {
  const root = process.cwd();

  it('le schéma Velite des fiches domaine déclare les trois champs (sinon Velite les retire)', () => {
    const config = fs.readFileSync(path.join(root, 'velite.config.ts'), 'utf8');
    const domain = config.slice(config.indexOf("name: 'DomainCard'"), config.indexOf("name: 'SolutionCard'"));
    expect(domain).toMatch(/whyStatus: s\.string\(\)\.max\(\d+\)\.optional\(\)/);
    expect(domain).toMatch(/concreteImpact: s\.string\(\)\.max\(\d+\)\.optional\(\)/);
    expect(domain).toMatch(/statusReviewed: s\.isodate\(\)\.optional\(\)/);
  });

  it('la page domaine lit les encadrés dans la fiche, plus dans les messages', () => {
    const page = fs.readFileSync(path.join(root, 'src/app/[locale]/domains/[slug]/page.tsx'), 'utf8');
    expect(page).toContain('card.whyStatus');
    expect(page).toContain('card.concreteImpact');
    expect(page).not.toMatch(/t\(`whyStatus\./);
    expect(page).not.toMatch(/t\(`concreteImpact\./);
  });

  it('les anciens textes ne vivent plus dans messages/*.json, seuls les titres des encadrés y restent', () => {
    for (const locale of ['fr', 'nl', 'en', 'de']) {
      const domains = JSON.parse(fs.readFileSync(path.join(root, `messages/${locale}.json`), 'utf8')).domains;
      expect(domains.whyStatus, locale).toBeUndefined();
      expect(domains.concreteImpact, locale).toBeUndefined();
      expect(typeof domains.whyStatusTitle, locale).toBe('string');
      expect(typeof domains.concreteImpactTitle, locale).toBe('string');
    }
  });

  it('chaque fiche domaine porte ses deux encadrés et leur attestation, dans chaque langue', () => {
    const dir = path.join(root, 'content/domain-cards');
    const fiches = fs.readdirSync(dir).filter((n) => n.endsWith('.mdx'));
    expect(fiches.length).toBeGreaterThanOrEqual(52);
    for (const name of fiches) {
      const fiche = fs.readFileSync(path.join(dir, name), 'utf8');
      const fm = fiche.slice(0, fiche.indexOf('\n---\n', 4));
      expect(fm, name).toMatch(/^whyStatus: ".+"$/m);
      expect(fm, name).toMatch(/^concreteImpact: ".+"$/m);
      expect(fm, name).toMatch(/^statusReviewed: "\d{4}-\d{2}-\d{2}"$/m);
    }
  });
});
