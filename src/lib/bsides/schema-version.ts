// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * État du schéma, en LECTURE SEULE (spec §5, R22).
 *
 * Lire n'est pas appliquer. Quand la base est en retard sur le code, le module
 * B-Sides s'éteint et BGM démarre normalement — l'état du schéma B-Sides ne
 * doit jamais pouvoir faire tomber le site éditorial.
 */
import type { DatabaseSync } from 'node:sqlite';

/** Version attendue par le code présent. À incrémenter avec chaque migration. */
export const EXPECTED_SCHEMA_VERSION = 4;

/**
 * Version à partir de laquelle les tables d'IDENTITÉ existent —
 * `admin_users`, `admin_user_roles`, posées par la migration 002 et jamais
 * retouchées depuis (la 003 ajoute le domaine B-Sides, la 004 assouplit
 * `bsides_audit_log.actor_user_id` : ni l'une ni l'autre ne touche
 * `admin_users`).
 *
 * C'est le plancher dont l'AUTHENTIFICATION a besoin, et RIEN D'AUTRE :
 * `authorizeCredentials` ne lit jamais que `admin_users` /
 * `admin_user_roles`. Distinct — volontairement — de `EXPECTED_SCHEMA_VERSION`
 * (le plancher dont le MODULE B-Sides a besoin). Voir le commentaire de
 * `SchemaState` ci-dessous pour pourquoi confondre les deux a mordu deux fois.
 */
export const IDENTITY_SCHEMA_VERSION = 2;

export interface SchemaState {
  /** Version effectivement appliquée à la base ouverte. */
  current: number;
  /** Version attendue par le code présent (`EXPECTED_SCHEMA_VERSION`, ou une
   * valeur injectée pour les tests — voir `schemaState()`). */
  expected: number;
  /**
   * Les tables d'identité (`admin_users`, `admin_user_roles`) existent et
   * sont utilisables : `current >= IDENTITY_SCHEMA_VERSION`.
   *
   * C'EST LA BARRE DE L'AUTHENTIFICATION. `authorizeCredentials` s'appuie
   * exclusivement sur ce champ, jamais sur `moduleReady`.
   *
   * Pourquoi une barre séparée, plus basse — et pourquoi c'est important :
   * `EXPECTED_SCHEMA_VERSION` grimpe à CHAQUE migration du module B-Sides,
   * y compris celles qui n'ajoutent que des tables de domaine (collections,
   * œuvres, artistes…) sans toucher à l'identité. Si `authorizeCredentials`
   * exigeait `moduleReady` (l'ancien comportement, corrigé ici), chaque
   * déploiement de code AVANT sa migration correspondante — la fenêtre
   * normale entre « le code est en prod » et « la migration a tourné » —
   * couperait la connexion de l'UNIQUE administrateur du site, alors même
   * que les tables dont l'authentification a réellement besoin existent et
   * fonctionnent parfaitement depuis la migration 002. Exemple concret
   * (celui qui a fait mordre ce mécanisme une deuxième fois) : le Sprint 2
   * ajoute une migration 005 et fait passer `EXPECTED_SCHEMA_VERSION` à 5 ;
   * une base encore à la version 4 a `moduleReady = false` mais
   * `identityReady = true` — l'administrateur doit pouvoir se connecter
   * pour aller lancer cette migration, pas se faire rate-limiter quinze
   * minutes parce qu'il croit avoir tapé un mauvais mot de passe.
   */
  identityReady: boolean;
  /**
   * Le schéma du MODULE B-Sides est intégralement à jour :
   * `current >= expected`.
   *
   * C'EST LA BARRE DES OPÉRATIONS B-SIDES. `requireRole()` s'appuie
   * exclusivement sur ce champ, à dessein : une Server Action B-Sides peut
   * lire ou écrire n'importe quelle table du domaine (collections, œuvres,
   * rôles étendus…), y compris celles qu'une migration récente vient
   * d'ajouter ou de modifier. Rien de moins que « tout est à jour » ne
   * protège ces opérations d'une erreur SQL brute sur une table ou colonne
   * absente. Cette barre reste haute intentionnellement — ce n'est PAS le
   * même défaut que celui corrigé pour `identityReady` : les opérations
   * B-Sides, contrairement à la connexion, ont réellement besoin du schéma
   * complet.
   */
  moduleReady: boolean;
}

/**
 * Lit l'état du schéma d'une base ouverte.
 *
 * `expectedVersion` a une valeur par défaut réelle (`EXPECTED_SCHEMA_VERSION`)
 * pour tout le code de production, qui ne doit jamais la fournir
 * explicitement. Le paramètre existe pour permettre aux tests de fabriquer
 * l'écart « base en retard sur une version future du module » sans attendre
 * qu'une vraie migration N+1 existe dans le dépôt — voir
 * `schema-version.test.ts`, le test qui rejoue littéralement le scénario du
 * Sprint 2 (base à la version 4, code qui en attend 5).
 */
export function schemaState(
  db: DatabaseSync | null,
  expectedVersion: number = EXPECTED_SCHEMA_VERSION,
): SchemaState {
  const base: SchemaState = {
    current: 0,
    expected: expectedVersion,
    identityReady: false,
    moduleReady: false,
  };
  if (!db) return base;

  try {
    const row = db
      .prepare('SELECT MAX(version) AS v FROM schema_migrations')
      .get() as { v: number | null } | undefined;
    const current = Number(row?.v ?? 0);
    return {
      current,
      expected: expectedVersion,
      identityReady: current >= IDENTITY_SCHEMA_VERSION,
      moduleReady: current >= expectedVersion,
    };
  } catch {
    // Table absente : base jamais migrée. Ce n'est pas une erreur, c'est un état.
    return base;
  }
}
