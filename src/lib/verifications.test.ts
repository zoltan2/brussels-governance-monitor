// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { idDeVerification } from './content';
import { readFrontmatterScalar } from './summary-freshness';

/**
 * La collection `verifications` existait depuis février 2026 sans aucune route :
 * ses douze fiches répondaient 404. En l'ouvrant le 21/09/2026, deux défauts
 * latents sont apparus, et ce sont eux que ces tests verrouillent.
 *
 * ⚑ CES TESTS NE LISENT PAS `.velite/`. En CI, `npm test` s'exécute AVANT
 * `npm run build` : la sortie de Velite n'existe pas encore, et les accesseurs
 * de `content.ts` rendent alors des tableaux vides. Un test bâti dessus passe en
 * local et échoue en CI, ce qui est exactement ce qui est arrivé. On lit donc
 * les fichiers source, qui sont la vérité et sont toujours là.
 */

const DOSSIER = join(process.cwd(), 'content/verifications');

interface FicheSource {
  fichier: string;
  locale: string;
  cardSlug: string;
  date: string;
}

function fichesSource(): FicheSource[] {
  return readdirSync(DOSSIER)
    .filter((n) => n.endsWith('.mdx'))
    .map((fichier) => {
      const brut = readFileSync(join(DOSSIER, fichier), 'utf8');
      return {
        fichier,
        locale: readFrontmatterScalar(brut, 'locale') ?? '',
        cardSlug: readFrontmatterScalar(brut, 'cardSlug') ?? '',
        date: readFrontmatterScalar(brut, 'date') ?? '',
      };
    });
}

describe('identifiant de vérification', () => {
  /**
   * DÉFAUT 1. `s.isodate()` rend un horodatage complet, pas une date. Le
   * `permalink` calculé au schéma valait donc
   * `/verifications/budget-2026-02-08T00:00:00.000Z` : il n'a jamais été une
   * URL utilisable, ce qui est resté invisible tant que rien ne le servait.
   */
  it("ne garde que la date, jamais l'heure ni le fuseau", () => {
    expect(idDeVerification({ cardSlug: 'budget', date: '2026-02-08T00:00:00.000Z' })).toBe(
      'budget-2026-02-08',
    );
    expect(idDeVerification({ cardSlug: 'social', date: '2026-03-12' })).toBe('social-2026-03-12');
  });

  it('produit toujours une forme utilisable en URL', () => {
    for (const f of fichesSource()) {
      const id = idDeVerification(f);
      expect(id, `${f.fichier} produit ${id}`).toMatch(/^[a-z-]+-\d{4}-\d{2}-\d{2}$/);
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
    const parIdentifiant = new Map<string, string[]>();
    for (const f of fichesSource()) {
      const id = idDeVerification(f);
      parIdentifiant.set(id, [...(parIdentifiant.get(id) ?? []), f.locale]);
    }

    // Filet : si la lecture casse, les assertions suivantes ne vérifieraient rien.
    expect(parIdentifiant.size).toBeGreaterThanOrEqual(4);

    expect(parIdentifiant.get('social-2026-03-12')?.sort()).toEqual(['de', 'en', 'fr', 'nl']);
    expect(parIdentifiant.get('budget-2026-03-06')?.sort()).toEqual(['de', 'en', 'fr', 'nl']);

    // Ces deux fiches n'existent qu'en français et en néerlandais. Déclarer
    // l'anglais ou l'allemand produirait un hreflang vers une 404.
    expect(parIdentifiant.get('budget-2026-02-08')?.sort()).toEqual(['fr', 'nl']);
    expect(parIdentifiant.get('social-2026-02-08')?.sort()).toEqual(['fr', 'nl']);
  });

  /**
   * Le champ `slug` reste incohérent dans trois fichiers. Ce test le CONSTATE
   * plutôt que de l'ignorer : le jour où quelqu'un nettoie ces slugs, il
   * rougira et rappellera que la route n'en dépend pas.
   */
  it('ne dépend pas du champ slug, qui est incohérent sur trois fiches', () => {
    const divergents = fichesSource().filter(
      (f) => readFrontmatterScalar(readFileSync(join(DOSSIER, f.fichier), 'utf8'), 'slug')
        !== idDeVerification(f),
    );
    expect(divergents.map((f) => f.fichier).sort()).toEqual([
      'social-2026-03-12.de.mdx',
      'social-2026-03-12.en.mdx',
      'social-2026-03-12.nl.mdx',
    ]);
  });
});
