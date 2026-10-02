// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import {
  getCommuneCards,
  getDomainCards,
  getDossierCards,
  getLocalizedSlug,
  getSectorCards,
} from '@/lib/content';
import { getTopicLabels } from '@/emails/topic-labels';
import { cleDeTheme } from '@/lib/theme-de-fiche';
import { lireInstantane } from '@/lib/themes-muets';
import { lireFichierThemesMuets } from '@/lib/themes-muets-store';
import { ThemesMuetsVue } from './themes-muets-vue';

/** Thème vers fiche, pour aller vérifier d'un clic. L'administration est en français. */
function liensDesThemes(): Record<string, string> {
  const liens: Record<string, string> = {};
  for (const c of getDomainCards('fr')) liens[cleDeTheme('domain', c.slug)] = `/fr/domains/${c.slug}`;
  // Après les domaines : `digital` et `education` existent des deux côtés, le domaine l'emporte.
  for (const c of getSectorCards('fr')) liens[cleDeTheme('sector', c.slug)] ??= `/fr/sectors/${c.slug}`;
  for (const c of getDossierCards('fr')) liens[cleDeTheme('dossier', c.slug)] = `/fr/dossiers/${getLocalizedSlug(c, 'fr')}`;
  for (const c of getCommuneCards('fr')) liens[cleDeTheme('commune', c.slug)] = `/fr/communes/${c.slug}`;
  liens.dossiers = '/fr/dossiers';
  liens.communes = '/fr/communes';
  return liens;
}

/** Lit l'instantané déposé par la tâche quotidienne `themes-muets`. */
export async function ThemesMuetsTile() {
  const lecture = lireInstantane(await lireFichierThemesMuets(), new Date());
  return <ThemesMuetsVue lecture={lecture} libelles={getTopicLabels('fr')} liens={liensDesThemes()} />;
}
