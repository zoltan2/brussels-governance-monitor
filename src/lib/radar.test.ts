// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Le lien « voir la fiche » d'un signal radar doit suivre le VRAI type de la
 * fiche promue, jamais un défaut. Jusqu'au 24/09/2026,
 * `signal.promotedSection ?? 'domains'` envoyait 23 signaux — dont
 * `promotedTo` pointait en réalité vers un dossier ou une commune — vers
 * /domaines/<slug>, une page inexistante (404 vus dans les logs d'accès de
 * production, navigateurs et robots d'indexation confondus).
 *
 * Tests purs : `resolvePromotedSection`/`resolvePromotedLink` prennent leurs
 * ensembles de slugs en argument, sans dépendre de Velite ni de data/radar.json.
 */
import { describe, expect, it } from 'vitest';
import {
  resolvePromotedSection,
  resolvePromotedLink,
  type PromotionSlugSets,
} from './radar';

const SLUG_SETS: PromotionSlugSets = {
  domains: new Set(['mobility', 'education']),
  dossiers: new Set(['faillites-a-bruxelles', 'metro-3']),
  communes: new Set(['bruxelles-ville']),
  sectors: new Set(['education']),
};

describe('resolvePromotedSection', () => {
  it('résout un domaine quand promotedSection est absent et que la fiche est un domaine', () => {
    expect(resolvePromotedSection('mobility', undefined, SLUG_SETS)).toBe('domains');
  });

  it('résout un dossier quand promotedSection est absent — LE BUG DU 24/09/2026 : ne doit JAMAIS retomber sur "domains" pour une fiche qui ne l’est pas', () => {
    expect(resolvePromotedSection('faillites-a-bruxelles', undefined, SLUG_SETS)).toBe('dossiers');
  });

  it('résout une commune quand promotedSection est absent', () => {
    expect(resolvePromotedSection('bruxelles-ville', undefined, SLUG_SETS)).toBe('communes');
  });

  it('résout un dossier même via un autre id de dossier', () => {
    expect(resolvePromotedSection('metro-3', undefined, SLUG_SETS)).toBe('dossiers');
  });

  it('respecte un promotedSection déclaré et valide, même si le slug existe aussi ailleurs', () => {
    // "education" existe à la fois comme domaine et comme secteur : le
    // promotedSection explicite et valide n'est jamais écrasé.
    expect(resolvePromotedSection('education', 'sectors', SLUG_SETS)).toBe('sectors');
    expect(resolvePromotedSection('education', 'domains', SLUG_SETS)).toBe('domains');
  });

  it('CONTRADICTION : un promotedSection déclaré qui ne correspond à aucune fiche est écarté au profit du vrai type', () => {
    // "faillites-a-bruxelles" n'existe QUE comme dossier ; promotedSection:
    // "domains" est donc invalide et ne doit pas gagner.
    expect(resolvePromotedSection('faillites-a-bruxelles', 'domains', SLUG_SETS)).toBe('dossiers');
  });

  it('slug inconnu : rend null, jamais une section par défaut', () => {
    expect(resolvePromotedSection('cette-fiche-n-existe-pas', undefined, SLUG_SETS)).toBeNull();
    expect(resolvePromotedSection('cette-fiche-n-existe-pas', 'domains', SLUG_SETS)).toBeNull();
  });

  it('promotedTo absent ou vide : rend null', () => {
    expect(resolvePromotedSection(null, 'domains', SLUG_SETS)).toBeNull();
    expect(resolvePromotedSection(undefined, 'domains', SLUG_SETS)).toBeNull();
  });
});

describe('resolvePromotedLink', () => {
  it('rend {section, slug} pour une fiche existante', () => {
    expect(resolvePromotedLink('faillites-a-bruxelles', undefined, SLUG_SETS)).toEqual({
      section: 'dossiers',
      slug: 'faillites-a-bruxelles',
    });
  });

  it('rend null — jamais un lien — quand le slug ne correspond à aucune fiche', () => {
    expect(resolvePromotedLink('cette-fiche-n-existe-pas', undefined, SLUG_SETS)).toBeNull();
  });

  it('rend null quand promotedTo est null', () => {
    expect(resolvePromotedLink(null, undefined, SLUG_SETS)).toBeNull();
  });

  /**
   * PREUVE DE MUTATION : si `resolvePromotedLink`/`resolvePromotedSection`
   * régressait vers `promotedSection ?? 'domains'` (en ignorant les
   * collections réelles), ce test échouerait — la fiche "faillites-a-bruxelles"
   * n'existe pas dans `domains` mais UNIQUEMENT dans `dossiers`.
   */
  it('mutation : ne dégénère jamais vers "domains" par défaut pour une fiche qui n’y est pas', () => {
    const link = resolvePromotedLink('faillites-a-bruxelles', undefined, SLUG_SETS);
    expect(link?.section).not.toBe('domains');
    expect(link?.section).toBe('dossiers');
  });
});
