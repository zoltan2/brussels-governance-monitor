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

/**
 * Le code sans ses commentaires : un nom d'événement cité dans une explication
 * ne doit pas suffire à rendre le test vert. Commentaires de bloc (dont les
 * `{/* … *\/}` du JSX) et commentaires de ligne, y compris en fin de ligne ou
 * entre deux attributs JSX. Le `//` d'une URL (`https://`) n'est pas précédé
 * d'une espace : il est épargné.
 */
function codeSansCommentaires(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
}

function allSource(): string {
  return sourceFiles()
    .map((f) => codeSansCommentaires(readFileSync(f, 'utf8')))
    .join('\n');
}

/**
 * Chaînes littérales COMPLÈTES du code : `'x'`, `"x"` ou `` `x` `` sans
 * interpolation. Correspondance EXACTE, jamais par sous-chaîne.
 *
 * Né du 28/09/2026. L'ancienne version cherchait `source.includes(nom)` :
 * `accueil-digest` était « trouvé » dans `accueil-digest-langue` et
 * `accueil-digest-abonnement`, si bien que retirer le seul attribut
 * `data-umami-event="accueil-digest"` de l'accueil laissait le test vert. Un nom
 * cité dans un commentaire suffisait aussi.
 *
 * Littéral plutôt qu'attribut exact : certains noms passent par une constante
 * (`INTERNAL_LINK_EVENT = 'dossier-lien-interne'`) ou une propriété
 * (`event="presse-copie-courte"`, `{ event: 'accueil-gouvernement' }`).
 */
function litteraux(source: string): Set<string> {
  return new Set([...source.matchAll(/(['"`])([a-z][a-z0-9:_-]*)\1/g)].map((m) => m[2]));
}

/** Noms émis EN DIRECT : attribut `data-umami-event="…"` ou `track('…'`. */
function nomsEmis(source: string): Set<string> {
  const attributs = [...source.matchAll(/data-umami-event=["']([^"']+)["']/g)].map((m) => m[1]);
  const appels = [...source.matchAll(/\b(?:track|trackEvent)\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
  return new Set([...attributs, ...appels]);
}

/** Les liens, mesurés par attribut : le tracker s'en charge, sans JavaScript à nous.
 *
 *  Le garde est BIDIRECTIONNEL depuis le 28/09/2026 : il échoue si un nom listé
 *  disparaît du code, ET si un nom émis en direct (`data-umami-event="…"`,
 *  `track('…'`) n'est inscrit dans aucune liste. Avant, un événement non inscrit
 *  n'était protégé par rien : c'est ainsi que `accueil-digest-abonnement` est
 *  resté sans garde jusqu'au 18/09/2026. */
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
  // Jeux natifs du panneau : les sorties vers le site.
  'jeux-stuut-dossier',
  'jeux-amai-barometre',
  // Page dossier : tous les liens internes (dossiers liés, « Suivre le sujet »,
  // pastilles domaine, secteur, commune), avec `type` et `cible` en propriétés.
  'dossier-lien-interne',
  // Page Presse & données : le mailto, les mentions (id et famille en
  // propriétés) et le lien vers la fiche d'une information prête à citer.
  'presse-contact',
  'presse-mention',
  'presse-fait',
  // Soutien : bandeau (pied de page, haut des fiches), bouton de l'accueil et
  // en-tête, avec `position` en propriété.
  'soutien-clic',
  // En-tête, menu et pied de page, avec `zone` et `cible` (28/09/2026).
  'navigation-clic',
];

/** Les actions sans navigation, mesurées par appel explicite. */
const EVENEMENTS_ACTIONS = [
  'jeux-ouvert',
  'jeux-onglet',
  'jeux-question-repondue',
  'jeux-quiz-complet',
  // Jeux natifs : fin de partie, partage et défi. Ils remplacent les mesures que
  // chaque jeu faisait dans son propre site Umami quand il était encadré.
  'jeux-stuut-termine',
  'jeux-stuut-partage',
  'jeux-stuut-defi',
  // Inscription au Stuut par e-mail : porte l'emplacement (fin-partie ou entete),
  // JAMAIS l'adresse.
  'jeux-stuut-inscription',
  // Échec d'inscription : emplacement et code de statut seulement (0 = réseau ou
  // CORS). Sans lui, une API tombée ou un CORS absent ne se verrait nulle part.
  'jeux-stuut-inscription-echec',
  'jeux-amai-termine',
  'jeux-amai-partage',
  // Page Presse & données : copies réussies, jamais le texte copié.
  'presse-copie-courte',
  'presse-copie-longue',
  // Accueil : ouverture et fermeture du tableau du gouvernement, `etat` en propriété.
  'accueil-gouvernement',
  // Réponse 2xx de l'inscription (le clic, lui, reste `accueil-inscription`),
  // avec `page` et `statut`. Jamais l'adresse.
  'inscription-reussie',
];

/**
 * Noms antérieurs à la convention (anglais, deux-points), GARDÉS tels quels : les
 * renommer couperait les séries du tableau de bord, qui ne sait pas raccorder
 * deux noms. Inscrits ici pour être protégés comme les autres.
 */
const EVENEMENTS_HISTORIQUES = [
  'quiz-start',
  'quiz-question-shown',
  'quiz-answer',
  'quiz-complete',
  'quiz-share',
  'quiz-donate-click',
  'chatbot:opened',
  'chatbot:question_sent',
  'chatbot:paywall_shown',
  'chatbot:choice_shown',
  'chatbot:checkout_clicked',
  'chatbot:choice_email_selected',
  'chatbot:email_gate_passed',
  'chatbot:session_rated',
  'chatbot:session_rating_skipped',
  'chatbot:feedback_up',
  'chatbot:feedback_down_opened',
  'chatbot:feedback_submitted',
];

describe('suivi Umami de la page d’accueil', () => {
  it('conserve chaque événement de lien, nom exact', () => {
    const presents = litteraux(allSource());
    const manquants = EVENEMENTS_LIENS.filter((e) => !presents.has(e));
    expect(manquants).toEqual([]);
  });

  it('conserve chaque événement d’action, nom exact', () => {
    const presents = litteraux(allSource());
    const manquants = EVENEMENTS_ACTIONS.filter((e) => !presents.has(e));
    expect(manquants).toEqual([]);
  });

  it('conserve chaque événement historique, nom exact', () => {
    const presents = litteraux(allSource());
    const manquants = EVENEMENTS_HISTORIQUES.filter((e) => !presents.has(e));
    expect(manquants).toEqual([]);
  });

  it('n’émet aucun événement qui ne soit inscrit dans une liste', () => {
    const inscrits = new Set([...EVENEMENTS_LIENS, ...EVENEMENTS_ACTIONS, ...EVENEMENTS_HISTORIQUES]);
    const orphelins = [...nomsEmis(allSource())].filter((e) => !inscrits.has(e));
    expect(orphelins).toEqual([]);
  });

  it('ne se laisse pas tromper par un préfixe ni par un commentaire', () => {
    // Témoins du garde lui-même : sans eux, une régression de `litteraux` ou de
    // `codeSansCommentaires` rendrait les tests ci-dessus placebo sans bruit.
    const code = codeSansCommentaires(
      [
        '<a data-umami-event="accueil-digest-langue" />',
        '// data-umami-event="accueil-digest"',
        '{/* track(\'accueil-digest\') */}',
        '<a href="https://example.org" data-umami-event="x-ok" /> // accueil-digest',
      ].join('\n'),
    );
    expect(litteraux(code).has('accueil-digest')).toBe(false);
    expect(litteraux(code).has('accueil-digest-langue')).toBe(true);
    expect(code).toContain('https://example.org');
    expect([...nomsEmis(code)].sort()).toEqual(['accueil-digest-langue', 'x-ok']);
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
