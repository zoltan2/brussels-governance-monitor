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
    // On altère le PREMIER caractère de la signature, dont les six bits comptent.
    // L'ancien test remplaçait les deux derniers par « xx » : le dernier
    // caractère d'une signature de 32 octets ne porte que quatre bits, « …xw »
    // et « …xx » décodent donc pareil, et le test échouait une fois sur 1 024
    // (CI rouge du 15/11/2026, BXL #851). La boucle couvre ce hasard.
    for (let i = 0; i < 2000; i++) {
      const token = generateConfirmToken({ ...payload, email: `test${i}@example.com` });
      const [encoded, signature] = token.split('.') as [string, string];
      const tampered = `${encoded}.${signature[0] === 'A' ? 'B' : 'A'}${signature.slice(1)}`;
      expect(verifyConfirmToken(tampered)).toBeNull();
    }
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

  it('throws if AUTH_SECRET is not set', () => {
    vi.stubEnv('AUTH_SECRET', '');
    expect(() => generateConfirmToken(payload)).toThrow('AUTH_SECRET is required');
  });
});
