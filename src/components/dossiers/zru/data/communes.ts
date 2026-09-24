// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.
// Écrit à la main : noms, unité et provenance des taux communaux (cellules brutes dans communes-brut.ts).

import { COMMUNES_TAUX_BRUT, EXTRAIT_LE_COMMUNES, FEUILLE_ADI } from './communes-brut';
import { lireTauxStatbel, type CelluleStatbel } from '@/lib/zru/statbel';
import type { Provenance } from './types';

/** Toponymes officiels fr / nl par code INS. */
const NOMS: Record<string, Record<'fr' | 'nl', string>> = {
  '21001': { fr: 'Anderlecht', nl: 'Anderlecht' },
  '21002': { fr: 'Auderghem', nl: 'Oudergem' },
  '21003': { fr: 'Berchem-Sainte-Agathe', nl: 'Sint-Agatha-Berchem' },
  '21004': { fr: 'Ville de Bruxelles', nl: 'Stad Brussel' },
  '21005': { fr: 'Etterbeek', nl: 'Etterbeek' },
  '21006': { fr: 'Evere', nl: 'Evere' },
  '21007': { fr: 'Forest', nl: 'Vorst' },
  '21008': { fr: 'Ganshoren', nl: 'Ganshoren' },
  '21009': { fr: 'Ixelles', nl: 'Elsene' },
  '21010': { fr: 'Jette', nl: 'Jette' },
  '21011': { fr: 'Koekelberg', nl: 'Koekelberg' },
  '21012': { fr: 'Molenbeek-Saint-Jean', nl: 'Sint-Jans-Molenbeek' },
  '21013': { fr: 'Saint-Gilles', nl: 'Sint-Gillis' },
  '21014': { fr: 'Saint-Josse-ten-Noode', nl: 'Sint-Joost-ten-Node' },
  '21015': { fr: 'Schaerbeek', nl: 'Schaarbeek' },
  '21016': { fr: 'Uccle', nl: 'Ukkel' },
  '21017': { fr: 'Watermael-Boitsfort', nl: 'Watermaal-Bosvoorde' },
  '21018': { fr: 'Woluwe-Saint-Lambert', nl: 'Sint-Lambrechts-Woluwe' },
  '21019': { fr: 'Woluwe-Saint-Pierre', nl: 'Sint-Pieters-Woluwe' },
};

/** Taux de risque de pauvreté administratif, en points de pourcentage (29,7 = 29,7 %), années 2015 à 2023. */
export const COMMUNES_TAUX: { niscode: string; nom: Record<'fr' | 'nl', string>; serie: Record<string, CelluleStatbel> }[] =
  COMMUNES_TAUX_BRUT.map((c) => {
    const nom = NOMS[c.niscode];
    if (!nom) throw new Error(`communes : nom manquant pour ${c.niscode}`);
    const serie = Object.fromEntries(Object.entries(c.serie).map(([a, brut]) => [a, lireTauxStatbel(brut)]));
    return { niscode: c.niscode, nom, serie };
  });

export const PROVENANCE_COMMUNES: Provenance = {
  producteur: { fr: 'Statbel', nl: 'Statbel', en: 'Statbel', de: 'Statbel' },
  url: 'https://statbel.fgov.be/fr/themes/datalab/revenu-disponible-administratif',
  // Date de publication affichée par Statbel sur la page de l'indicateur (SOURCES.md §3). Le script
  // ne peut pas la lire dans le fichier : les métadonnées du XLSX donnent une autre date (création
  // et modification le 11/12/2025), qui est celle du fichier, pas celle de la publication.
  sourceMiseAJour: '2025-11-19',
  extraitLe: EXTRAIT_LE_COMMUNES,
  licence: { fr: 'CC BY 4.0', nl: 'CC BY 4.0', en: 'CC BY 4.0', de: 'CC BY 4.0' },
  // Le titre de la feuille est cité tel quel : c'est un libellé du fichier source (en français).
  modifications: {
    fr: [
      `fichier ADI_T2_STATBEL_FR.xlsx (revenu disponible équivalent administratif, ADI), feuille « ${FEUILLE_ADI} », 19 communes bruxelloises, années de revenus 2015 à 2023`,
      'cellules numériques de la source (fractions, 0,297) converties par BGM en points de pourcentage (29,7)\u00a0; cellules annotées déjà en pourcentage reprises telles quelles',
      'note ⁽¹⁾ de Statbel (10 à 15\u00a0% de personnes non prises en compte)\u00a0: valeur affichée « à lire avec prudence »\u00a0; note ⁽²⁾ (plus de 15\u00a0%, non publié)\u00a0: aucune valeur',
      'Statbel signale que les chiffres jusqu’à 2019 ne sont comparables à ceux de 2020 et suivants que dans une certaine mesure (méthodologie améliorée)',
    ],
    nl: [
      `bestand ADI_T2_STATBEL_FR.xlsx (administratief equivalent beschikbaar inkomen, ADI), werkblad ‘${FEUILLE_ADI}’ van het Franstalige bestand, 19 Brusselse gemeenten, inkomensjaren 2015 tot 2023`,
      'numerieke cellen van de bron (breuken, 0,297) door BGM omgezet in procentpunten (29,7); geannoteerde cellen die al in procent staan, ongewijzigd overgenomen',
      'voetnoot ⁽¹⁾ van Statbel (10 tot 15\u00a0% van de personen niet meegeteld): waarde weergegeven als ‘met voorzichtigheid te lezen’; voetnoot ⁽²⁾ (meer dan 15\u00a0%, niet gepubliceerd): geen waarde',
      'Statbel meldt dat de cijfers tot en met 2019 slechts in zekere mate vergelijkbaar zijn met die van 2020 en later (verbeterde methodologie)',
    ],
    en: [
      `file ADI_T2_STATBEL_FR.xlsx (administrative equivalised disposable income, ADI), French-language sheet ‘${FEUILLE_ADI}’, 19 Brussels municipalities, income years 2015 to 2023`,
      'numeric source cells (fractions, 0.297) converted by BGM into percentage points (29.7); annotated cells already in per cent kept as they are',
      'Statbel note ⁽¹⁾ (10 to 15% of people not covered): value shown as ‘to be read with caution’; note ⁽²⁾ (over 15%, not published): no value',
      'Statbel states that figures up to 2019 are only comparable to some extent with those from 2020 onwards (improved methodology)',
    ],
    de: [
      `Datei ADI_T2_STATBEL_FR.xlsx (administratives verfügbares Äquivalenzeinkommen, ADI), französischsprachiges Tabellenblatt „${FEUILLE_ADI}“, 19 Brüsseler Gemeinden, Einkommensjahre 2015 bis 2023`,
      'numerische Zellen der Quelle (Anteile, 0,297) von BGM in Prozentpunkte umgerechnet (29,7); annotierte Zellen, die bereits in Prozent angegeben sind, unverändert übernommen',
      'Statbel-Fußnote ⁽¹⁾ (10 bis 15\u00a0% der Personen nicht erfasst): Wert als „mit Vorsicht zu lesen“ angezeigt; Fußnote ⁽²⁾ (mehr als 15\u00a0%, nicht veröffentlicht): kein Wert',
      'Laut Statbel sind die Zahlen bis einschließlich 2019 mit denen ab 2020 nur bedingt vergleichbar (verbesserte Methodik)',
    ],
  },
  confiance: 'official',
};
