// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * État opérationnel du VPS, tel que déposé par les scripts systemd.
 *
 * Deux fichiers distincts, chacun écrit intégralement par un seul auteur :
 * bgm-deploy.sh écrit deploy-status.json, bgm-backup.sh écrit
 * backup-status.json. Pas de fusion en bash, donc pas de course entre les
 * deux timers ; la fusion se fait ici, où elle est testable.
 *
 * Le répertoire est déduit de DB_PATH (le conteneur monte /opt/bgm/data au
 * même chemin que l'hôte), donc aucune variable d'environnement nouvelle.
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export interface InfraStatus {
  lastDeployAt: string | null;
  lastDeployStatus: 'ok' | 'rollback' | 'failed' | null;
  lastBackupAt: string | null;
  diskUsagePercent: number | null;
  snapshotCount: number | null;
}

const DEPLOY_STATUSES = ['ok', 'rollback', 'failed'] as const;

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function mergeInfraStatus(
  deployRaw: unknown,
  backupRaw: unknown,
): InfraStatus {
  const deploy = asRecord(deployRaw);
  const backup = asRecord(backupRaw);
  const status = asString(deploy.lastDeployStatus);

  return {
    lastDeployAt: asString(deploy.lastDeployAt),
    lastDeployStatus:
      status !== null && (DEPLOY_STATUSES as readonly string[]).includes(status)
        ? (status as InfraStatus['lastDeployStatus'])
        : null,
    lastBackupAt: asString(backup.lastBackupAt),
    diskUsagePercent: asNumber(backup.diskUsagePercent),
    snapshotCount: asNumber(backup.snapshotCount),
  };
}

async function readJson(path: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    // Fichier absent (première exécution, dev local) ou JSON tronqué par une
    // écriture concurrente : traité comme une source muette, pas une erreur.
    return null;
  }
}

export async function readInfraStatus(): Promise<InfraStatus | null> {
  const dbPath = process.env.DB_PATH;
  if (!dbPath) return null; // dev local ou Vercel : pas de volume de données

  const dir = dirname(dbPath);
  const [deploy, backup] = await Promise.all([
    readJson(join(dir, 'deploy-status.json')),
    readJson(join(dir, 'backup-status.json')),
  ]);

  if (deploy === null && backup === null) return null;
  return mergeInfraStatus(deploy, backup);
}
