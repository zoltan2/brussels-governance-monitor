import { describe, it, expect } from 'vitest';
import { z } from 'zod';

import { TOPICS } from '@/lib/resend';

const subscribeSchema = z.object({
  email: z.string().email(),
  locale: z.enum(['fr', 'nl', 'en', 'de']),
  topics: z.array(z.enum(TOPICS)).min(1),
  website: z.string().max(0).optional(),
});

// Replicate the feedback schema from the API route
const feedbackSchema = z.object({
  cardTitle: z.string().min(1).max(200),
  cardType: z.string().min(1).max(50),
  cardSlug: z.string().min(1).max(100),
  feedbackType: z.enum(['error', 'correction', 'source', 'other']),
  message: z.string().min(1).max(2000),
  email: z.string().email().optional(),
  url: z.string().url().max(500),
});

describe('subscribe schema', () => {
  it('accepts valid subscription', () => {
    const result = subscribeSchema.safeParse({
      email: 'user@example.com',
      locale: 'fr',
      topics: ['budget'],
      website: '',
    });
    expect(result.success).toBe(true);
  });

  it('accepts multiple topics', () => {
    const result = subscribeSchema.safeParse({
      email: 'user@example.com',
      locale: 'nl',
      topics: ['budget', 'mobility', 'employment'],
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
      locale: 'es',
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

  it('detects honeypot bot (non-empty website field)', () => {
    const result = subscribeSchema.safeParse({
      email: 'bot@spam.com',
      locale: 'fr',
      topics: ['budget'],
      website: 'http://spam.com',
    });
    expect(result.success).toBe(false);
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
});

describe('feedback schema', () => {
  const validFeedback = {
    cardTitle: 'Budget de la Région bruxelloise',
    cardType: 'domain',
    cardSlug: 'budget',
    feedbackType: 'error' as const,
    message: 'Le chiffre du déficit semble incorrect.',
    url: 'https://brusselsgovernance.be/fr/domains/budget',
  };

  it('accepts valid feedback', () => {
    const result = feedbackSchema.safeParse(validFeedback);
    expect(result.success).toBe(true);
  });

  it('accepts feedback with optional email', () => {
    const result = feedbackSchema.safeParse({
      ...validFeedback,
      email: 'user@example.com',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty message', () => {
    const result = feedbackSchema.safeParse({
      ...validFeedback,
      message: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects message over 2000 chars', () => {
    const result = feedbackSchema.safeParse({
      ...validFeedback,
      message: 'a'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid feedback type', () => {
    const result = feedbackSchema.safeParse({
      ...validFeedback,
      feedbackType: 'complaint',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email format', () => {
    const result = feedbackSchema.safeParse({
      ...validFeedback,
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid URL', () => {
    const result = feedbackSchema.safeParse({
      ...validFeedback,
      url: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid feedback types', () => {
    for (const type of ['error', 'correction', 'source', 'other']) {
      const result = feedbackSchema.safeParse({
        ...validFeedback,
        feedbackType: type,
      });
      expect(result.success).toBe(true);
    }
  });
});
