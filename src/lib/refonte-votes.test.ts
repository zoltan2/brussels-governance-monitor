import { describe, it, expect } from 'vitest';
import { createDb } from './db';
import {
  recordVoteSqlite,
  getVoteCountSqlite,
  getVoteStatsSqlite,
  type RefonteVote,
} from './refonte-votes';

const sampleVote = (over: Partial<RefonteVote> = {}): RefonteVote => ({
  axis1: 'thermometre',
  axis2: 'sobre_actuel',
  axis3: 'digest',
  axis4: 'quotidien',
  axis5: 'minimal',
  comment: '',
  email: '',
  email_optin: false,
  ...over,
});

describe('refonte-votes SQLite backend', () => {
  it('records a vote and counts it', () => {
    const db = createDb(':memory:');
    recordVoteSqlite(db, sampleVote());
    recordVoteSqlite(db, sampleVote());
    expect(getVoteCountSqlite(db)).toBe(2);
  });

  it('returns a unique id per vote', () => {
    const db = createDb(':memory:');
    const id1 = recordVoteSqlite(db, sampleVote());
    const id2 = recordVoteSqlite(db, sampleVote());
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('round-trips email_optin as a real boolean in stats', () => {
    const db = createDb(':memory:');
    recordVoteSqlite(db, sampleVote({ email: 'a@b.be', email_optin: true }));
    const { recent } = getVoteStatsSqlite(db, 10);
    expect(recent[0].email_optin).toBe(true);
    expect(recent[0].email).toBe('a@b.be');
  });

  it('returns recent votes newest-first', () => {
    const db = createDb(':memory:');
    recordVoteSqlite(db, sampleVote({ comment: 'first' }));
    recordVoteSqlite(db, sampleVote({ comment: 'second' }));
    const { recent } = getVoteStatsSqlite(db, 10);
    expect(recent.map((v) => v.comment)).toEqual(['second', 'first']);
  });

  it('aggregates a breakdown per axis option', () => {
    const db = createDb(':memory:');
    recordVoteSqlite(db, sampleVote({ axis1: 'thermometre' }));
    recordVoteSqlite(db, sampleVote({ axis1: 'thermometre' }));
    recordVoteSqlite(db, sampleVote({ axis1: 'mosaique' }));
    const { breakdown } = getVoteStatsSqlite(db, 10);
    expect(breakdown.axis1.thermometre).toBe(2);
    expect(breakdown.axis1.mosaique).toBe(1);
    // options never voted still appear at 0
    expect(breakdown.axis1.texte_fort).toBe(0);
  });
});
