// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { adresseAlertes } from './adresse-alertes';

describe('adresseAlertes', () => {
  it('ALERT_EMAIL présent : c’est lui', () => {
    expect(adresseAlertes({ ALERT_EMAIL: 'alertes@example.net', ADMIN_EMAIL: 'admin@example.org' })).toBe(
      'alertes@example.net',
    );
  });

  it.each([[undefined], [''], ['   ']])('ALERT_EMAIL %j : repli sur ADMIN_EMAIL, l’alarme ne se tait pas', (v) => {
    expect(adresseAlertes({ ALERT_EMAIL: v, ADMIN_EMAIL: 'admin@example.org' })).toBe('admin@example.org');
  });

  it('aucune des deux : undefined', () => {
    expect(adresseAlertes({})).toBeUndefined();
  });
});

/**
 * ALERT_EMAIL est une boîte privée. Elle ne doit jamais devenir une adresse de
 * réponse, un expéditeur ni un texte de page : seul un rapport technique envoyé
 * par une tâche planifiée peut la lire.
 */
describe('ALERT_EMAIL reste privée', () => {
  const SRC = path.resolve(__dirname, '..');
  const fichiers = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) return fichiers(p);
      return /\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [p] : [];
    });
  const tous = fichiers(SRC).map((p) => [path.relative(SRC, p), fs.readFileSync(p, 'utf8')] as const);

  it('la variable n’est lue que par le module dédié', () => {
    expect(tous.filter(([, s]) => s.includes('ALERT_EMAIL')).map(([f]) => f)).toEqual(['lib/adresse-alertes.ts']);
  });

  it('le module n’est importé que par des tâches planifiées', () => {
    const importeurs = tous
      .filter(([f, s]) => f !== 'lib/adresse-alertes.ts' && s.includes('adresse-alertes'))
      .map(([f]) => f);
    expect(importeurs.length).toBeGreaterThan(0);
    expect(importeurs.filter((f) => !f.startsWith('app/api/cron/'))).toEqual([]);
  });

  it('aucun importeur ne s’en sert comme adresse de réponse ou d’expéditeur', () => {
    const fautifs = tous
      .filter(([, s]) => s.includes('adresse-alertes'))
      .filter(([, s]) => /(replyTo|reply_to|from)\s*:\s*[^,\n]*adresseAlertes|(replyTo|reply_to|from)\s*:\s*alertEmail/.test(s))
      .map(([f]) => f);
    expect(fautifs).toEqual([]);
  });
});
