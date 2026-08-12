// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Les refus de la route de fusion, en fonctions PURES.
 *
 * Pourquoi ici et pas dans `route.ts` : un fichier de test qui importe
 * `@/auth` — directement ou via un `route.ts` protégé — n'exécute AUCUN test
 * sous Vitest, sans échouer, ce qui se lit comme un succès. Mesuré dans ce
 * dépôt. La seule voie d'écriture du module restait donc entièrement non
 * testée, alors qu'une fusion déclenche un déploiement en production et
 * alimente un email vers des abonnés en onze langues.
 *
 * Trois fonctions plutôt qu'une : la route décide dans cet ordre parce que
 * chaque étape coûte des appels à l'API GitHub. Refuser une PR de fork avant
 * d'aller chercher ses 1480 fichiers, puis ses contrôles, économise le quota
 * horaire partagé avec la veille et les routes du digest.
 */

import { publishablePrProblem, type ContentPr, type CheckState } from './github-pr';
import { fileSetRefusal } from './mergeable-files';

export interface MergeRefusal {
  status: number;
  error: string;
}

/**
 * Refus lisibles sur la PR seule : origine, préfixe de branche, branche
 * cible, et commit de tête.
 */
export function prRefusal(
  pr: Pick<ContentPr, 'headRepo' | 'branch' | 'baseRef' | 'sha'>,
  requestedSha: string,
  repo: string,
): MergeRefusal | null {
  const problem = publishablePrProblem(pr, repo);
  if (problem) return { status: 403, error: problem };

  // La branche a bougé entre l'affichage et le clic : le contenu relu n'est
  // plus celui qu'on fusionnerait. GitHub refuserait aussi de son côté, mais
  // avec un message incompréhensible ; on préfère le nôtre.
  if (pr.sha !== requestedSha) {
    return {
      status: 409,
      error: 'La branche a changé depuis l\'affichage. Recharger la page.',
    };
  }

  return null;
}

/**
 * Refus lisibles sur la liste de fichiers.
 *
 * La troncature doit BLOQUER et non passer : GitHub trie par chemin, et
 * `src/` arrive après le millier de fichiers `public/pagefind/`. Une liste
 * tronquée acceptée rendrait la liste blanche entièrement contournable.
 */
export function filesRefusal(paths: string[], truncated: boolean): MergeRefusal | null {
  if (truncated) {
    return { status: 422, error: 'Liste de fichiers incomplète, publication refusée' };
  }
  const refusal = fileSetRefusal(paths);
  if (refusal) return { status: 403, error: refusal };
  return null;
}

/**
 * Refus lisibles sur l'état des contrôles.
 *
 * On exige les contrôles NOMMÉS, pas seulement « aucun échec » : une PR
 * ouverte depuis un fork n'exécute aucun workflow tant qu'un mainteneur ne
 * l'approuve pas, donc son état nominal est zéro contrôle — que « aucun
 * échec » lit comme un feu vert.
 */
export function checksRefusal(checks: CheckState): MergeRefusal | null {
  if (checks.pending > 0 || checks.failed.length > 0 || checks.missing.length > 0) {
    const noms = [...checks.failed, ...checks.missing];
    return {
      status: 409,
      error:
        noms.length > 0
          ? `Contrôles non satisfaits : ${noms.join(', ')}`
          : `Contrôles non satisfaits : ${checks.pending} en cours`,
    };
  }
  return null;
}
