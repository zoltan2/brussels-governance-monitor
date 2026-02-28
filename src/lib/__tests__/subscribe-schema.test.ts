// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const subscribeSchema = z.object({
  email: z.string().email(),
  locale: z.enum(['fr', 'nl', 'en', 'de']),
  topics: z.array(z.string().min(1)).min(1),
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

  it('accepts EN locale', () => {
    const result = subscribeSchema.safeParse({
      email: 'user@example.com',
      locale: 'en',
      topics: ['budget'],
    });
    expect(result.success).toBe(true);
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

  it('rejects empty string topic', () => {
    const result = subscribeSchema.safeParse({
      email: 'user@example.com',
      locale: 'fr',
      topics: [''],
    });
    expect(result.success).toBe(false);
  });

  it('accepts any non-empty topic string', () => {
    const result = subscribeSchema.safeParse({
      email: 'user@example.com',
      locale: 'fr',
      topics: ['budget', 'dossiers', 'communes', 'any-future-topic'],
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
