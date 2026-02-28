// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateConfirmToken, verifyConfirmToken } from '../token';

describe('token', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  const payload = { email: 'test@example.com', locale: 'fr', topics: ['budget'] };

  it('generates a token with two parts', () => {
    vi.stubEnv('AUTH_SECRET', 'test-secret-key-for-testing');
    const token = generateConfirmToken(payload);
    expect(token.split('.')).toHaveLength(2);
  });

  it('verifies a valid token', () => {
    vi.stubEnv('AUTH_SECRET', 'test-secret-key-for-testing');
    const token = generateConfirmToken(payload);
    const result = verifyConfirmToken(token);
    expect(result).not.toBeNull();
    expect(result!.email).toBe('test@example.com');
    expect(result!.locale).toBe('fr');
    expect(result!.topics).toEqual(['budget']);
  });

  it('rejects a tampered token', () => {
    vi.stubEnv('AUTH_SECRET', 'test-secret-key-for-testing');
    const token = generateConfirmToken(payload);
    const tampered = token.slice(0, -2) + 'xx';
    expect(verifyConfirmToken(tampered)).toBeNull();
  });

  it('rejects an expired token', () => {
    vi.useFakeTimers();
    vi.stubEnv('AUTH_SECRET', 'test-secret-key-for-testing');

    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    const token = generateConfirmToken(payload);

    // Advance past 48-hour expiry
    vi.advanceTimersByTime(49 * 60 * 60 * 1000);
    expect(verifyConfirmToken(token)).toBeNull();
  });

  it('rejects malformed tokens', () => {
    vi.stubEnv('AUTH_SECRET', 'test-secret-key-for-testing');
    expect(verifyConfirmToken('')).toBeNull();
    expect(verifyConfirmToken('no-dot')).toBeNull();
    expect(verifyConfirmToken('a.b.c')).toBeNull();
  });

  it('falls back to RESEND_API_KEY if AUTH_SECRET is not set', () => {
    vi.stubEnv('AUTH_SECRET', '');
    vi.stubEnv('RESEND_API_KEY', 'resend-key-for-testing');
    const token = generateConfirmToken(payload);
    const result = verifyConfirmToken(token);
    expect(result).not.toBeNull();
    expect(result!.email).toBe('test@example.com');
  });
});
