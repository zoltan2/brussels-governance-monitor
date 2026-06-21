import { describe, it, expect } from 'vitest';
import { createDb } from './db';
import { pushLogSqlite, readLogsSqlite, pruneLogsSqlite } from './chat-logs';

describe('chat-logs SQLite backend', () => {
  it('round-trips an entry as a parsed object', () => {
    const db = createDb(':memory:');
    pushLogSqlite(db, 'usage', { q: 'hello', n: 1 });
    const out = readLogsSqlite<{ q: string; n: number }>(db, 'usage', 100);
    expect(out).toEqual([{ q: 'hello', n: 1 }]);
  });

  it('returns entries chronological (oldest first)', () => {
    const db = createDb(':memory:');
    pushLogSqlite(db, 'usage', { i: 1 });
    pushLogSqlite(db, 'usage', { i: 2 });
    pushLogSqlite(db, 'usage', { i: 3 });
    const out = readLogsSqlite<{ i: number }>(db, 'usage', 100);
    expect(out.map((e) => e.i)).toEqual([1, 2, 3]);
  });

  it('limit returns the most recent N, still chronological', () => {
    const db = createDb(':memory:');
    for (let i = 1; i <= 5; i++) pushLogSqlite(db, 'usage', { i });
    const out = readLogsSqlite<{ i: number }>(db, 'usage', 2);
    expect(out.map((e) => e.i)).toEqual([4, 5]);
  });

  it('isolates streams from each other', () => {
    const db = createDb(':memory:');
    pushLogSqlite(db, 'usage', { s: 'u' });
    pushLogSqlite(db, 'errors', { s: 'e' });
    expect(readLogsSqlite(db, 'usage', 100)).toEqual([{ s: 'u' }]);
    expect(readLogsSqlite(db, 'errors', 100)).toEqual([{ s: 'e' }]);
  });

  it('prune keeps only the latest N of a stream', () => {
    const db = createDb(':memory:');
    for (let i = 1; i <= 5; i++) pushLogSqlite(db, 'usage', { i });
    pushLogSqlite(db, 'errors', { keep: 'me' });
    pruneLogsSqlite(db, 'usage', 2);
    expect(readLogsSqlite<{ i: number }>(db, 'usage', 100).map((e) => e.i)).toEqual([4, 5]);
    // other streams untouched
    expect(readLogsSqlite(db, 'errors', 100)).toEqual([{ keep: 'me' }]);
  });
});
