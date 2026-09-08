// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Le journal des précommandes est la réponse au sinistre du 08/09/2026 :
 * quatre mois de précommandes perdues parce que leur seule trace vivait chez
 * Resend, qui a cessé de créer les contacts en silence et n'archive ses
 * emails que 30 jours.
 *
 * Ces tests verrouillent les trois propriétés dont le récap du mardi dépend :
 * on retrouve ce qu'on a écrit, une même personne ne compte qu'une fois, et
 * la fenêtre de sept jours exclut réellement ce qui la précède.
 */
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'bgm-preorders-'));
process.env.DB_PATH = join(dir, 'test.db');

const { recordPreorder, listPreordersSince } = await import('./preorder-log');
const { getDb } = await import('./db');

const DAY = 24 * 60 * 60 * 1000;

beforeEach(() => {
  getDb()?.exec('DELETE FROM book_preorders');
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('journal des précommandes', () => {
  it('retrouve une précommande enregistrée dans la fenêtre', async () => {
    await recordPreorder({ email: 'nathalie@example.be', firstName: 'Nathalie' });

    const rows = await listPreordersSince(Date.now() - 7 * DAY);

    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe('nathalie@example.be');
    expect(rows[0].firstName).toBe('Nathalie');
  });

  it("ne compte qu'une fois quelqu'un qui envoie le formulaire deux fois", async () => {
    await recordPreorder({ email: 'marc@example.be', firstName: 'Marc' });
    await recordPreorder({ email: 'marc@example.be', firstName: 'Marc' });

    const rows = await listPreordersSince(Date.now() - 7 * DAY);

    expect(rows).toHaveLength(1);
  });

  it('traite la même adresse écrite différemment comme une seule personne', async () => {
    await recordPreorder({ email: 'Alixe@Example.be', firstName: 'Alixe' });
    await recordPreorder({ email: ' alixe@example.be ', firstName: 'Alixe' });

    const rows = await listPreordersSince(Date.now() - 7 * DAY);

    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe('alixe@example.be');
  });

  it('exclut ce qui précède la fenêtre demandée', async () => {
    await recordPreorder({ email: 'ancien@example.be', firstName: 'Ancien' });
    getDb()!
      .prepare('UPDATE book_preorders SET created_at = ?')
      .run(Date.now() - 30 * DAY);

    await recordPreorder({ email: 'recent@example.be', firstName: 'Recent' });

    const rows = await listPreordersSince(Date.now() - 7 * DAY);

    expect(rows.map((r) => r.email)).toEqual(['recent@example.be']);
  });

  it('rend les précommandes de la plus ancienne à la plus récente', async () => {
    await recordPreorder({ email: 'un@example.be', firstName: 'Un' });
    getDb()!
      .prepare('UPDATE book_preorders SET created_at = ? WHERE email = ?')
      .run(Date.now() - 3 * DAY, 'un@example.be');
    await recordPreorder({ email: 'deux@example.be', firstName: 'Deux' });

    const rows = await listPreordersSince(Date.now() - 7 * DAY);

    expect(rows.map((r) => r.email)).toEqual([
      'un@example.be',
      'deux@example.be',
    ]);
  });
});
