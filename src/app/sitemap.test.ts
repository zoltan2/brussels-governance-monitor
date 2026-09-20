// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Correctif lisibilité SEO (2026-09-20) : toutes les routes de staticPaths
 * recevaient SITE_LAUNCH comme lastModified, sauf la page d'accueil.
 * Constaté en production : /fr/radar annonçait le 12/02/2026 alors que son
 * contenu change à chaque veille, et les pages explicatives annonçaient la
 * même date alors que certaines ont été réécrites depuis. Google recevait
 * donc « inchangé depuis le lancement » pour des pages vivantes.
 *
 * Ces tests requièrent la sortie de build Velite (.velite/), comme
 * src/lib/__tests__/content.test.ts et src/lib/__tests__/changelog.test.ts.
 */
import { describe, it, expect, vi } from 'vitest';
import { getRadarLastModifiedDate } from '@/lib/radar';
import { getLatestChangelogDate } from '@/lib/changelog';
import { EXPLAINER_LAST_MODIFIED } from '@/lib/explainer-dates';
import { routing } from '@/i18n/routing';

/**
 * Chemin localisé réel d'un href statique, lu dans routing.pathnames (la
 * même config que next-intl utilise en production) : un href absent de la
 * table (pas de traduction dédiée) garde sa forme telle quelle, comme le
 * fait next-intl.
 */
function cheminLocalise(locale: string, href: string): string {
  const table = routing.pathnames as Record<string, string | Record<string, string>>;
  const entry = table[href];
  const local = typeof entry === 'string' ? entry : (entry?.[locale] ?? href);
  return local === '/' ? `/${locale}` : `/${locale}${local}`;
}

/**
 * Chemin pour un href paramétré ({ pathname: '/domains/[slug]', params }),
 * utilisé par les sections domaines/secteurs/comparaisons/communes/archives
 * du sitemap avant les routes statiques que ce fichier vérifie : ce test ne
 * porte pas sur ces sections (couvertes ailleurs), seule l'absence de crash
 * compte ici. Substitution naïve des segments [xxx], suffisante pour ça.
 */
function cheminParametre(
  locale: string,
  href: { pathname: string; params?: Record<string, string> },
): string {
  let pathname = href.pathname;
  for (const [key, value] of Object.entries(href.params ?? {})) {
    pathname = pathname.replace(`[${key}]`, value);
  }
  return `/${locale}${pathname}`;
}

// sitemap.ts résout les chemins localisés via next-intl, qui importe
// next/navigation et ne charge pas sous vitest — même contrainte et même
// remède que src/lib/metadata.test.ts. Rejoue routing.pathnames plutôt que
// de deviner un mapping séparé, pour rester fidèle au routage réel des
// routes statiques que ce fichier vérifie.
vi.mock('@/i18n/navigation', () => ({
  getPathname: ({ locale, href }: { locale: string; href: unknown }) => {
    if (typeof href === 'string') return cheminLocalise(locale, href);
    if (href && typeof href === 'object' && 'pathname' in href) {
      return cheminParametre(locale, href as { pathname: string; params?: Record<string, string> });
    }
    throw new Error(`Href inattendu dans le mock de getPathname : ${JSON.stringify(href)}`);
  },
}));

let hasVeliteData = false;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../../.velite');
  hasVeliteData = true;
} catch {
  // Velite data not available
}

const describeWithData = hasVeliteData ? describe : describe.skip;

const SITE_LAUNCH_ISO = '2026-02-12';

async function buildSitemap() {
  const { default: sitemap } = await import('./sitemap');
  return sitemap();
}

function findFr(entries: Awaited<ReturnType<typeof buildSitemap>>, href: string) {
  const url = `https://governance.brussels${cheminLocalise('fr', href)}`;
  return entries.find((e) => e.url === url);
}

function dateISO(entry: { lastModified?: Date | string }): string {
  return new Date(entry.lastModified as Date).toISOString().slice(0, 10);
}

describeWithData('sitemap()', () => {
  it('/fr/radar prend la date du radar (lastVeille), pas la date de lancement', async () => {
    const entries = await buildSitemap();
    const entry = findFr(entries, '/radar');
    expect(entry).toBeDefined();
    const attendu = getRadarLastModifiedDate();
    expect(dateISO(entry!)).toBe(attendu.toISOString().slice(0, 10));
    // Preuve directe de la régression constatée en prod : ce n'est plus le
    // 12 février 2026 (SITE_LAUNCH), sauf si le radar lui-même datait de ce
    // jour-là (jamais le cas ici : data/radar.json a une veille récente).
    expect(dateISO(entry!)).not.toBe(SITE_LAUNCH_ISO);
  });

  it('/fr/changelog (mises-a-jour) prend la date de la dernière entrée du changelog', async () => {
    const entries = await buildSitemap();
    const entry = findFr(entries, '/changelog');
    expect(entry).toBeDefined();
    const attendu = getLatestChangelogDate();
    expect(dateISO(entry!)).toBe(attendu.toISOString().slice(0, 10));
    expect(dateISO(entry!)).not.toBe(SITE_LAUNCH_ISO);
  });

  it('/fr/explainers/brussels-paradox prend sa date de réécriture (19/09/2026), pas la date de lancement', async () => {
    const entries = await buildSitemap();
    const entry = findFr(entries, '/explainers/brussels-paradox');
    expect(entry).toBeDefined();
    expect(dateISO(entry!)).toBe('2026-09-19');
  });

  it('/fr/explainers/cocom (sans réécriture connue) garde la date de lancement', async () => {
    const entries = await buildSitemap();
    const entry = findFr(entries, '/explainers/cocom');
    expect(entry).toBeDefined();
    expect(dateISO(entry!)).toBe(SITE_LAUNCH_ISO);
  });

  it('couvre bien toutes les routes explicatives listées dans le sitemap, chacune avec la date de sa table', async () => {
    const entries = await buildSitemap();
    for (const [slug, attendu] of Object.entries(EXPLAINER_LAST_MODIFIED)) {
      const entry = findFr(entries, `/explainers/${slug}`);
      expect(entry, `route /explainers/${slug} absente du sitemap`).toBeDefined();
      expect(dateISO(entry!), `date de /explainers/${slug}`).toBe(attendu);
    }
  });

  it.each(['/privacy', '/legal', '/accessibility', '/press', '/support'])(
    '%s (page figée) garde la date de lancement',
    async (href) => {
      const entries = await buildSitemap();
      const entry = findFr(entries, href);
      expect(entry).toBeDefined();
      expect(dateISO(entry!)).toBe(SITE_LAUNCH_ISO);
    },
  );
});
