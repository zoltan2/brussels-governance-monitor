// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import config from '../../velite.config';

/**
 * `lastVerified` et `verificationIntervalDays` au schéma Velite des dossiers et
 * des fiches domaine. Le test lit le vrai schéma (velite.config.ts), pas une
 * copie : une collection qui perd le champ fait échouer ici.
 *
 * ⚑ Velite ne bloque pas le build sur une erreur de schéma (il la signale et
 * publie quand même, voir src/lib/summary-length.ts) : ce test vérifie ce que
 * le schéma accepte ; le blocage réel vient du lint verification-overdue.
 */

interface ChampZod {
  safeParse(v: unknown): { success: boolean; data?: unknown };
}

function champs(collection: 'dossierCards' | 'domainCards'): Record<string, ChampZod> {
  const schema = (config.collections as unknown as Record<string, { schema: unknown }>)[collection].schema as {
    innerType?: () => { shape: Record<string, ChampZod> };
    shape?: Record<string, ChampZod>;
  };
  const shape = schema.innerType ? schema.innerType().shape : schema.shape;
  if (!shape) throw new Error(`schéma de ${collection} illisible`);
  return shape;
}

describe.each(['dossierCards', 'domainCards'] as const)('schéma %s', (collection) => {
  const { lastVerified, verificationIntervalDays } = champs(collection);

  it('déclare les deux champs', () => {
    expect(lastVerified).toBeDefined();
    expect(verificationIntervalDays).toBeDefined();
  });

  it('accepte un jour AAAA-MM-JJ et le garde tel quel (pas d’horodatage)', () => {
    const r = lastVerified.safeParse('2026-09-20');
    expect(r.success).toBe(true);
    expect(r.data).toBe('2026-09-20');
  });

  it('accepte l’absence : aucune fiche n’est pré-remplie', () => {
    expect(lastVerified.safeParse(undefined).success).toBe(true);
    expect(verificationIntervalDays.safeParse(undefined).success).toBe(true);
  });

  it('refuse un horodatage, un format local, un jour inexistant, sans lever', () => {
    for (const v of ['2026-09-20T00:00:00.000Z', '20/09/2026', '2026-02-30', '2026-13-45', '']) {
      expect(lastVerified.safeParse(v).success, v).toBe(false);
    }
  });

  it('accepte un intervalle entier positif, refuse zéro, négatif, décimal, texte, plus de deux ans', () => {
    expect(verificationIntervalDays.safeParse(90).success).toBe(true);
    for (const v of [0, -30, 1.5, '90', 731]) {
      expect(verificationIntervalDays.safeParse(v).success, String(v)).toBe(false);
    }
  });
});
