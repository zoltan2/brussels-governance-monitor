// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import {
  explainerContentChanged,
  explainerMessagesDateProblem,
  findExplainerDateLine,
  readExplainerDateExpr,
} from './explainer-messages-date';

const TABLE = `
export const SITE_LAUNCH_DATE = '2026-02-12';

export const EXPLAINER_LAST_MODIFIED: Record<string, string> = {
  'brussels-overview': SITE_LAUNCH_DATE,
  // Réécriture texte validé le 19/09/2026 (PR #509).
  'brussels-paradox': '2026-09-19',
  cocom: SITE_LAUNCH_DATE,
  cocof: '2026-02-16',
};
`;

describe('readExplainerDateExpr', () => {
  it('résout une entrée quotée qui pointe vers SITE_LAUNCH_DATE', () => {
    expect(readExplainerDateExpr(TABLE, 'brussels-overview')).toBe('2026-02-12');
  });

  it('lit une entrée quotée avec une date littérale', () => {
    expect(readExplainerDateExpr(TABLE, 'brussels-paradox')).toBe('2026-09-19');
  });

  it('lit une entrée en identifiant nu (sans guillemets)', () => {
    expect(readExplainerDateExpr(TABLE, 'cocom')).toBe('2026-02-12');
    expect(readExplainerDateExpr(TABLE, 'cocof')).toBe('2026-02-16');
  });

  it("renvoie null pour un slug absent de la table", () => {
    expect(readExplainerDateExpr(TABLE, 'route-inexistante')).toBeNull();
  });

  it('renvoie null si SITE_LAUNCH_DATE est référencée mais introuvable', () => {
    const broken = `export const EXPLAINER_LAST_MODIFIED = {\n  'brussels-overview': SITE_LAUNCH_DATE,\n};\n`;
    expect(readExplainerDateExpr(broken, 'brussels-overview')).toBeNull();
  });
});

describe('findExplainerDateLine', () => {
  it("trouve la ligne d'une entrée quotée", () => {
    const line = findExplainerDateLine(TABLE, 'brussels-paradox');
    expect(line).not.toBeNull();
    expect(TABLE.split('\n')[line! - 1]).toContain('brussels-paradox');
  });

  it("trouve la ligne d'une entrée en identifiant nu", () => {
    const line = findExplainerDateLine(TABLE, 'cocof');
    expect(line).not.toBeNull();
    expect(TABLE.split('\n')[line! - 1]).toContain('cocof');
  });

  it('renvoie null pour un slug absent', () => {
    expect(findExplainerDateLine(TABLE, 'route-inexistante')).toBeNull();
  });
});

describe('explainerContentChanged', () => {
  it('détecte un texte modifié', () => {
    expect(explainerContentChanged({ title: 'Avant' }, { title: 'Après' })).toBe(true);
  });

  it("ignore un simple réordonnancement de clés qui ne change rien", () => {
    const before = { title: 'x', subtitle: 'y' };
    const after = { subtitle: 'y', title: 'x' };
    expect(explainerContentChanged(before, after)).toBe(false);
  });

  it('ignore une valeur strictement identique', () => {
    const v = { title: 'x', list: ['a', 'b'] };
    expect(explainerContentChanged(v, { title: 'x', list: ['a', 'b'] })).toBe(false);
  });

  it("détecte une page qui apparaît (avant = null)", () => {
    expect(explainerContentChanged(null, { title: 'Nouveau' })).toBe(true);
  });

  it('ne rapporte rien quand la clé est absente des deux côtés', () => {
    expect(explainerContentChanged(null, undefined)).toBe(false);
  });
});

describe('explainerMessagesDateProblem', () => {
  it('ignore un contenu inchangé, même si la date semble périmée', () => {
    const r = explainerMessagesDateProblem({
      slug: 'brussels-overview',
      key: 'brusselsOverview',
      contentChanged: false,
      dateBefore: '2026-02-12',
      dateAfter: '2026-02-12',
    });
    expect(r).toBeNull();
  });

  // Le cas réel qui a motivé la garde : brussels-overview réécrite le
  // 19/09/2026 (eb552ae4) sans que la table bouge.
  it('refuse un contenu changé dont la date de table est restée identique', () => {
    const r = explainerMessagesDateProblem({
      slug: 'brussels-overview',
      key: 'brusselsOverview',
      contentChanged: true,
      dateBefore: '2026-02-12',
      dateAfter: '2026-02-12',
    });
    expect(r).toContain('brussels-overview');
    expect(r).toContain('brusselsOverview');
  });

  it('accepte un contenu changé avec une date de table mise à jour', () => {
    const r = explainerMessagesDateProblem({
      slug: 'brussels-overview',
      key: 'brusselsOverview',
      contentChanged: true,
      dateBefore: '2026-02-12',
      dateAfter: '2026-09-19',
    });
    expect(r).toBeNull();
  });

  it("refuse quand la date de table est illisible (entrée absente ou mal formée)", () => {
    const r = explainerMessagesDateProblem({
      slug: 'brussels-overview',
      key: 'brusselsOverview',
      contentChanged: true,
      dateBefore: '2026-02-12',
      dateAfter: null,
    });
    expect(r).toContain('illisible');
  });

  it('refuse un format de date invalide', () => {
    const r = explainerMessagesDateProblem({
      slug: 'brussels-overview',
      key: 'brusselsOverview',
      contentChanged: true,
      dateBefore: '2026-02-12',
      dateAfter: '19/09/2026',
    });
    expect(r).toContain('AAAA-MM-JJ');
  });

  it('refuse une date qui recule', () => {
    const r = explainerMessagesDateProblem({
      slug: 'brussels-overview',
      key: 'brusselsOverview',
      contentChanged: true,
      dateBefore: '2026-09-19',
      dateAfter: '2026-02-12',
    });
    expect(r).toContain('recule');
  });
});
