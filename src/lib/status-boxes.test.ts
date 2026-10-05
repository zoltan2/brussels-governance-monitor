// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkStatusBoxes, pickStatusBox } from './status-boxes';

describe('pickStatusBox', () => {
  it('préfère le texte de la fiche à celui des messages', () => {
    expect(pickStatusBox('Accord du 4 octobre 2026.', 'Vote prévu avant le 1er avril.')).toBe('Accord du 4 octobre 2026.');
  });

  it('retombe sur les messages tant que la fiche ne porte rien, ou porte du vide', () => {
    expect(pickStatusBox(undefined, 'ancien texte')).toBe('ancien texte');
    expect(pickStatusBox('   ', 'ancien texte')).toBe('ancien texte');
  });
});

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

  it('laisse passer, en le disant, une fiche pas encore migrée, et dispense un brouillon', () => {
    const r = checkStatusBoxes({ lastModified: '2026-10-05', statusReviewed: undefined });
    expect(r.verdict).toBe('legacy');
    expect(checkStatusBoxes({ ...boxes, lastModified: '2026-10-05', statusReviewed: undefined, draft: true }).verdict).toBe('draft');
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

  it('la page domaine lit les encadrés par pickStatusBox, plus directement dans les messages', () => {
    const page = fs.readFileSync(path.join(root, 'src/app/[locale]/domains/[slug]/page.tsx'), 'utf8');
    expect(page).toContain('pickStatusBox(card.whyStatus');
    expect(page).toContain('pickStatusBox(card.concreteImpact');
  });

  it('la fiche budget porte ses encadrés et leur attestation dans les quatre langues', () => {
    for (const locale of ['fr', 'nl', 'en', 'de']) {
      const fiche = fs.readFileSync(path.join(root, `content/domain-cards/budget.${locale}.mdx`), 'utf8');
      const fm = fiche.slice(0, fiche.indexOf('\n---\n', 4));
      expect(fm, locale).toMatch(/^whyStatus: ".+"$/m);
      expect(fm, locale).toMatch(/^concreteImpact: ".+"$/m);
      expect(fm, locale).toMatch(/^statusReviewed: "\d{4}-\d{2}-\d{2}"$/m);
    }
  });
});
