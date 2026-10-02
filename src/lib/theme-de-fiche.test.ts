// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * La clé d'un thème d'abonnement n'est pas le slug de la fiche. Jusqu'au
 * 02/10/2026 la correspondance vivait en deux copies (`resend.ts`,
 * `content.ts`) et dans les pages. Ce test lit les fiches publiées dans
 * `content/`, sans Velite : en CI les tests passent avant le build.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { cleDeTheme, DOSSIER_SLUG_TO_TOPIC } from './theme-de-fiche';
import { DOMAIN_TOPICS, SECTOR_TOPICS, COMMUNE_TOPICS } from './subscription-topics';

const CONTENU = path.resolve(__dirname, '../../content');
const slugs = (dossier: string) =>
  fs
    .readdirSync(path.join(CONTENU, dossier))
    .filter((f) => f.endsWith('.fr.mdx'))
    .map((f) => f.replace(/\.fr\.mdx$/, ''));

describe('cleDeTheme', () => {
  it('lit bien des fiches (témoin : une liste vide ne prouverait rien)', () => {
    expect(slugs('domain-cards').length).toBeGreaterThan(5);
    expect(slugs('sector-cards').length).toBeGreaterThan(5);
    expect(slugs('commune-cards')).toHaveLength(19);
    expect(slugs('dossiers').length).toBeGreaterThan(10);
  });

  it.each([
    ['domain', 'domain-cards', DOMAIN_TOPICS],
    ['sector', 'sector-cards', SECTOR_TOPICS],
    ['commune', 'commune-cards', COMMUNE_TOPICS],
  ] as const)('toute fiche %s publiée a une clé acceptée par l’API', (type, dossier, liste) => {
    const refusees = slugs(dossier).filter(
      (s) => !(liste as readonly string[]).includes(cleDeTheme(type, s)),
    );
    expect(refusees).toEqual([]);
  });

  it('dossier : préfixe, sauf les trois clés historiques', () => {
    expect(cleDeTheme('dossier', 'lez')).toBe('dossier-lez');
    expect(cleDeTheme('dossier', 'seniors-a-bruxelles')).toBe('dossier-seniors');
    expect(cleDeTheme('dossier', 'data-centers-ia-energie')).toBe('dossier-data-centers');
    expect(cleDeTheme('dossier', 'faillites-a-bruxelles')).toBe('dossier-faillites');
  });

  it('les exceptions désignent des dossiers qui existent encore', () => {
    const publies = slugs('dossiers');
    expect(Object.keys(DOSSIER_SLUG_TO_TOPIC).filter((s) => !publies.includes(s))).toEqual([]);
  });

  // Le formulaire des fiches solution envoyait `topic="solutions"`, thème que le
  // digest n'envoie jamais (retiré le 02/10/2026). Une clé écrite à la main dans
  // une page échappe à la vérification ci-dessus : elle passe donc par ici.
  it('toute page qui pose le petit formulaire calcule sa clé par cleDeTheme', () => {
    const APP = path.resolve(__dirname, '../app');
    const pages = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) return pages(p);
        return /\.tsx$/.test(e.name) && !/\.test\.tsx$/.test(e.name) ? [p] : [];
      });
    const poses = pages(APP).flatMap((p) =>
      [...fs.readFileSync(p, 'utf8').matchAll(/<CardSubscribe\s+topic=\{?([^\n]*)/g)].map(
        (m) => `${path.relative(APP, p)} : ${m[1].trim()}`,
      ),
    );
    // Quatre types de fiche, un formulaire en haut et un en bas (lot 2).
    expect(poses).toHaveLength(8);
    expect(poses.filter((l) => !/ : cleDeTheme\('(domain|sector|dossier|commune)', card\.slug\)\}( |$)/.test(l))).toEqual([]);
    expect(poses.filter((l) => l.includes('solutions'))).toEqual([]);
  });
});
