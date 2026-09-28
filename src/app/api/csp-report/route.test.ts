// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resumerRapportsCsp } from '@/lib/csp-report';

const limite = vi.fn(() => ({ allowed: true, remaining: 1 }));
vi.mock('@/lib/rate-limit', () => ({ rateLimit: () => limite() }));

const { POST } = await import('./route');

const ANCIEN = JSON.stringify({
  'csp-report': {
    'document-uri': 'https://governance.brussels/fr/preferences?token=JETON-SECRET#x',
    'effective-directive': 'script-src-elem',
    'violated-directive': 'script-src-elem',
    'blocked-uri': 'https://evil.example.com/x.js?q=1',
    'source-file': 'https://governance.brussels/_next/static/chunks/a.js?v=2',
    'line-number': 12,
    disposition: 'enforce',
  },
});

const REPORTING_API = JSON.stringify([
  {
    type: 'csp-violation',
    url: 'https://governance.brussels/fr?email=a@b.be',
    user_agent: 'Mozilla/5.0',
    body: {
      documentURL: 'https://governance.brussels/fr?email=a@b.be',
      effectiveDirective: 'script-src',
      blockedURL: 'eval',
      disposition: 'enforce',
    },
  },
  { type: 'network-error', body: { effectiveDirective: 'x' } },
]);

function requete(corps: string): Request {
  return new Request('https://governance.brussels/api/csp-report', {
    method: 'POST',
    headers: { 'content-type': 'application/csp-report', 'x-forwarded-for': '203.0.113.9' },
    body: corps,
  });
}

beforeEach(() => {
  limite.mockReturnValue({ allowed: true, remaining: 1 });
});

describe('resumerRapportsCsp', () => {
  it('garde directive, origine bloquée et chemin, sans requête ni fragment', () => {
    expect(resumerRapportsCsp(ANCIEN)).toEqual([
      {
        directive: 'script-src-elem',
        bloque: 'https://evil.example.com',
        page: 'https://governance.brussels/fr/preferences',
        source: 'https://governance.brussels/_next/static/chunks/a.js',
        ligne: 12,
        disposition: 'enforce',
      },
    ]);
  });

  it('lit le format de la Reporting API et ignore les autres types', () => {
    expect(resumerRapportsCsp(REPORTING_API)).toEqual([
      {
        directive: 'script-src',
        bloque: 'eval',
        page: 'https://governance.brussels/fr',
        source: undefined,
        ligne: undefined,
        disposition: 'enforce',
      },
    ]);
  });

  it('ne journalise jamais plus de 5 rapports par envoi', () => {
    const lot = JSON.parse(REPORTING_API)[0];
    expect(resumerRapportsCsp(JSON.stringify(Array(50).fill(lot)))).toHaveLength(5);
  });

  it('rend une liste vide sur un corps quelconque', () => {
    expect(resumerRapportsCsp('pas du json')).toEqual([]);
    expect(resumerRapportsCsp('{"autre":1}')).toEqual([]);
  });
});

describe('POST /api/csp-report', () => {
  it('journalise sans jeton, adresse ni agent, et répond 204', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await POST(requete(ANCIEN));
    expect(res.status).toBe(204);
    expect(warn).toHaveBeenCalledTimes(1);
    const ligne = String(warn.mock.calls[0][0]);
    expect(ligne.startsWith('[csp-violation] ')).toBe(true);
    expect(ligne).not.toContain('JETON-SECRET');
    expect(ligne).not.toContain('203.0.113.9');
    const res2 = await POST(requete(REPORTING_API));
    expect(res2.status).toBe(204);
    expect(String(warn.mock.calls[1][0])).not.toContain('a@b.be');
    expect(String(warn.mock.calls[1][0])).not.toContain('Mozilla');
    warn.mockRestore();
  });

  it('refuse un corps de plus de 8 Kio', async () => {
    const res = await POST(requete('x'.repeat(9 * 1024)));
    expect(res.status).toBe(413);
  });

  it('refuse au-delà du plafond de débit', async () => {
    limite.mockReturnValue({ allowed: false, remaining: 0 });
    const res = await POST(requete(ANCIEN));
    expect(res.status).toBe(429);
  });
});

describe('CSP servie par next.config.ts', () => {
  // Lue sur disque : le plugin next-intl rend la configuration inévaluable ici.
  const config = readFileSync(join(process.cwd(), 'next.config.ts'), 'utf-8');

  it('envoie ses violations à cette route, par report-uri seul', () => {
    expect(config).toContain("'report-uri /api/csp-report'");
    // `report-to` ferait ignorer `report-uri` par Chromium : voir next.config.ts.
    expect(config).not.toMatch(/'report-to /);
  });
});
