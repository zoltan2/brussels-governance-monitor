// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const subscribeSchema = z.object({
  email: z.string().email(),
  locale: z.enum(['fr', 'nl', 'en', 'de']),
  topics: z.array(z.string().min(1)).min(1),
});

describe('subscribe validation', () => {
  it('accepts valid input', () => {
    const result = subscribeSchema.safeParse({
      email: 'test@example.com',
      locale: 'fr',
      topics: ['budget'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts multiple topics', () => {
    const result = subscribeSchema.safeParse({
      email: 'user@test.be',
      locale: 'nl',
      topics: ['budget', 'mobility', 'housing'],
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
      email: 'test@example.com',
      locale: 'en',
      topics: ['budget'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects unsupported locale', () => {
    const result = subscribeSchema.safeParse({
      email: 'test@example.com',
      locale: 'es',
      topics: ['budget'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty topics array', () => {
    const result = subscribeSchema.safeParse({
      email: 'test@example.com',
      locale: 'fr',
      topics: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty string topic', () => {
    const result = subscribeSchema.safeParse({
      email: 'test@example.com',
      locale: 'fr',
      topics: [''],
    });
    expect(result.success).toBe(false);
  });

  it('accepts any non-empty topic', () => {
    const result = subscribeSchema.safeParse({
      email: 'test@example.com',
      locale: 'fr',
      topics: ['dossiers', 'communes', 'any-future-card'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing fields', () => {
    const result = subscribeSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
