import { describe, it, expect } from 'vitest';
import { mergeInfraStatus } from './infra-status';

describe('mergeInfraStatus', () => {
  it('fusionne les deux fichiers en un seul état', () => {
    const out = mergeInfraStatus(
      { lastDeployAt: '2026-08-11T04:00:00Z', lastDeployStatus: 'ok' },
      {
        lastBackupAt: '2026-08-11T06:00:00Z',
        diskUsagePercent: 42,
        snapshotCount: 28,
      },
    );
    expect(out).toEqual({
      lastDeployAt: '2026-08-11T04:00:00Z',
      lastDeployStatus: 'ok',
      lastBackupAt: '2026-08-11T06:00:00Z',
      diskUsagePercent: 42,
      snapshotCount: 28,
    });
  });

  it('rend des null quand un fichier manque', () => {
    const out = mergeInfraStatus(null, {
      lastBackupAt: '2026-08-11T06:00:00Z',
      diskUsagePercent: 42,
      snapshotCount: 28,
    });
    expect(out.lastDeployAt).toBeNull();
    expect(out.lastDeployStatus).toBeNull();
    expect(out.lastBackupAt).toBe('2026-08-11T06:00:00Z');
  });

  it('rejette un statut de déploiement inconnu plutôt que de le propager', () => {
    const out = mergeInfraStatus(
      { lastDeployAt: '2026-08-11T04:00:00Z', lastDeployStatus: 'bizarre' },
      null,
    );
    expect(out.lastDeployStatus).toBeNull();
    expect(out.lastDeployAt).toBe('2026-08-11T04:00:00Z');
  });

  it('ignore les types incorrects sans lever', () => {
    const out = mergeInfraStatus(
      { lastDeployAt: 42 },
      { diskUsagePercent: 'beaucoup', snapshotCount: null },
    );
    expect(out.lastDeployAt).toBeNull();
    expect(out.diskUsagePercent).toBeNull();
    expect(out.snapshotCount).toBeNull();
  });

  it("accepte une entrée qui n'est pas un objet", () => {
    const out = mergeInfraStatus('cassé', undefined);
    expect(out).toEqual({
      lastDeployAt: null,
      lastDeployStatus: null,
      lastBackupAt: null,
      diskUsagePercent: null,
      snapshotCount: null,
    });
  });
});
