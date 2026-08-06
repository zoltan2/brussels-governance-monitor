// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect } from 'vitest';
import { GET } from './route';

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  it('exposes the build commit, so a post-deploy check can tell versions apart', async () => {
    const previous = process.env.BUILD_SHA;
    process.env.BUILD_SHA = 'abc1234';
    try {
      const body = await GET().json();
      expect(body.version).toBe('abc1234');
    } finally {
      if (previous === undefined) delete process.env.BUILD_SHA;
      else process.env.BUILD_SHA = previous;
    }
  });

  it('falls back to unknown outside the Docker image', async () => {
    const previous = process.env.BUILD_SHA;
    delete process.env.BUILD_SHA;
    try {
      const body = await GET().json();
      expect(body.version).toBe('unknown');
    } finally {
      if (previous !== undefined) process.env.BUILD_SHA = previous;
    }
  });
});
