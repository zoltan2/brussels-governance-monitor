// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Le journal des précommandes est la réponse au sinistre du 08/09/2026 :
 * quatre mois de précommandes perdues parce que leur seule trace vivait chez
 * Resend, qui a cessé de créer les contacts en silence et n'archive ses
 * emails que 30 jours.
 *
 * Ces tests verrouillent les propriétés dont le récap du mardi dépend : on
 * retrouve ce qu'on a écrit, une même personne ne compte qu'une fois, la
 * fenêtre exclut réellement ce qui la précède, et deux récaps successifs
 * couvrent chaque précommande une fois et une seule, même quand l'heure
 * change ou que systemd rattrape un envoi manqué.
 */
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'bgm-preorders-'));
process.env.DB_PATH = join(dir, 'test.db');

const {
  recordPreorder,
  listPreordersBetween,
  recapWindow,
  readRecapCursor,
  saveRecapCursor,
} = await import('./preorder-log');
const { getDb } = await import('./db');

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

beforeEach(() => {
  getDb()?.exec('DELETE FROM book_preorders');
  getDb()?.exec('DELETE FROM cron_cursors');
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('journal des précommandes', () => {
  it('retrouve une précommande enregistrée dans la fenêtre', async () => {
    await recordPreorder({ email: 'nathalie@example.be', firstName: 'Nathalie' });

    const rows = await listPreordersBetween(Date.now() - 7 * DAY, Date.now());

    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe('nathalie@example.be');
    expect(rows[0].firstName).toBe('Nathalie');
  });

  it("ne compte qu'une fois quelqu'un qui envoie le formulaire deux fois", async () => {
    await recordPreorder({ email: 'marc@example.be', firstName: 'Marc' });
    await recordPreorder({ email: 'marc@example.be', firstName: 'Marc' });

    const rows = await listPreordersBetween(Date.now() - 7 * DAY, Date.now());

    expect(rows).toHaveLength(1);
  });

  it('traite la même adresse écrite différemment comme une seule personne', async () => {
    await recordPreorder({ email: 'Alixe@Example.be', firstName: 'Alixe' });
    await recordPreorder({ email: ' alixe@example.be ', firstName: 'Alixe' });

    const rows = await listPreordersBetween(Date.now() - 7 * DAY, Date.now());

    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe('alixe@example.be');
  });

  it('exclut ce qui précède la fenêtre demandée', async () => {
    await recordPreorder({ email: 'ancien@example.be', firstName: 'Ancien' });
    getDb()!
      .prepare('UPDATE book_preorders SET created_at = ?')
      .run(Date.now() - 30 * DAY);

    await recordPreorder({ email: 'recent@example.be', firstName: 'Recent' });

    const rows = await listPreordersBetween(Date.now() - 7 * DAY, Date.now());

    expect(rows.map((r) => r.email)).toEqual(['recent@example.be']);
  });

  it('rend les précommandes de la plus ancienne à la plus récente', async () => {
    await recordPreorder({ email: 'un@example.be', firstName: 'Un' });
    getDb()!
      .prepare('UPDATE book_preorders SET created_at = ? WHERE email = ?')
      .run(Date.now() - 3 * DAY, 'un@example.be');
    await recordPreorder({ email: 'deux@example.be', firstName: 'Deux' });

    const rows = await listPreordersBetween(Date.now() - 7 * DAY, Date.now());

    expect(rows.map((r) => r.email)).toEqual([
      'un@example.be',
      'deux@example.be',
    ]);
  });
});

describe('fenêtre du récap', () => {
  const NOW = Date.parse('2026-09-22T07:00:00Z');

  it('repart des 168 h de l’ancien calcul au tout premier passage', () => {
    expect(recapWindow(null, NOW)).toEqual({ after: NOW - 7 * DAY, until: NOW });
  });

  it('reprend au curseur, quel que soit l’écart avec maintenant', () => {
    const cursor = NOW - 169 * HOUR;

    expect(recapWindow(cursor, NOW)).toEqual({ after: cursor, until: NOW });
  });

  it('ne fait jamais reculer le curseur quand l’horloge recule', () => {
    const cursor = NOW + HOUR;

    expect(recapWindow(cursor, NOW)).toEqual({ after: cursor, until: cursor });
  });

  it('conserve le curseur et le remplace au passage suivant', async () => {
    expect(await readRecapCursor()).toBeNull();

    await saveRecapCursor(NOW);
    expect(await readRecapCursor()).toBe(NOW);

    await saveRecapCursor(NOW + 7 * DAY);
    expect(await readRecapCursor()).toBe(NOW + 7 * DAY);
  });
});

describe('récaps successifs', () => {
  /** Une précommande horodatée à `iso`, par le vrai chemin d'écriture. */
  async function preorderAt(iso: string, email: string): Promise<void> {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(iso));
    await recordPreorder({ email, firstName: 'X' });
    vi.useRealTimers();
  }

  /** Un passage du récap tel que le fait la route, envoi réussi compris. */
  async function recap(iso: string): Promise<string[]> {
    const { after, until } = recapWindow(await readRecapCursor(), Date.parse(iso));
    const rows = await listPreordersBetween(after, until);
    await saveRecapCursor(until);
    return rows.map((r) => r.email);
  }

  it("couvre l'heure de plus du passage à l'heure d'hiver (169 h)", async () => {
    const mardi1 = '2026-10-20T07:00:00Z'; // 09:00 heure d'été
    const mardi2 = '2026-10-27T08:00:00Z'; // 09:00 heure d'hiver
    expect(Date.parse(mardi2) - Date.parse(mardi1)).toBe(169 * HOUR);

    await recap(mardi1);
    const iso = '2026-10-20T07:30:00Z';
    await preorderAt(iso, 'heure-perdue@example.be');

    // L'ancienne fenêtre glissante ne voyait jamais cette précommande.
    expect(Date.parse(iso)).toBeLessThan(Date.parse(mardi2) - 7 * DAY);
    expect(await recap(mardi2)).toEqual(['heure-perdue@example.be']);
  });

  it("ne compte pas deux fois l'heure du passage à l'heure d'été (167 h)", async () => {
    const mardi1 = '2027-03-23T08:00:00Z'; // 09:00 heure d'hiver
    const mardi2 = '2027-03-30T07:00:00Z'; // 09:00 heure d'été
    expect(Date.parse(mardi2) - Date.parse(mardi1)).toBe(167 * HOUR);

    await recap('2027-03-16T08:00:00Z');
    const iso = '2027-03-23T07:30:00Z';
    await preorderAt(iso, 'heure-doublee@example.be');

    expect(await recap(mardi1)).toEqual(['heure-doublee@example.be']);
    // L'ancienne fenêtre glissante la recomptait le mardi suivant.
    expect(Date.parse(iso)).toBeGreaterThan(Date.parse(mardi2) - 7 * DAY);
    expect(await recap(mardi2)).toEqual([]);
  });

  it('ni trou ni doublon après un rattrapage tardif de systemd', async () => {
    // Mardi 22/09 manqué (machine éteinte) : `Persistent=true` rattrape le
    // mercredi 23/09 à 10:30, puis le rythme normal reprend le mardi 29/09.
    await recap('2026-09-15T07:00:00Z');
    await preorderAt('2026-09-16T07:00:00Z', 'mercredi@example.be');
    await preorderAt('2026-09-22T12:00:00Z', 'mardi@example.be');

    // L'ancienne fenêtre du rattrapage démarrait le 16/09 à 08:30 UTC et
    // perdait la première précommande.
    expect(await recap('2026-09-23T08:30:00Z')).toEqual([
      'mercredi@example.be',
      'mardi@example.be',
    ]);

    await preorderAt('2026-09-25T12:00:00Z', 'vendredi@example.be');

    // L'ancienne fenêtre du 29/09 démarrait le 22/09 à 07:00 UTC et
    // recomptait « mardi ».
    expect(await recap('2026-09-29T07:00:00Z')).toEqual(['vendredi@example.be']);
  });
});
