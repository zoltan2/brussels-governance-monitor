// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const host = vi.fn(() => 'governance.brussels');

vi.mock('next/headers', () => ({
  headers: async () => ({ get: (nom: string) => (nom === 'host' ? host() : null) }),
}));

const robots = (await import('./robots')).default;

type Groupe = { userAgent?: string | string[]; allow?: string | string[]; disallow?: string | string[] };

function agents(groupe: Groupe): string[] {
  const valeur = groupe.userAgent ?? [];
  return Array.isArray(valeur) ? valeur : [valeur];
}

function groupeDe(regles: Groupe[], agent: string): Groupe {
  const trouve = regles.find((groupe) => agents(groupe).includes(agent));
  if (!trouve) throw new Error(`aucun groupe pour ${agent}`);
  return trouve;
}

describe('robots.txt', () => {
  beforeEach(() => host.mockReturnValue('governance.brussels'));

  it("ferme entièrement le sous-domaine de préproduction", async () => {
    host.mockReturnValue('staging.governance.brussels');
    const { rules } = await robots();
    const regles = rules as Groupe[];
    expect(regles).toHaveLength(1);
    expect(regles[0].disallow).toBe('/');
    expect(regles[0].allow).toBeUndefined();
  });

  /**
   * Un robot nommé dans son propre groupe ignore le groupe '*' en entier : une
   * exclusion écrite une seule fois ne protège que les robots anonymes. Ce test
   * échoue si un groupe nommé oublie de répéter la liste.
   */
  it('répète les exclusions dans chaque groupe qui autorise le passage', async () => {
    const { rules } = await robots();
    const ouverts = (rules as Groupe[]).filter((groupe) => groupe.allow !== undefined);
    expect(ouverts.length).toBeGreaterThanOrEqual(2);
    for (const groupe of ouverts) {
      expect(groupe.disallow).toEqual(
        expect.arrayContaining(['/api/', '/*/admin', '/*/review', '/*/login']),
      );
    }
  });

  it("laisse passer les robots qui citent avec un lien, sous toutes les langues sauf l'administration", async () => {
    const { rules } = await robots();
    const citation = groupeDe(rules as Groupe[], 'Claude-SearchBot');
    expect(citation.allow).toBe('/');
    expect(citation.disallow).toContain('/*/admin');
  });

  it("ferme la porte aux robots d'entraînement, décision du 19/09/2026", async () => {
    const { rules } = await robots();
    const entrainement = groupeDe(rules as Groupe[], 'GPTBot');
    expect(entrainement.disallow).toBe('/');
    expect(entrainement.allow).toBeUndefined();
    for (const nom of ['ClaudeBot', 'anthropic-ai', 'CCBot', 'Amazonbot', 'Bytespider', 'Applebot-Extended']) {
      expect(agents(entrainement)).toContain(nom);
    }
  });

  it('annonce le plan du site', async () => {
    const { sitemap } = await robots();
    expect(sitemap).toContain('/sitemap.xml');
  });
});
