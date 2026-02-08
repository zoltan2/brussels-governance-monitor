import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Recreate the schema from the subscribe route for isolated testing
const TOPICS = [
  'budget',
  'mobility',
  'employment',
  'housing',
  'climate',
  'social',
  'solutions',
] as const;

const subscribeSchema = z.object({
  email: z.string().email(),
  locale: z.enum(['fr', 'nl']),
  topics: z.array(z.enum(TOPICS)).min(1),
  website: z.string().max(0).optional(),
});

describe('subscribe schema', () => {
  it('accepts valid FR subscription', () => {
    const result = subscribeSchema.safeParse({
      email: 'user@example.com',
      locale: 'fr',
      topics: ['budget'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid NL subscription', () => {
    const result = subscribeSchema.safeParse({
      email: 'user@example.com',
      locale: 'nl',
      topics: ['housing', 'mobility'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = subscribeSchema.safeParse({
      email: 'not-an-email',
      locale: 'fr',
      topics: ['budget'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty email', () => {
    const result = subscribeSchema.safeParse({
      email: '',
      locale: 'fr',
      topics: ['budget'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects unsupported locale', () => {
    const result = subscribeSchema.safeParse({
      email: 'user@example.com',
      locale: 'en',
      topics: ['budget'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty topics array', () => {
    const result = subscribeSchema.safeParse({
      email: 'user@example.com',
      locale: 'fr',
      topics: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid topic', () => {
    const result = subscribeSchema.safeParse({
      email: 'user@example.com',
      locale: 'fr',
      topics: ['invalid-topic'],
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid topics', () => {
    const result = subscribeSchema.safeParse({
      email: 'user@example.com',
      locale: 'fr',
      topics: ['budget', 'mobility', 'employment', 'housing', 'climate', 'social', 'solutions'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty honeypot field', () => {
    const result = subscribeSchema.safeParse({
      email: 'user@example.com',
      locale: 'fr',
      topics: ['budget'],
      website: '',
    });
    expect(result.success).toBe(true);
  });

  it('rejects filled honeypot field (bot)', () => {
    const result = subscribeSchema.safeParse({
      email: 'user@example.com',
      locale: 'fr',
      topics: ['budget'],
      website: 'http://spam.com',
    });
    expect(result.success).toBe(false);
  });
});
