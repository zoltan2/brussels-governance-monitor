// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Ce test verrouille ce qu'aucun test fonctionnel ne voit : l'apparence des
 * vignettes. Huit tables recopiées avaient dérivé en quatre apparences sans
 * qu'une seule page cesse de fonctionner. Un test qui compare des CLASSES est
 * le seul filet pour ce genre de perte.
 */

import { describe, expect, it } from 'vitest';
import {
  statusBadgeClass,
  domainBadgeClass,
  dossierBadgeClass,
  commitmentBadgeClass,
  DOMAIN_STATUS_ROLE,
  DOSSIER_PHASE_ROLE,
  COMMITMENT_STATUS_ROLE,
  type BadgeRole,
} from './status-badge';

const ROLES: BadgeRole[] = ['ongoing', 'resolved', 'blocked', 'delayed', 'brand', 'neutral'];

describe('statusBadgeClass', () => {
  it('donne toujours une épaisseur de bordure avec une couleur de bordure', () => {
    // domain-hub-nav appliquait border-status-* sans la classe `border` :
    // le contour y était invisible. La base doit porter les deux.
    for (const role of ROLES) {
      const classes = statusBadgeClass(role).split(' ');
      expect(classes).toContain('border');
      expect(classes.some((c) => c.startsWith('border-'))).toBe(true);
    }
  });

  it("n'emploie aucun aplat de couleur", () => {
    // L'aplat est le traitement écarté : huit « En cours » d'affilée en pavés
    // pleins passent devant les titres qu'ils qualifient.
    for (const role of ROLES) {
      expect(statusBadgeClass(role)).not.toMatch(/\bbg-/);
    }
  });

  it('reste dans la palette : ni rouge, ni vert, ni couleur brute hors jetons', () => {
    const interdits = /\b(?:border|text)-(red|green|emerald|rose|indigo|orange|violet|lime|cyan|fuchsia|sky|stone|teal|amber|slate)-/;
    for (const role of ROLES) {
      expect(statusBadgeClass(role)).not.toMatch(interdits);
    }
  });

  it('distingue les quatre tailles reprises des sites d’appel', () => {
    const tailles = ['xs', 'sm', 'md', 'lg'] as const;
    const rendus = tailles.map((t) => statusBadgeClass('ongoing', t));
    expect(new Set(rendus).size).toBe(4);
    expect(statusBadgeClass('ongoing', 'lg')).toContain('text-sm');
    expect(statusBadgeClass('ongoing', 'xs')).toContain('text-[10px]');
  });

  it('donne une apparence identique à un même rôle, quel que soit le vocabulaire', () => {
    // Le cœur de la refonte : « en cours » d'un domaine et « en cours » d'un
    // dossier sont deux valeurs de deux vocabulaires, mais un seul rôle.
    expect(domainBadgeClass('ongoing', 'sm')).toBe(dossierBadgeClass('in-progress', 'sm'));
    expect(domainBadgeClass('resolved', 'sm')).toBe(dossierBadgeClass('completed', 'sm'));
    expect(commitmentBadgeClass('in-legislation', 'sm')).toBe(domainBadgeClass('ongoing', 'sm'));
  });
});

describe('tables de vocabulaire', () => {
  it('couvre chaque valeur des trois vocabulaires par un rôle connu', () => {
    // Les tables sont typées sur les unions réelles : ce test protège en plus
    // contre un rôle mal orthographié, que le typage seul laisserait passer.
    for (const table of [DOMAIN_STATUS_ROLE, DOSSIER_PHASE_ROLE, COMMITMENT_STATUS_ROLE]) {
      for (const [valeur, role] of Object.entries(table)) {
        expect(ROLES, `${valeur} → ${role}`).toContain(role);
      }
    }
  });

  it('garde « bloqué » gris et « en retard » ambre, dans les trois vocabulaires', () => {
    // Les deux sémantiques s'étaient croisées dans domain-hub-nav, où `stalled`
    // portait un fond ambre et un texte gris.
    expect(DOSSIER_PHASE_ROLE.stalled).toBe('blocked');
    expect(DOMAIN_STATUS_ROLE.delayed).toBe('delayed');
    expect(COMMITMENT_STATUS_ROLE.delayed).toBe('delayed');
  });

  it('ne laisse aucun statut sans classe, contrairement aux tables Record<string, string>', () => {
    // Une table indexée par `string` renvoyait `undefined` pour une valeur
    // inconnue, et la vignette sortait sans aucune couleur.
    for (const phase of Object.keys(DOSSIER_PHASE_ROLE) as (keyof typeof DOSSIER_PHASE_ROLE)[]) {
      expect(dossierBadgeClass(phase)).toMatch(/border-/);
    }
  });
});
