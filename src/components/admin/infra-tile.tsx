// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { readInfraStatus } from '@/lib/infra-status';
import { Tile, TileUnavailable } from './tile';

const DEPLOY_LABELS: Record<string, string> = {
  ok: 'déploiement sain',
  rollback: 'rollback effectué',
  failed: 'échec, intervention requise',
};

/** Ancienneté en clair. Impure (Date.now), donc jamais appelée pendant le
 * rendu : le composant reçoit des chaînes déjà calculées. */
function ago(iso: string | null): string {
  if (!iso) return 'jamais';
  const ms = Date.now() - Date.parse(iso);
  if (Number.isNaN(ms)) return 'date illisible';
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return "il y a moins d'une heure";
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.floor(hours / 24)} j`;
}

async function loadInfraLines(): Promise<
  { label: string; value: string }[] | null
> {
  const status = await readInfraStatus();
  if (!status) return null;

  const deploySuffix = status.lastDeployStatus
    ? ` (${DEPLOY_LABELS[status.lastDeployStatus]})`
    : '';
  const backupSuffix =
    status.snapshotCount !== null ? ` (${status.snapshotCount} snapshots)` : '';

  return [
    {
      label: 'Dernier déploiement',
      value: `${ago(status.lastDeployAt)}${deploySuffix}`,
    },
    {
      label: 'Dernière sauvegarde',
      value: `${ago(status.lastBackupAt)}${backupSuffix}`,
    },
    {
      label: 'Disque',
      value:
        status.diskUsagePercent === null
          ? 'inconnu'
          : `${status.diskUsagePercent} %`,
    },
  ];
}

export async function InfraTile() {
  const lines = await loadInfraLines();

  if (!lines) {
    return (
      <Tile title="Santé infra">
        <TileUnavailable reason="Aucun fichier d'état sur le volume de données." />
      </Tile>
    );
  }

  return (
    <Tile title="Santé infra">
      <dl className="space-y-2 text-sm">
        {lines.map((line) => (
          <div key={line.label} className="flex justify-between gap-3">
            <dt className="text-neutral-600">{line.label}</dt>
            <dd className="text-right text-neutral-900">{line.value}</dd>
          </div>
        ))}
      </dl>
    </Tile>
  );
}
