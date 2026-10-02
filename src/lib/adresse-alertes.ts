// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Destinataire des rapports et alertes TECHNIQUES envoyés par les tâches
 * planifiées : `ALERT_EMAIL`, boîte directe et privée, sinon `ADMIN_EMAIL`.
 *
 * Pourquoi une variable à part. `ADMIN_EMAIL` est l'identifiant de connexion à
 * l'admin et l'adresse de réponse des digests, donc visible des abonnés ; elle
 * pointe sur une adresse redirigée par un service tiers, qui a refusé un
 * message le 02/10/2026 (adresse d'envoi partagée sur liste noire). Une alerte
 * ne doit pas dépendre de cette redirection.
 *
 * `ALERT_EMAIL` ne doit jamais servir d'adresse de réponse ni apparaître sur une
 * page : garde dans `adresse-alertes.test.ts`. Même règle côté serveur, dans les
 * scripts de `bgm-ops/deploy`.
 */
export function adresseAlertes(
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  return env.ALERT_EMAIL?.trim() || env.ADMIN_EMAIL || undefined;
}
