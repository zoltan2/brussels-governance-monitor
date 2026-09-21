// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import {
  getVerification,
  getVerificationLocales,
  getVerificationSlugs,
} from './content';

/**
 * La collection `verifications` existait depuis février 2026 sans aucune route :
 * ses douze fiches répondaient 404. En l'ouvrant le 21/09/2026, deux défauts
 * latents sont apparus, et ce sont eux que ces tests verrouillent.
 */
describe('identifiant de vérification', () => {
  /**
   * DÉFAUT 1. `s.isodate()` rend un horodatage complet, pas une date. Le
   * `permalink` calculé au schéma valait donc
   * `/verifications/budget-2026-02-08T00:00:00.000Z` : il n'a jamais été une
   * URL utilisable, ce qui est resté invisible tant que rien ne le servait.
   */
  it("ne garde que la date, jamais l'heure ni le fuseau", () => {
    for (const slug of getVerificationSlugs('fr')) {
      expect(slug, `${slug} porte un horodatage`).not.toContain('T00:00:00');
      expect(slug).toMatch(/^[a-z-]+-\d{4}-\d{2}-\d{2}$/);
    }
  });

  /**
   * DÉFAUT 2. Le champ `slug` du frontmatter est incohérent :
   * `social-2026-03-12.{de,en,nl}.mdx` porte un suffixe de langue que le
   * français et tous les `budget-*` n'ont pas. L'identifiant étant dérivé de
   * `cardSlug` + `date`, les quatre langues d'une même vérification partagent
   * le même, et sont donc alternates les unes des autres.
   */
  it('est le même dans toutes les langues d’une même vérification', () => {
    expect(getVerificationLocales('social-2026-03-12').sort()).toEqual(['de', 'en', 'fr', 'nl']);
    expect(getVerificationLocales('budget-2026-03-06').sort()).toEqual(['de', 'en', 'fr', 'nl']);
  });

  it('ne déclare que les langues réellement traduites', () => {
    // Ces deux fiches n'existent qu'en français et en néerlandais. Déclarer
    // l'anglais ou l'allemand produirait un hreflang vers une 404.
    expect(getVerificationLocales('budget-2026-02-08').sort()).toEqual(['fr', 'nl']);
    expect(getVerificationLocales('social-2026-02-08').sort()).toEqual(['fr', 'nl']);
  });
});

describe('lecture d’une vérification', () => {
  it('rend la fiche dans la langue demandée', () => {
    const fr = getVerification('budget-2026-03-06', 'fr');
    expect(fr?.locale).toBe('fr');
    expect(fr?.cardSlug).toBe('budget');
    expect(fr?.cardType).toBe('domain');
  });

  /**
   * PAS DE REPLI SUR LE FRANÇAIS, contrairement aux autres accesseurs du
   * fichier. Sur un registre de contrôle, la langue du texte engage la lecture
   * des sources : mieux vaut un 404 franc que du français sous drapeau anglais.
   */
  it('rend null plutôt que du français quand la traduction manque', () => {
    expect(getVerification('budget-2026-02-08', 'en')).toBeNull();
    expect(getVerification('budget-2026-02-08', 'de')).toBeNull();
    expect(getVerification('budget-2026-02-08', 'nl')?.locale).toBe('nl');
  });

  it('rend null sur un identifiant inconnu', () => {
    expect(getVerification('inexistant-2026-01-01', 'fr')).toBeNull();
  });

  it('ne liste que les identifiants disponibles dans la locale', () => {
    const en = getVerificationSlugs('en');
    expect(en).not.toContain('budget-2026-02-08');
    expect(en).toContain('budget-2026-03-06');
  });
});
