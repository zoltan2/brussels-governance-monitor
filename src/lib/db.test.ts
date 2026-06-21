import { describe, it, expect } from 'vitest';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { createDb } from './db';

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
