// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.
//
// Extraction des valeurs du dossier ZRU. Lancé à la main, jamais en CI :
//   npx tsx scripts/zru/extraire.ts             écrit europe-brut.ts, communes-brut.ts, quartiers-brut.ts
//   npx tsx scripts/zru/extraire.ts --verifier  n'écrit rien ; une ligne par source :
//                                               « inchangée », « MISE À JOUR » ou « ÉCHEC »
// Sources, URL et licences : scripts/zru/SOURCES.md.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { derniereMiseAJour, valeurRequise, type JsonStat } from '../../src/lib/zru/eurostat';
import { lireFeuille } from '../../src/lib/zru/xlsx';
import { trouverTauxCommunesBruxelles } from '../../src/lib/zru/statbel';
import { fichierTs, paliers } from '../../src/lib/zru/ecriture';

const VERIFIER = process.argv.includes('--verifier');
const AUJ = new Date().toISOString().slice(0, 10);
const DATA = 'src/components/dossiers/zru/data';
const ENTETE = [
  '// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE',
  '// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.',
  `// Généré par scripts/zru/extraire.ts le ${AUJ}. Ne pas modifier à la main.`,
].join('\n');
const lignes: string[] = [];

/** Ce qui change d'un lancement à l'autre sans que la donnée change : la date de génération. */
const comparable = (s: string) =>
  s.split('\n').filter((l) => !/^\/\/ Généré par|^export const EXTRAIT_LE/.test(l)).join('\n');

/** En mode --verifier, compare au fichier en place ; sinon l'écrit. Renvoie le statut à afficher. */
function ecrire(fichier: string, contenu: string): string {
  const chemin = `${DATA}/${fichier}`;
  const avant = existsSync(chemin) ? readFileSync(chemin, 'utf8') : null;
  const statut = avant !== null && comparable(avant) === comparable(contenu) ? 'inchangée' : 'MISE À JOUR';
  if (!VERIFIER) writeFileSync(chemin, contenu);
  return VERIFIER ? statut : `${statut}, ${fichier} écrit`;
}

async function eurostat(code: string, geos: string[], annee: number): Promise<JsonStat> {
  const q = new URLSearchParams({ format: 'JSON', lang: 'en', time: String(annee) });
  geos.forEach((g) => q.append('geo', g));
  const r = await fetch(`https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/${code}?${q}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.json()) as JsonStat;
}

async function europe(): Promise<string> {
  const ANNEE = 2025;
  // Régions-capitales retenues (spec §3.6) et leur pays. Une case absente fait échouer (valeurRequise).
  const PAIRES: [string, string][] = [
    ['BE10', 'BE'], ['AT13', 'AT'], ['DE30', 'DE'], ['FR10', 'FR'], ['NL32', 'NL'],
    ['CZ01', 'CZ'], ['DK01', 'DK'], ['SE11', 'SE'], ['ES30', 'ES'], ['PT1A', 'PT'],
  ];
  const reg = await eurostat('ilc_li41', PAIRES.map((p) => p[0]), ANNEE);
  const nat = await eurostat('ilc_li41', PAIRES.map((p) => p[1]), ANNEE);
  const maj = derniereMiseAJour(reg);
  const ratios = PAIRES.map(([geo, pays]) => {
    const region = valeurRequise(reg, { geo, time: String(ANNEE) });
    const nation = valeurRequise(nat, { geo: pays, time: String(ANNEE) });
    return { geo, pays, region, nation, ratio: Math.round((region / nation) * 100) / 100 };
  });
  const contenu = fichierTs(
    ENTETE,
    { ANNEE_EUROPE: ANNEE, SOURCE_MISE_A_JOUR_EUROPE: maj, EXTRAIT_LE_EUROPE: AUJ, EUROPE_RATIOS_BRUTS: ratios },
    {
      SOURCE_MISE_A_JOUR_EUROPE: 'string | null',
      EXTRAIT_LE_EUROPE: 'string',
      EUROPE_RATIOS_BRUTS: '{ geo: string; pays: string; region: number; nation: number; ratio: number }[]',
    },
  );
  return `Eurostat ilc_li41 ${ANNEE} : ${ratios.length} régions, source mise à jour le ${maj ?? 'date inconnue'} ; ${ecrire('europe-brut.ts', contenu)}`;
}

/** Titre de la feuille de l'indicateur dans ADI_T2_STATBEL_FR.xlsx (ligne 2 de la feuille). */
const TITRE_FEUILLE_ADI = 'Risque de pauvreté administratif';

function communes(): string {
  const fichier = 'scripts/zru/sources/ADI_T2_STATBEL_FR.xlsx'; // téléchargé à la main, voir SOURCES.md §3
  if (!existsSync(fichier)) throw new Error(`fichier ${fichier} absent`);
  const buf = readFileSync(fichier);
  // La feuille est repérée par son contenu, pas par son rang (Statbel réordonne parfois ses onglets).
  const trouvees: { feuille: number; titre: string; lu: NonNullable<ReturnType<typeof trouverTauxCommunesBruxelles>> }[] = [];
  for (let feuille = 1; ; feuille++) {
    let rows: (string | number | null)[][];
    try {
      rows = lireFeuille(buf, feuille);
    } catch (e) {
      if (/absente/.test((e as Error).message)) break;
      throw e;
    }
    const lu = trouverTauxCommunesBruxelles(rows);
    if (lu) trouvees.push({ feuille, titre: String(rows[1]?.[0] ?? ''), lu });
  }
  // La feuille « Population » a la même forme (années 2015 à 2023, 19 communes, parts de population
  // entre 0 et 1) : seule la feuille dont le titre (ligne 2) est celui de l'indicateur est retenue.
  // L'ancien lecteur XLSX avalait une cellule vide sur deux et masquait ce doublon.
  const retenues = trouvees.filter((t) => t.titre.trim() === TITRE_FEUILLE_ADI);
  if (retenues.length !== 1)
    throw new Error(
      `${retenues.length} feuille(s) « ${TITRE_FEUILLE_ADI} » trouvée(s) au lieu d'une (candidates : ${trouvees.map((t) => `${t.feuille} « ${t.titre} »`).join(', ')})`,
    );
  const [{ feuille, titre, lu }] = retenues;
  const data = lu.communes.map((r) => ({
    niscode: String(r[0]),
    nomSource: String(r[1]),
    // Cellules telles que la source les donne : fraction (0.297) ou texte annoté (« 17,6%⁽¹⁾ », « ⁽²⁾ »).
    serie: Object.fromEntries(lu.annees.map(({ col, annee }) => [annee, r[col] ?? null])),
  }));
  const contenu = fichierTs(
    ENTETE,
    { FEUILLE_ADI: titre, COMMUNES_TAUX_BRUT: data },
    { FEUILLE_ADI: 'string', COMMUNES_TAUX_BRUT: '{ niscode: string; nomSource: string; serie: Record<string, string | number | null> }[]' },
  );
  return `Statbel ADI_T2 : feuille ${feuille} « ${titre} », 19 communes, 2015 à 2023 ; ${ecrire('communes-brut.ts', contenu)}`;
}

function quartiers(): string {
  const fichier = 'scripts/zru/sources/monitoring-2498.csv'; // copie datée, voir SOURCES.md §1
  if (!existsSync(fichier)) throw new Error(`fichier ${fichier} absent`);
  const [tete, ...corps] = readFileSync(fichier, 'utf8').trim().split(/\r?\n/).map((l) => l.split(';'));
  const iId = tete.indexOf('MD_ID'), iVal = tete.indexOf('valeur'), iFr = tete.indexOf('nom_fr'), iNl = tete.indexOf('nom_nl');
  if ([iId, iVal, iFr, iNl].some((i) => i < 0)) throw new Error('colonnes MD_ID, valeur, nom_fr, nom_nl attendues');
  const mal = corps.find((l) => l.length !== tete.length);
  if (mal) throw new Error(`ligne à ${mal.length} champs au lieu de ${tete.length} : ${mal.join(';')}`);
  const vals = corps.map((l) => {
    const brut = l[iVal].trim();
    const valeur = brut === '' ? null : Number(brut.replace(',', '.'));
    if (valeur !== null && !Number.isFinite(valeur)) throw new Error(`valeur illisible « ${brut} » (MD_ID ${l[iId]})`);
    return { mdId: Number(l[iId]), nom: { fr: l[iFr], nl: l[iNl] }, valeur };
  });
  if (vals.length !== 145) throw new Error(`${vals.length} quartiers au lieu de 145`);
  const { seuils, palierDe } = paliers(vals.map((v) => v.valeur));
  const contenu = fichierTs(
    ENTETE,
    { SEUILS_PALIERS: seuils, QUARTIERS_VALEURS_BRUTS: vals.map((v) => ({ ...v, palier: palierDe(v.valeur) })) },
    {
      SEUILS_PALIERS: 'number[]',
      QUARTIERS_VALEURS_BRUTS:
        "{ mdId: number; nom: Record<'fr' | 'nl', string>; valeur: number | null; palier: 1 | 2 | 3 | 4 | 5 | null }[]",
    },
  );
  const sans = vals.filter((v) => v.valeur === null).length;
  return `Monitoring 2498 (copie locale) : 145 quartiers, ${sans} sans valeur ; ${ecrire('quartiers-brut.ts', contenu)}`;
}

(async () => {
  const sources: [string, () => string | Promise<string>][] = [
    ['Eurostat ilc_li41', europe],
    ['Statbel ADI_T2', communes],
    ['Monitoring 2498', quartiers],
  ];
  for (const [nom, lire] of sources) {
    try {
      lignes.push(await lire());
    } catch (e) {
      lignes.push(`${nom} : ÉCHEC, ${(e as Error).message}`);
      process.exitCode = 1;
    }
  }
  if (lignes.length === 0) {
    lignes.push('ÉCHEC : aucune source lue');
    process.exitCode = 1;
  }
  console.log(lignes.join('\n'));
})();
