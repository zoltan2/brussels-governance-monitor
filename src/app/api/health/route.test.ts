// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect } from 'vitest';
import { GET } from './route';
import { onRequestError } from '@/instrumentation';
import { viderErreursRendu } from '@/lib/render-errors';

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

describe('GET /api/health : erreurs de rendu', () => {
  it('publie les régénérations ISR en échec notées par onRequestError', async () => {
    viderErreursRendu();
    expect((await GET().json()).renderErrors).toEqual({ total24h: 0, revalidation24h: 0, derniere: null });

    // Même chemin que Next en production : instrumentation.ts → noterErreurRendu.
    await onRequestError(
      new Error('boom'),
      { path: '/fr', method: 'GET', headers: {} },
      {
        routerKind: 'App Router',
        routePath: '/[locale]',
        routeType: 'render',
        renderSource: 'server-rendering',
        revalidateReason: 'stale',
      },
    );
    const body = await GET().json();
    expect(body.status).toBe('ok');
    expect(body.renderErrors.total24h).toBe(1);
    expect(body.renderErrors.revalidation24h).toBe(1);
    expect(body.renderErrors.derniere).toMatchObject({ routePath: '/[locale]', revalidateReason: 'stale' });
    // Route publique : jamais le message de l'erreur.
    expect(JSON.stringify(body)).not.toContain('boom');
    viderErreursRendu();
  });
});
