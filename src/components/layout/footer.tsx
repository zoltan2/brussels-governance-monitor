// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { useTranslations, useLocale } from 'next-intl';
import { NavLink } from './nav-link';
// `/livre` vit hors du segment [locale] : il lui faut le Link brut de Next,
// qui ne préfixe pas la locale, là où celui de @/i18n/navigation le ferait.
import NextLink from 'next/link';
import { dailyGame } from '@/lib/daily-game';
import { SupportBanner } from '@/components/support-cta';

export function Footer() {
  const t = useTranslations('footer');
  const locale = useLocale();
  const game = dailyGame(locale);
  return (
    <footer className="border-t border-neutral-200 bg-neutral-50">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <SupportBanner position="pied-de-page" className="mb-8" />

        <div className="grid gap-8 sm:grid-cols-3">
          {/* Column 1: Explorer */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              {t('explorerTitle')}
            </p>
            <nav aria-label={t('explorerTitle')} className="flex flex-col gap-1 text-xs text-neutral-600 [&>a]:py-1 [&>a]:min-h-[24px]">
              <NavLink zone="pied-de-page" href="/domains" className="hover:text-neutral-700">
                {t('domains')}
              </NavLink>
              <NavLink zone="pied-de-page" href="/sectors" className="hover:text-neutral-700">
                {t('sectors')}
              </NavLink>
              <NavLink zone="pied-de-page" href="/solutions" className="hover:text-neutral-700">
                {t('solutions')}
              </NavLink>
              <NavLink zone="pied-de-page" href="/comparisons" className="hover:text-neutral-700">
                {t('comparisons')}
              </NavLink>
              <NavLink zone="pied-de-page" href="/communes" className="hover:text-neutral-700">
                {t('communes')}
              </NavLink>
              <NavLink zone="pied-de-page" href="/dossiers" className="hover:text-neutral-700">
                {t('dossiers')}
              </NavLink>
              <NavLink zone="pied-de-page" href="/quiz" className="hover:text-neutral-700">
                {t('quiz')}
              </NavLink>
            </nav>
          </div>

          {/* Column 2: Comprendre */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              {t('comprendreTitle')}
            </p>
            <nav aria-label={t('comprendreTitle')} className="flex flex-col gap-1 text-xs text-neutral-600 [&>a]:py-1 [&>a]:min-h-[24px]">
              <NavLink zone="pied-de-page" href="/timeline" className="hover:text-neutral-700">
                {t('timeline')}
              </NavLink>
              <NavLink zone="pied-de-page" href="/glossary" className="hover:text-neutral-700">
                {t('glossary')}
              </NavLink>
              <NavLink zone="pied-de-page" href="/faq" className="hover:text-neutral-700">
                {t('faq')}
              </NavLink>
              <NavLink zone="pied-de-page" href="/data" className="hover:text-neutral-700">
                {t('data')}
              </NavLink>
              <NavLink zone="pied-de-page" href="/changelog" className="hover:text-neutral-700">
                {t('changelog')}
              </NavLink>
              <NavLink zone="pied-de-page" href="/radar" className="hover:text-neutral-700">
                {t('radar')}
              </NavLink>
              {/* PROTOTYPE : le podcast est en pause, le jeu du jour prend sa place.
                  Le Stuut n'existe qu'en FR, Amai ! prend le relais dans les autres langues. */}
              <a
                href={game.url}
                // Nouvel onglet : le traceur n'empêche pas la navigation, l'attribut suffit.
                data-umami-event="navigation-clic"
                data-umami-event-zone="pied-de-page"
                data-umami-event-cible={game.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-neutral-700"
              >
                {game.name}
                <span className="ml-1 text-neutral-500" aria-hidden="true">&#8599;</span>
                <span className="sr-only"> ({t('newTab')})</span>
              </a>
            </nav>
          </div>

          {/* Column 3: Transparence */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              {t('transparenceTitle')}
            </p>
            <nav aria-label={t('transparenceTitle')} className="flex flex-col gap-1 text-xs text-neutral-600 [&>a]:py-1 [&>a]:min-h-[24px]">
              <NavLink zone="pied-de-page" href="/transparency" className="hover:text-neutral-700">
                {t('transparenceTitle')}
              </NavLink>
              <NavLink zone="pied-de-page" href="/editorial" className="hover:text-neutral-700">
                {t('editorial')}
              </NavLink>
              <NavLink zone="pied-de-page" href="/methodology" className="hover:text-neutral-700">
                {t('methodology')}
              </NavLink>
              <NavLink zone="pied-de-page" href="/accessibility" className="hover:text-neutral-700">
                {t('accessibility')}
              </NavLink>
              <NavLink zone="pied-de-page" href="/about" className="hover:text-neutral-700">
                {t('about')}
              </NavLink>
              <NavLink zone="pied-de-page" href="/press" className="hover:text-neutral-700">
                {t('press')}
              </NavLink>
              {/* Le prototype d'accueil a retiré le bandeau du livre ; le lien vit
                  désormais ici, donc sur toutes les pages plutôt que sur une seule.
                  `/livre` est hors du segment [locale] : NextLink, et non le Link
                  localisé, qui le réécrirait en /fr/livre. */}
              <NextLink
                href="/livre"
                // Attribut plutôt que `track()` : /livre a son propre layout
                // racine, la navigation y est de toute façon complète.
                data-umami-event="navigation-clic"
                data-umami-event-zone="pied-de-page"
                data-umami-event-cible="/livre"
                className="hover:text-neutral-700"
              >
                {t('book')}
              </NextLink>
            </nav>
          </div>
        </div>

        {/* Legal bar */}
        <div className="mt-8 border-t border-neutral-200 pt-6 text-center">
          <p className="text-sm font-medium text-neutral-600">{t('project')}</p>
          <p className="mt-1 text-xs text-neutral-500">{t('identity')}</p>
          <p className="mt-2 text-xs text-neutral-500">
            <NavLink zone="pied-de-page" href="/privacy" className="hover:text-neutral-700">{t('privacy')}</NavLink>
            {' · '}
            <NavLink zone="pied-de-page" href="/legal" className="hover:text-neutral-700">{t('legal')}</NavLink>
          </p>
          <p className="mt-1 text-xs text-neutral-500">{t('disclaimer')}</p>
        </div>
      </div>
    </footer>
  );
}
