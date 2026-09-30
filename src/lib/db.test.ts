import { describe, it, expect } from 'vitest';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createDb, migrerSondageEntretiens } from './db';

describe('createDb', () => {
  it('creates the refonte_votes table', () => {
    const db = createDb(':memory:');
    const row = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='refonte_votes'",
      )
      .get() as { name: string } | undefined;
    expect(row?.name).toBe('refonte_votes');
  });

  it('creates the chat_logs table', () => {
    const db = createDb(':memory:');
    const row = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='chat_logs'",
      )
      .get() as { name: string } | undefined;
    expect(row?.name).toBe('chat_logs');
  });

  it('creates the parent directory if it is missing', () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'bgm-db-'));
    const dbPath = path.join(base, 'nested', 'bgm.db'); // "nested" does not exist
    try {
      const db = createDb(dbPath);
      expect(db.prepare('SELECT 1 AS x').get()).toEqual({ x: 1 });
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  });
});

/** Schéma de sondage_entretiens tel que #662 l'a créé en production (email NOT NULL, pas de téléphone). */
const ANCIEN_SCHEMA = `
CREATE TABLE sondage_entretiens (
  id      TEXT PRIMARY KEY,
  email   TEXT NOT NULL,
  langue  TEXT NOT NULL,
  cree_le TEXT NOT NULL,
  statut  TEXT NOT NULL DEFAULT 'a_contacter'
) WITHOUT ROWID;
`;

type Col = { name: string; type: string; notnull: number; pk: number };
const colonnes = (db: DatabaseSync) =>
  (db.prepare('PRAGMA table_info(sondage_entretiens)').all() as unknown as Col[]).map((c) => ({
    name: c.name,
    type: c.type,
    notnull: c.notnull,
    pk: c.pk,
  }));
const sqlTable = (db: DatabaseSync) =>
  (db.prepare("SELECT sql FROM sqlite_master WHERE name = 'sondage_entretiens'").get() as { sql: string }).sql;

const CIBLE = [
  { name: 'id', type: 'TEXT', notnull: 1, pk: 1 },
  { name: 'email', type: 'TEXT', notnull: 0, pk: 0 },
  { name: 'telephone', type: 'TEXT', notnull: 0, pk: 0 },
  { name: 'langue', type: 'TEXT', notnull: 1, pk: 0 },
  { name: 'cree_le', type: 'TEXT', notnull: 1, pk: 0 },
  { name: 'statut', type: 'TEXT', notnull: 1, pk: 0 },
];

describe('migration de sondage_entretiens (e-mail facultatif, téléphone)', () => {
  it('base :memory: à l’ANCIEN schéma : reconstruite, lignes gardées, puis idempotente', () => {
    const db = new DatabaseSync(':memory:');
    db.exec(ANCIEN_SCHEMA);
    db.prepare(
      "INSERT INTO sondage_entretiens (id, email, langue, cree_le, statut) VALUES ('id-1', 'a@example.org', 'fr', '2026-10-12', 'contacte')",
    ).run();
    expect(colonnes(db).find((c) => c.name === 'email')?.notnull).toBe(1);

    migrerSondageEntretiens(db);
    expect(colonnes(db)).toEqual(CIBLE);
    expect(sqlTable(db)).toMatch(/WITHOUT ROWID/);
    expect(sqlTable(db)).toMatch(/CHECK \(email IS NOT NULL OR telephone IS NOT NULL\)/);
    expect(db.prepare('SELECT * FROM sondage_entretiens').all()).toEqual([
      { id: 'id-1', email: 'a@example.org', telephone: null, langue: 'fr', cree_le: '2026-10-12', statut: 'contacte' },
    ]);
    // Aucune table temporaire laissée derrière.
    expect(db.prepare("SELECT name FROM sqlite_master WHERE name LIKE 'sondage_entretiens%'").all()).toEqual([
      { name: 'sondage_entretiens' },
    ]);
    // Le téléphone seul passe désormais.
    db.prepare(
      "INSERT INTO sondage_entretiens (id, telephone, langue, cree_le) VALUES ('id-2', '0470 12 34 56', 'nl', '2026-10-13')",
    ).run();

    // Deuxième et troisième passage : rien ne change.
    const avant = { cols: colonnes(db), sql: sqlTable(db), lignes: db.prepare('SELECT * FROM sondage_entretiens ORDER BY id').all() };
    migrerSondageEntretiens(db);
    migrerSondageEntretiens(db);
    expect({ cols: colonnes(db), sql: sqlTable(db), lignes: db.prepare('SELECT * FROM sondage_entretiens ORDER BY id').all() }).toEqual(avant);
  });

  it('email déjà facultative mais sans téléphone : simple ADD COLUMN', () => {
    const db = new DatabaseSync(':memory:');
    db.exec(ANCIEN_SCHEMA.replace('email   TEXT NOT NULL', 'email   TEXT'));
    migrerSondageEntretiens(db);
    expect(colonnes(db).map((c) => c.name)).toEqual(['id', 'email', 'langue', 'cree_le', 'statut', 'telephone']);
    expect(colonnes(db).find((c) => c.name === 'telephone')?.notnull).toBe(0);
    migrerSondageEntretiens(db);
    expect(colonnes(db)).toHaveLength(6);
  });

  it('base neuve : createDb donne directement le schéma cible', () => {
    expect(colonnes(createDb(':memory:'))).toEqual(CIBLE);
  });

  it('fichier de production à l’ancien schéma : migré à l’ouverture, puis rouvert sans changement', () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'bgm-db-migr-'));
    const fichier = path.join(base, 'bgm.db');
    try {
      const ancienne = new DatabaseSync(fichier);
      ancienne.exec(ANCIEN_SCHEMA);
      ancienne.close();
      const db1 = createDb(fichier);
      expect(colonnes(db1)).toEqual(CIBLE);
      db1.close();
      const db2 = createDb(fichier);
      expect(colonnes(db2)).toEqual(CIBLE);
      db2.close();
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  });
});
