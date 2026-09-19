// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});

vi.mock('@/auth', () => ({ auth: () => auth() }));
vi.mock('next/navigation', () => ({ redirect: (url: string) => redirect(url) }));

const { requireAdmin } = await import('./require-admin');

describe('requireAdmin', () => {
  beforeEach(() => {
    auth.mockReset();
    redirect.mockClear();
  });

  it('laisse passer une session valide', async () => {
    auth.mockResolvedValue({ user: { email: 'admin@example.org' } });
    await expect(requireAdmin('fr')).resolves.toBeUndefined();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('redirige vers la connexion sans session, dans la langue demandée', async () => {
    auth.mockResolvedValue(null);
    await expect(requireAdmin('nl')).rejects.toThrow(
      'NEXT_REDIRECT:/nl/login?callbackUrl=%2Fnl%2Fadmin',
    );
  });

  it('retombe sur la langue par défaut quand la langue est absente ou inventée', async () => {
    auth.mockResolvedValue(null);
    for (const locale of [undefined, 'xx', '../evil']) {
      redirect.mockClear();
      await expect(requireAdmin(locale)).rejects.toThrow('NEXT_REDIRECT:/fr/login');
    }
  });
});

/**
 * Le contrôle du layout ne protège pas les pages : Next les rend quand même et
 * leur charge RSC part avec la réponse 307 (fuite constatée en production le
 * 19/09/2026). Chaque page serveur sous admin/ et review/ doit donc appeler
 * requireAdmin elle-même. Ce test échoue si une nouvelle page l'oublie.
 */
describe('toutes les pages admin et relecture contrôlent la session', () => {
  const roots = ['src/app/[locale]/admin', 'src/app/[locale]/review'];

  function pages(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) return pages(full);
      return entry.name === 'page.tsx' ? [full] : [];
    });
  }

  const found = roots.flatMap((root) => pages(root));

  it('trouve les pages à contrôler', () => {
    expect(found.length).toBeGreaterThanOrEqual(8);
  });

  it.each(found)('%s appelle requireAdmin', (file) => {
    const source = readFileSync(file, 'utf8');
    expect(source).toContain('await requireAdmin(');
  });

  it.each(found)('%s ne charge rien avant le contrôle', (file) => {
    const source = readFileSync(file, 'utf8');
    const body = source.slice(source.indexOf('export default'));
    const guard = body.indexOf('await requireAdmin(');
    const firstOtherAwait = body.search(/await (?!params;?\n|params\b|requireAdmin\()/);
    expect(guard).toBeGreaterThan(-1);
    if (firstOtherAwait !== -1) expect(guard).toBeLessThan(firstOtherAwait);
  });
});
