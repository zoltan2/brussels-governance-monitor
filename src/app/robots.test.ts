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
    expect(citation.allow).toEqual(expect.arrayContaining(['/']));
    expect(citation.disallow).toContain('/*/admin');
  });

  /**
   * `/api/v1/` est le format machine du site. Il tombait sous le `Disallow: /api/`
   * qui vise les routes applicatives. Une regle plus specifique l'emporte sur une
   * regle plus generale, mais encore faut-il qu'elle soit ecrite : ce test echoue
   * si l'autorisation disparait d'un groupe ouvert (audit 21/09).
   */
  it("ouvre l'API publique dans chaque groupe qui autorise le passage", async () => {
    const { rules } = await robots();
    const ouverts = (rules as Groupe[]).filter((groupe) => groupe.allow !== undefined);
    for (const groupe of ouverts) {
      expect(groupe.allow).toEqual(expect.arrayContaining(['/api/v1/']));
    }
  });

  /**
   * Chemins qui repondent 200 et n'ont aucune raison d'etre explores. Le piege
   * corrige le 21/09 : `/refonte` etait ecrit sans prefixe de langue alors que la
   * route vit sous [locale], donc la regle ne couvrait pas /fr/refonte.
   */
  it('exclut les chemins sans valeur de recherche, prefixe de langue compris', async () => {
    const { rules } = await robots();
    const ouverts = (rules as Groupe[]).filter((groupe) => groupe.allow !== undefined);
    for (const groupe of ouverts) {
      expect(groupe.disallow).toEqual(
        expect.arrayContaining([
          '/*/refonte',
          '/*/og?*date=',
          '/social/queue/',
          '/*/subscribe/preferences',
        ]),
      );
    }
    // Les variantes sans prefixe de langue ne doivent pas revenir : elles
    // donnaient l'illusion d'une protection.
    for (const groupe of ouverts) {
      expect(groupe.disallow).not.toContain('/refonte');
    }
  });

  /**
   * La regle sur `/og` (toutes langues) bloquait toute la route d'image sociale (21/09/2026), donc l'image
   * `og:image` de chaque page : Google ne pouvait plus la lire pour ses vignettes
   * et la Search Console comptait une URL bloquee par page et par mise a jour.
   * Depuis le 07/10, l'URL d'une fiche est stable (src/lib/og-card.ts) et la route
   * est ouverte. Seules restent fermees les anciennes URL, reconnaissables a leur
   * parametre `date=`.
   */
  it("laisse lire l'image sociale, sauf les anciennes URL instables", async () => {
    const { rules } = await robots();
    const ouverts = (rules as Groupe[]).filter((groupe) => groupe.allow !== undefined);
    for (const groupe of ouverts) {
      expect(groupe.disallow).not.toContain('/*/og');
      expect(groupe.disallow).toContain('/*/og?*date=');
    }
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

  it('exclut le sondage lecteurs sous ses deux chemins, dans chaque groupe ouvert', async () => {
    const { rules } = await robots();
    for (const groupe of (rules as Groupe[]).filter((g) => g.allow !== undefined)) {
      expect(groupe.disallow).toEqual(expect.arrayContaining(['/*/sondage', '/*/enquete']));
    }
  });

  it('annonce le plan du site', async () => {
    const { sitemap } = await robots();
    expect(sitemap).toContain('/sitemap.xml');
  });
});
