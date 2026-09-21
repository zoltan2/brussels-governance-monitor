// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Toute route d'ecriture a privileges doit porter la garde d'origine.
 *
 * Pourquoi ce test existe. Le depot avait deja `src/lib/same-origin.ts`, ecrit,
 * commente et teste — mais cable sur trois routes seulement. Cinq routes
 * privilegiees ne l'appelaient pas : approbation de digest (reexpedition a toute
 * la liste d'abonnes), edition du digest, envoi de test, publication et
 * SUPPRESSION de contenu. Le cookie de session etant SameSite=Lax, un
 * sous-domaine suffisait a les declencher depuis la session de l'administrateur.
 *
 * L'equivalent existe pour les PAGES (`src/lib/require-admin.test.ts`, qui
 * parcourt l'arborescence et exige `requireAdmin` en premiere instruction) et il
 * fonctionne tres bien : aucune page admin n'a jamais manque sa garde. C'est
 * precisement l'absence de ce pendant cote API qui a laisse le trou s'installer.
 */

const RACINE = join(process.cwd(), 'src/app/api');

/** Familles de routes qui agissent au nom d'une session d'administration. */
const FAMILLES_PROTEGEES = ['admin', 'digest', 'review'];

/**
 * Exceptions assumees, avec leur raison. Une route n'entre ici que si elle
 * n'est PAS authentifiee par session : la garde d'origine protege un cookie,
 * elle n'a pas de sens sans cookie.
 */
const EXCEPTIONS: Record<string, string> = {
  'digest/pending/route.ts':
    'lecture seule, aucun effet de bord : elle restitue le digest en preparation',
};

function routesDe(dossier: string, prefixe = ''): string[] {
  const resultat: string[] = [];
  for (const entree of readdirSync(dossier)) {
    const chemin = join(dossier, entree);
    if (statSync(chemin).isDirectory()) {
      resultat.push(...routesDe(chemin, `${prefixe}${entree}/`));
    } else if (entree === 'route.ts') {
      resultat.push(`${prefixe}${entree}`);
    }
  }
  return resultat;
}

describe("garde d'origine sur les routes a privileges", () => {
  const routes = FAMILLES_PROTEGEES.flatMap((famille) =>
    routesDe(join(RACINE, famille), `${famille}/`),
  );

  it('trouve bien les routes a proteger', () => {
    // Filet : si l'arborescence bouge et que la liste devient vide, le test
    // ci-dessous passerait au vert sans rien verifier.
    expect(routes.length).toBeGreaterThanOrEqual(8);
  });

  it.each(routes)('%s appelle sameOriginRefusal', (route) => {
    const source = readFileSync(join(RACINE, route), 'utf8');

    if (route in EXCEPTIONS) {
      expect(source).not.toContain('sameOriginRefusal');
      return;
    }

    // Une route sans session n'a pas de cookie a proteger : elle est hors sujet.
    const parSession = source.includes("from '@/auth'");
    if (!parSession) return;

    expect(source).toContain("from '@/lib/same-origin'");
    expect(source).toContain('sameOriginRefusal(req.headers)');
  });

  it('la garde vient avant toute lecture du corps de la requete', () => {
    for (const route of routes) {
      const source = readFileSync(join(RACINE, route), 'utf8');
      if (!source.includes('sameOriginRefusal(req.headers)')) continue;

      const garde = source.indexOf('sameOriginRefusal(req.headers)');
      const lectureCorps = source.indexOf('req.json()');
      if (lectureCorps === -1) continue;

      // Lire le corps avant de refuser, c'est avoir deja accepte le travail.
      expect(garde, `${route} lit le corps avant de verifier l'origine`).toBeLessThan(lectureCorps);
    }
  });
});
