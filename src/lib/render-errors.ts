// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Erreurs de rendu serveur, gardées en mémoire pour `/api/health`.
 *
 * Pourquoi. Quand la régénération ISR d'une page échoue, Next continue de
 * servir la dernière version réussie (doc locale : 01-app/02-guides/
 * incremental-static-regeneration.md, « Handling uncaught exceptions »), avec
 * un `stale-while-revalidate` d'un an. La page reste en 200 : aucune sonde HTTP
 * ne le voit, et l'erreur n'est écrite que dans `docker logs bgm-app`, que
 * personne ne lit (revue blue du 28/09/2026, P1). `onRequestError`
 * (src/instrumentation.ts) note chaque erreur ici, `/api/health` en publie le
 * bilan, et la sonde de l'accueil du VPS (bgm-ops, deploy/sonde-accueil)
 * alerte dès qu'une régénération a échoué dans les dernières 24 h.
 *
 * Mémoire du processus, pas de base : un redémarrage du conteneur remet à zéro,
 * ce qui est acceptable (un redémarrage est un déploiement, suivi de sa propre
 * sonde). Le registre vit sur `globalThis` parce que `instrumentation.ts` et la
 * route `/api/health` sont deux paquets distincts du même processus Node : une
 * variable de module ne serait pas partagée entre eux.
 *
 * `/api/health` est public : on ne garde ni le message de l'erreur (il peut
 * contenir un chemin de fichier ou une donnée interne), ni la pile, ni la
 * requête. L'instant, le fichier de route et la raison suffisent à dire
 * « quelle page, depuis quand » ; le détail reste dans `docker logs bgm-app`.
 */

export interface ErreurRendu {
  /** Instant ISO de l'erreur. */
  at: string;
  /** Fichier de route (`/[locale]`, `/[locale]/dossiers/[slug]`…). */
  routePath: string;
  /** `stale` ou `on-demand` pour une régénération ISR, `null` pour une requête ordinaire. */
  revalidateReason: string | null;
}

export interface BilanErreursRendu {
  total24h: number;
  /** Régénérations ISR en échec : la page servie est restée l'ancienne. */
  revalidation24h: number;
  derniere: ErreurRendu | null;
}

const CAPACITE = 50;
const FENETRE_MS = 24 * 60 * 60 * 1000;
const CLE = Symbol.for('bgm.render-errors');

type Registre = { erreurs: ErreurRendu[] };

function registre(): Registre {
  const g = globalThis as typeof globalThis & { [CLE]?: Registre };
  if (!g[CLE]) g[CLE] = { erreurs: [] };
  return g[CLE];
}

/** Note une erreur. Ne lève jamais : un rapport d'erreur ne doit pas en créer une. */
export function noterErreurRendu(
  contexte: { routePath?: string; revalidateReason?: string | undefined },
  maintenant: Date = new Date(),
): void {
  try {
    const r = registre();
    r.erreurs.push({
      at: maintenant.toISOString(),
      routePath: String(contexte.routePath ?? '?').slice(0, 200),
      revalidateReason: contexte.revalidateReason ?? null,
    });
    // Anneau borné : un robot qui provoque des erreurs en boucle ne doit pas
    // faire grossir la mémoire du serveur.
    if (r.erreurs.length > CAPACITE) r.erreurs.splice(0, r.erreurs.length - CAPACITE);
  } catch {
    // volontairement muet
  }
}

/** Bilan des dernières 24 h, pour `/api/health`. */
export function bilanErreursRendu(maintenant: Date = new Date()): BilanErreursRendu {
  const depuis = maintenant.getTime() - FENETRE_MS;
  const recentes = registre().erreurs.filter((e) => Date.parse(e.at) >= depuis);
  return {
    total24h: recentes.length,
    revalidation24h: recentes.filter((e) => e.revalidateReason !== null).length,
    derniere: recentes.at(-1) ?? null,
  };
}

/** Pour les tests uniquement. */
export function viderErreursRendu(): void {
  registre().erreurs.length = 0;
}
