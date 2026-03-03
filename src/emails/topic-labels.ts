// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Shared topic labels for email templates.
 * Single source of truth — imported by welcome.tsx and preferences-updated.tsx.
 *
 * Domain, sector, and commune labels are static.
 * Dossier labels are derived dynamically from Velite via getAllDossierTopicOptions().
 * When a slug is not found, emails fall back to displaying the raw slug.
 */

import { getAllDossierTopicOptions } from '@/lib/content';
import type { Locale } from '@/i18n/routing';

const staticLabels: Record<string, Record<string, string>> = {
  fr: {
    // Domain topics
    budget: 'Budget',
    mobility: 'Mobilit\u00e9',
    employment: 'Emploi',
    housing: 'Logement',
    climate: 'Climat & \u00c9nergie',
    social: 'Social & Sant\u00e9',
    security: 'S\u00e9curit\u00e9',
    economy: '\u00c9conomie',
    cleanliness: 'Propret\u00e9',
    institutional: 'Institutionnel',
    'urban-planning': 'Urbanisme',
    digital: 'Num\u00e9rique',
    education: 'Enseignement',
    solutions: 'Sortie de crise',
    engagements: 'Engagements DPR',
    // Communes
    'commune-anderlecht': 'Anderlecht',
    'commune-auderghem': 'Auderghem',
    'commune-berchem-sainte-agathe': 'Berchem-Sainte-Agathe',
    'commune-bruxelles-ville': 'Bruxelles-Ville',
    'commune-etterbeek': 'Etterbeek',
    'commune-evere': 'Evere',
    'commune-forest': 'Forest',
    'commune-ganshoren': 'Ganshoren',
    'commune-ixelles': 'Ixelles',
    'commune-jette': 'Jette',
    'commune-koekelberg': 'Koekelberg',
    'commune-molenbeek-saint-jean': 'Molenbeek-Saint-Jean',
    'commune-saint-gilles': 'Saint-Gilles',
    'commune-saint-josse-ten-noode': 'Saint-Josse-ten-Noode',
    'commune-schaerbeek': 'Schaerbeek',
    'commune-uccle': 'Uccle',
    'commune-watermael-boitsfort': 'Watermael-Boitsfort',
    'commune-woluwe-saint-lambert': 'Woluwe-Saint-Lambert',
    'commune-woluwe-saint-pierre': 'Woluwe-Saint-Pierre',
    // Sector topics
    commerce: 'Commerce',
    construction: 'Construction',
    culture: 'Culture',
    environment: 'Environnement',
    'health-social': 'Sant\u00e9-Social',
    horeca: 'Horeca',
    'housing-sector': 'Logement (secteur)',
    nonprofit: 'Associatif',
    transport: 'Transport',
    // Generic
    dossiers: 'Tous les dossiers',
    communes: 'Toutes les communes',
  },
  nl: {
    budget: 'Budget',
    mobility: 'Mobiliteit',
    employment: 'Werkgelegenheid',
    housing: 'Huisvesting',
    climate: 'Klimaat & Energie',
    social: 'Sociaal & Gezondheid',
    security: 'Veiligheid',
    economy: 'Economie',
    cleanliness: 'Netheid',
    institutional: 'Institutioneel',
    'urban-planning': 'Stedenbouw',
    digital: 'Digitaal',
    education: 'Onderwijs',
    solutions: 'Uitwegen uit de crisis',
    engagements: 'GBV-engagementen',
    'commune-anderlecht': 'Anderlecht',
    'commune-auderghem': 'Oudergem',
    'commune-berchem-sainte-agathe': 'Sint-Agatha-Berchem',
    'commune-bruxelles-ville': 'Stad Brussel',
    'commune-etterbeek': 'Etterbeek',
    'commune-evere': 'Evere',
    'commune-forest': 'Vorst',
    'commune-ganshoren': 'Ganshoren',
    'commune-ixelles': 'Elsene',
    'commune-jette': 'Jette',
    'commune-koekelberg': 'Koekelberg',
    'commune-molenbeek-saint-jean': 'Sint-Jans-Molenbeek',
    'commune-saint-gilles': 'Sint-Gillis',
    'commune-saint-josse-ten-noode': 'Sint-Joost-ten-Node',
    'commune-schaerbeek': 'Schaarbeek',
    'commune-uccle': 'Ukkel',
    'commune-watermael-boitsfort': 'Watermaal-Bosvoorde',
    'commune-woluwe-saint-lambert': 'Sint-Lambrechts-Woluwe',
    'commune-woluwe-saint-pierre': 'Sint-Pieters-Woluwe',
    commerce: 'Handel',
    construction: 'Bouw',
    culture: 'Cultuur',
    environment: 'Milieu',
    'health-social': 'Gezondheid-Sociaal',
    horeca: 'Horeca',
    'housing-sector': 'Huisvesting (sector)',
    nonprofit: 'Verenigingsleven',
    transport: 'Vervoer',
    dossiers: 'Alle dossiers',
    communes: 'Alle gemeenten',
  },
  en: {
    budget: 'Budget',
    mobility: 'Mobility',
    employment: 'Employment',
    housing: 'Housing',
    climate: 'Climate & Energy',
    social: 'Social & Health',
    security: 'Security',
    economy: 'Economy',
    cleanliness: 'Cleanliness',
    institutional: 'Institutional',
    'urban-planning': 'Urban Planning',
    digital: 'Digital',
    education: 'Education',
    solutions: 'Exit paths',
    engagements: 'RPD commitments',
    'commune-anderlecht': 'Anderlecht',
    'commune-auderghem': 'Auderghem',
    'commune-berchem-sainte-agathe': 'Berchem-Sainte-Agathe',
    'commune-bruxelles-ville': 'City of Brussels',
    'commune-etterbeek': 'Etterbeek',
    'commune-evere': 'Evere',
    'commune-forest': 'Forest',
    'commune-ganshoren': 'Ganshoren',
    'commune-ixelles': 'Ixelles',
    'commune-jette': 'Jette',
    'commune-koekelberg': 'Koekelberg',
    'commune-molenbeek-saint-jean': 'Molenbeek-Saint-Jean',
    'commune-saint-gilles': 'Saint-Gilles',
    'commune-saint-josse-ten-noode': 'Saint-Josse-ten-Noode',
    'commune-schaerbeek': 'Schaerbeek',
    'commune-uccle': 'Uccle',
    'commune-watermael-boitsfort': 'Watermael-Boitsfort',
    'commune-woluwe-saint-lambert': 'Woluwe-Saint-Lambert',
    'commune-woluwe-saint-pierre': 'Woluwe-Saint-Pierre',
    commerce: 'Commerce',
    construction: 'Construction',
    culture: 'Culture',
    environment: 'Environment',
    'health-social': 'Health & Social',
    horeca: 'Horeca',
    'housing-sector': 'Housing (sector)',
    nonprofit: 'Nonprofit',
    transport: 'Transport',
    dossiers: 'All dossiers',
    communes: 'All municipalities',
  },
  de: {
    budget: 'Haushalt',
    mobility: 'Mobilit\u00e4t',
    employment: 'Besch\u00e4ftigung',
    housing: 'Wohnen',
    climate: 'Klima & Energie',
    social: 'Soziales & Gesundheit',
    security: 'Sicherheit',
    economy: 'Wirtschaft',
    cleanliness: 'Sauberkeit',
    institutional: 'Institutionell',
    'urban-planning': 'St\u00e4dtebau',
    digital: 'Digital',
    education: 'Bildung',
    solutions: 'Auswege aus der Krise',
    engagements: 'RPE-Verpflichtungen',
    'commune-anderlecht': 'Anderlecht',
    'commune-auderghem': 'Auderghem',
    'commune-berchem-sainte-agathe': 'Berchem-Sainte-Agathe',
    'commune-bruxelles-ville': 'Stadt Br\u00fcssel',
    'commune-etterbeek': 'Etterbeek',
    'commune-evere': 'Evere',
    'commune-forest': 'Forest',
    'commune-ganshoren': 'Ganshoren',
    'commune-ixelles': 'Ixelles',
    'commune-jette': 'Jette',
    'commune-koekelberg': 'Koekelberg',
    'commune-molenbeek-saint-jean': 'Molenbeek-Saint-Jean',
    'commune-saint-gilles': 'Saint-Gilles',
    'commune-saint-josse-ten-noode': 'Saint-Josse-ten-Noode',
    'commune-schaerbeek': 'Schaerbeek',
    'commune-uccle': 'Uccle',
    'commune-watermael-boitsfort': 'Watermael-Boitsfort',
    'commune-woluwe-saint-lambert': 'Woluwe-Saint-Lambert',
    'commune-woluwe-saint-pierre': 'Woluwe-Saint-Pierre',
    commerce: 'Handel',
    construction: 'Bauwesen',
    culture: 'Kultur',
    environment: 'Umwelt',
    'health-social': 'Gesundheit-Soziales',
    horeca: 'Horeca',
    'housing-sector': 'Wohnen (Sektor)',
    nonprofit: 'Vereinswesen',
    transport: 'Verkehr',
    dossiers: 'Alle Dossiers',
    communes: 'Alle Gemeinden',
  },
};

/**
 * Build dossier labels from Velite for a given locale.
 * Returns a map of topicId → shortTitle (e.g. 'dossier-slrb' → 'SLRB').
 */
function buildDossierLabels(locale: string): Record<string, string> {
  const validLocale = (['fr', 'nl', 'en', 'de'].includes(locale) ? locale : 'fr') as Locale;
  const options = getAllDossierTopicOptions(validLocale);
  const labels: Record<string, string> = {};
  for (const opt of options) {
    labels[opt.topicId] = opt.label;
  }
  return labels;
}

/** Get topic labels for a locale, with FR fallback. Dossier labels are derived from Velite. */
export function getTopicLabels(locale: string): Record<string, string> {
  const base = staticLabels[locale] || staticLabels.fr;
  const dossierLabels = buildDossierLabels(locale);
  return { ...base, ...dossierLabels };
}
