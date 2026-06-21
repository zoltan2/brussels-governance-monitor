import { describe, it, expect, beforeAll } from 'vitest';

// Isolated file: DB_PATH is set before the modules are imported, so their
// lazy getDb() singleton resolves to an in-memory SQLite backend. Verifies the
// public API routes to SQLite (not Redis, not the console fallback) when a DB
// is configured.
describe('store selection via DB_PATH', () => {
  beforeAll(() => {
    process.env.DB_PATH = ':memory:';
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.KV_REST_API_URL;
  });

  it('recordVote persists to SQLite and getVoteCount reflects it', async () => {
    const { recordVote, getVoteCount } = await import('./refonte-votes');
    await recordVote({
      axis1: 'thermometre',
      axis2: 'sobre_actuel',
      axis3: 'digest',
      axis4: 'quotidien',
      axis5: 'minimal',
      comment: '',
      email: '',
      email_optin: false,
    });
    expect(await getVoteCount()).toBe(1);
  });

  it('isVoteStoreConfigured is true when a DB is configured', async () => {
    const { isVoteStoreConfigured } = await import('./refonte-votes');
    expect(isVoteStoreConfigured()).toBe(true);
  });

  it('chat logs persist to SQLite via the public API', async () => {
    const { pushLog, readLogs } = await import('./chat-logs');
    pushLog('usage', { q: 'via-public' });
    const out = await readLogs<{ q: string }>('usage', 100);
    expect(out).toEqual([{ q: 'via-public' }]);
  });
});
