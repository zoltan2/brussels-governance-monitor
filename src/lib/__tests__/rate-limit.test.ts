// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect, vi, afterEach } from 'vitest';

// Re-import for each test to reset the in-memory store
async function freshRateLimit() {
  vi.resetModules();
  const mod = await import('../rate-limit');
  return mod.rateLimit;
}

describe('rateLimit', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows the first request', async () => {
    const rateLimit = await freshRateLimit();
    const result = rateLimit('192.168.1.1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('decrements remaining with each request', async () => {
    const rateLimit = await freshRateLimit();
    rateLimit('10.0.0.1');
    rateLimit('10.0.0.1');
    const result = rateLimit('10.0.0.1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('blocks after 5 requests', async () => {
    const rateLimit = await freshRateLimit();
    for (let i = 0; i < 5; i++) {
      rateLimit('10.0.0.2');
    }
    const result = rateLimit('10.0.0.2');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('tracks IPs independently', async () => {
    const rateLimit = await freshRateLimit();
    for (let i = 0; i < 5; i++) {
      rateLimit('10.0.0.3');
    }
    const result = rateLimit('10.0.0.4');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('resets after the window expires', async () => {
    vi.useFakeTimers();
    const rateLimit = await freshRateLimit();

    for (let i = 0; i < 5; i++) {
      rateLimit('10.0.0.5');
    }
    expect(rateLimit('10.0.0.5').allowed).toBe(false);

    // Advance past the 60-second window
    vi.advanceTimersByTime(61_000);

    const result = rateLimit('10.0.0.5');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });
});
