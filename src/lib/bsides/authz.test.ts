// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import type { Session } from 'next-auth';
import type { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { mkdtempSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createDb } from '@/lib/db';
import { runMigrations } from './migrate';
import { createUser } from './repositories/admin-users';

const DIR = join(process.cwd(), 'src/lib/bsides/migrations');

/** Base migrée jusqu'à la SEULE migration 002 (identité) : `identityReady`
 * vrai, `moduleReady` faux — voir le même helper dans `src/auth.test.ts`
 * pour la justification complète du procédé (copie des vrais fichiers 001 et
 * 002, sans faux fichier ni constante modifiée). */
function dbIdentitéSeule(): DatabaseSync {
  const dossier = mkdtempSync(join(tmpdir(), 'bsides-authz-identity-only-'));
  copyFileSync(join(DIR, '001_baseline.sql'), join(dossier, '001_baseline.sql'));
  copyFileSync(join(DIR, '002_identity.sql'), join(dossier, '002_identity.sql'));
  const db = createDb(':memory:');
  runMigrations(db, dossier);
  return db;
}

/** Base migrée, module B-Sides opérationnel. */
function dbPrête(): DatabaseSync {
  const db = createDb(':memory:');
  runMigrations(db, DIR);
  return db;
}

/** Base jamais migrée : `schema_migrations` n'existe pas. */
function dbVide(): DatabaseSync {
  return createDb(':memory:');
}

// La matrice 17×6 (chaque couple rôle × opération) est exhaustivement
// éprouvée dans `schema.test.ts`, qu'elle exerce (revue de branche du
// 2026-08-15, B-4) — elle vivait ici en double, à la virgule près, ce qui
// n'éprouvait rien de spécifique à `requireRole`. Ce fichier ne garde que les
// tests de la garde elle-même.
vi.mock('@/auth', () => ({ auth: vi.fn() }));
// Mock PARTIEL : `createDb` reste réel, utilisé par `dbPrête()`/`dbVide()`
// ci-dessus pour fabriquer de vraies bases `:memory:`. Seul `getDb` — le
// singleton consulté par `requireRole` — est simulé.
vi.mock('@/lib/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/db')>();
  return { ...actual, getDb: vi.fn() };
});

const { auth } = await import('@/auth');
const { getDb } = await import('@/lib/db');
const { requireRole, ForbiddenError, ModuleNotReadyError } = await import('./authz');

// `auth` est typé comme une intersection de signatures (mode Server Component,
// Middleware, Route Handler…) : `vi.mocked` résout un type d'intersection de
// fonctions sur sa DERNIÈRE signature (celle du Middleware), pas celle sans
// argument qu'on appelle ici. Le recast cible explicitement la signature
// utilisée par `requireRole` — `auth()` sans argument.
const authMock = auth as unknown as Mock<() => Promise<Session | null>>;

describe('requireRole', () => {
  beforeEach(() => vi.resetAllMocks());

  it('refuse sans session, même pour une opération ouverte à tous', async () => {
    vi.mocked(getDb).mockReturnValue(dbPrête());
    authMock.mockResolvedValue(null);
    await expect(requireRole('artists.read')).rejects.toThrow(ForbiddenError);
  });

  it('refuse quand la base est en retard, sans parler de permissions', async () => {
    vi.mocked(getDb).mockReturnValue(dbVide());
    authMock.mockResolvedValue({ user: { id: 'u1' } } as Session);
    await expect(requireRole('artists.read')).rejects.toThrow(ModuleNotReadyError);
  });

  // Contre-épreuve du correctif Sprint 2 (revue de branche, 2026-08-15 bis) :
  // `authorizeCredentials` (src/auth.ts) a été assoupli pour accepter une
  // connexion dès que les tables d'identité existent (`identityReady`), même
  // si le reste du module ne l'est pas. `requireRole()`, LUI, doit rester
  // strict : il garde `moduleReady`, à dessein — une Server Action B-Sides
  // peut toucher n'importe quelle table de domaine, pas seulement
  // l'identité. Ce test échouerait si quelqu'un « harmonisait » par erreur
  // les deux gardes sur `identityReady` : avec une base migrée jusqu'à la
  // 002 seule (identité prête, domaine absent), les opérations B-Sides
  // doivent rester refusées, avec l'erreur MODULE, pas une erreur de droits.
  it("refuse toujours les opérations B-Sides quand l'identité est prête mais pas tout le module (barre haute intentionnelle)", async () => {
    const db = dbIdentitéSeule();
    vi.mocked(getDb).mockReturnValue(db);
    authMock.mockResolvedValue({ user: { id: 'u1' } } as Session);
    await expect(requireRole('artists.read')).rejects.toThrow(ModuleNotReadyError);
  });

  it('accepte quand le rôle porte l\'opération', async () => {
    const db = dbPrête();
    const id = createUser(db, {
      email: 'c@bgm.be', passwordHash: 'h', algo: 'scrypt',
      displayName: 'C', roles: ['CURATOR'],
    });
    vi.mocked(getDb).mockReturnValue(db);
    authMock.mockResolvedValue({ user: { id } } as Session);
    await expect(requireRole('artists.write')).resolves.toMatchObject({
      roles: ['CURATOR'],
    });
  });

  it('refuse un rôle réel mais insuffisant pour l\'opération', async () => {
    const db = dbPrête();
    const id = createUser(db, {
      email: 'analyste@bgm.be', passwordHash: 'h', algo: 'scrypt',
      displayName: 'An', roles: ['ANALYST'],
    });
    vi.mocked(getDb).mockReturnValue(db);
    authMock.mockResolvedValue({ user: { id } } as Session);
    await expect(requireRole('artists.write')).rejects.toThrow(ForbiddenError);
    // Contre-épreuve : le même utilisateur passe sur une opération qu'il a.
    await expect(requireRole('artists.read')).resolves.toMatchObject({ userId: id });
  });
});
