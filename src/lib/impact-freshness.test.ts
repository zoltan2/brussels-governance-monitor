// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkImpactFreshness } from './impact-freshness';

describe('checkImpactFreshness', () => {
  it("refuse la fiche education republiée le 27/09 sans relecture de l'impact (#609, corrigé par #619)", () => {
    const r = checkImpactFreshness({ lastModified: '2026-09-27', impactReviewed: undefined, today: '2026-09-28' });
    expect(r.verdict).toBe('missing');
    for (const champ of ['title', 'humanImpact', 'activeMechanisms']) expect(r.reason).toContain(champ);
  });

  it("refuse une relecture d'avril sur une fiche republiée fin septembre", () => {
    const r = checkImpactFreshness({ lastModified: '2026-09-27', impactReviewed: '2026-04-15', today: '2026-09-28' });
    expect(r.verdict).toBe('stale');
    expect(r.reason).toContain('impactReviewed');
  });

  it('accepte une relecture de moins de 90 jours, et pile 90 jours', () => {
    expect(checkImpactFreshness({ lastModified: '2026-09-27', impactReviewed: '2026-09-27', today: '2026-09-28' }).verdict).toBe('ok');
    expect(checkImpactFreshness({ lastModified: '2026-09-27', impactReviewed: '2026-06-29', today: '2026-09-28' }).verdict).toBe('ok');
    expect(checkImpactFreshness({ lastModified: '2026-09-27', impactReviewed: '2026-06-28', today: '2026-09-28' }).verdict).toBe('stale');
  });

  it('refuse une date future ou illisible, et dispense un brouillon', () => {
    expect(checkImpactFreshness({ lastModified: '2026-09-27', impactReviewed: '2026-10-01', today: '2026-09-28' }).verdict).toBe('future');
    expect(checkImpactFreshness({ lastModified: '2026-09-27', impactReviewed: '27/09/2026' }).verdict).toBe('unparsable');
    expect(checkImpactFreshness({ lastModified: '2026-09-27', impactReviewed: undefined, draft: true }).verdict).toBe('draft');
  });

  it('le schéma Velite des fiches secteur déclare impactReviewed (sinon Velite retire le champ)', () => {
    const config = fs.readFileSync(path.join(process.cwd(), 'velite.config.ts'), 'utf8');
    const sector = config.slice(config.indexOf("name: 'SectorCard'"), config.indexOf("name: 'CommuneCard'"));
    expect(sector).toMatch(/impactReviewed: s\.isodate\(\)\.optional\(\)/);
  });
});
