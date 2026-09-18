// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Garde-fou du suivi d'audience de la page d'accueil.
 *
 * Même raison d'être que `analytics-host.test.ts` : « une page non mesurée ne se
 * plaint jamais ». Un attribut `data-umami-event` supprimé par mégarde, ou un
 * appel `track()` perdu dans une refonte, ne casse rien, n'affiche rien, et se
 * découvre des mois plus tard devant un graphique plat. Ce test est le seul
 * signal possible.
 *
 * Il vérifie la PRÉSENCE du balisage, pas la réception : le script porte
 * `data-domains="governance.brussels"` et ne parle donc ni depuis localhost ni
 * depuis la CI. La réception ne se constate qu'en production.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, globSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(process.cwd(), 'src');

function sourceFiles(): string[] {
  return globSync('**/*.{ts,tsx}', { cwd: SRC })
    .filter((f) => !f.endsWith('.test.ts') && !f.endsWith('.test.tsx'))
    .map((f) => join(SRC, f));
}

function allSource(): string {
  return sourceFiles()
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n');
}

/** Les liens, mesurés par attribut : le tracker s'en charge, sans JavaScript à nous.
 *
 *  ⚠️ Ce garde est UNIDIRECTIONNEL : il échoue si un nom listé ici disparaît des
 *  sources, mais reste vert si un événement existe dans le code sans figurer dans
 *  la liste. Un événement non inscrit n'est donc protégé par rien. C'est ainsi que
 *  `accueil-digest-abonnement` est resté sans garde jusqu'au 18/09/2026.
 *  Tout nouvel événement de lien doit être ajouté ici, sans quoi le test ne fait
 *  que confirmer ce qu'on lui a déjà dit. */
const EVENEMENTS_LIENS = [
  'accueil-a-propos',
  'accueil-cta-dossiers',
  'accueil-cta-secondaire',
  'accueil-fait-du-jour',
  'accueil-barometre',
  'accueil-methode',
  'accueil-radar',
  'accueil-explicateur',
  'accueil-comprendre-tout',
  'accueil-digest',
  'accueil-digest-langue',
  'accueil-digest-abonnement',
  'accueil-magazine',
  'accueil-signal',
  'accueil-inventaire',
  'accueil-fiche',
  'accueil-quiz',
  'accueil-inscription',
];

/** Les actions sans navigation, mesurées par appel explicite. */
const EVENEMENTS_ACTIONS = [
  'jeux-ouvert',
  'jeux-onglet',
  'jeux-question-repondue',
  'jeux-quiz-complet',
];

describe('suivi Umami de la page d’accueil', () => {
  it('conserve chaque événement de lien', () => {
    const source = allSource();
    const manquants = EVENEMENTS_LIENS.filter((e) => !source.includes(e));
    expect(manquants).toEqual([]);
  });

  it('conserve chaque événement d’action', () => {
    const source = allSource();
    const manquants = EVENEMENTS_ACTIONS.filter((e) => !source.includes(e));
    expect(manquants).toEqual([]);
  });

  it('ne déclare le type global de window.umami qu’à un seul endroit', () => {
    // Deux déclarations aux types différents ne compilent pas ensemble, et celle qui
    // vivait dans une page du digest était plus étroite que l'API réelle : c'est ce
    // qui avait poussé le quiz à recopier sa propre garde.
    const coupables = sourceFiles().filter((f) => {
      const s = readFileSync(f, 'utf8');
      return s.includes('interface Window') && s.includes('umami');
    });

    expect(coupables.map((f) => f.replace(SRC, 'src'))).toEqual(['src/lib/analytics.ts']);
  });

  it('passe toujours par le helper partagé, jamais par window.umami en direct', () => {
    const coupables = sourceFiles()
      .filter((f) => f !== join(SRC, 'lib/analytics.ts'))
      // On cible un APPEL, pas l'identifiant nu : la première version se déclenchait
      // sur un commentaire mentionnant `window.umami`, donc sur sa propre explication.
      .filter((f) => /window\s*\.\s*umami\s*\??\s*\.\s*track\s*\(/.test(readFileSync(f, 'utf8')));

    expect(coupables.map((f) => f.replace(SRC, 'src'))).toEqual([]);
  });
});
