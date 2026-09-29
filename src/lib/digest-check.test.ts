// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  cardSubject,
  checkCompleteness,
  checkEntities,
  checkFacts,
  checkLinkCoherence,
  digestBody,
  DIGEST_LANGS,
  extractBodyFacts,
  extractSourceFacts,
  findUnclosedLink,
  frenchNumberWords,
  isCallToAction,
  parseDigestPath,
  subjectStems,
  weekCardSlugs,
  weekRange,
  weekSourceTexts,
  type CardRef,
} from './digest-check';

const ROOT = path.resolve(__dirname, '..', '..');
const FIXTURES = path.join(__dirname, '__fixtures__', 'digest');
/** Versions brutes du générateur (commits du bot 0fdf60c0 et 5b996e75), avant correction. */
const brut = (name: string) => digestBody(fs.readFileSync(path.join(FIXTURES, name), 'utf8'));
/** Archives publiées, corrigées (#533 pour w38, #613 pour w39). */
const archive = (week: string, lang: string) => digestBody(fs.readFileSync(path.join(ROOT, 'content', 'digest', `${week}.${lang}.mdx`), 'utf8'));
const weekBodies = (week: string) => Object.fromEntries(DIGEST_LANGS.map((l) => [l, archive(week, l)]));

describe('parseDigestPath, weekRange, digestBody', () => {
  it('lit la semaine et la langue, ignore les fixtures', () => {
    expect(parseDigestPath('content/digest/2026-w39.fr.mdx')).toEqual({ week: '2026-w39', lang: 'fr' });
    expect(parseDigestPath('content/digest/__fixtures__/minimal.fr.mdx')).toBeNull();
  });

  it('donne le lundi et le dimanche de la semaine ISO', () => {
    expect(weekRange('2026-w39')).toEqual({ monday: '2026-09-21', sunday: '2026-09-27' });
    expect(weekRange('2026-w01')).toEqual({ monday: '2025-12-29', sunday: '2026-01-04' });
  });

  it('retire le frontmatter, dont le bloc magazine écrit à la main', () => {
    const body = archive('2026-w39', 'fr');
    expect(body.startsWith('\n## Deuxième avertissement')).toBe(true);
    expect(body).not.toContain('magazine:');
  });
});

describe('Règle 1 : complétude entre langues', () => {
  it("attrape le fichier turc coupé du 20/09 : lien ouvert en dernière ligne", () => {
    const tr = brut('2026-w38.tr.brut.mdx');
    const line = findUnclosedLink(tr);
    expect(line).not.toBeNull();
    expect(tr.split('\n')[line! - 1]).toContain('[Brüksel Şehri, **6 Ekim 2030**');
  });

  it('laisse passer le même fichier une fois complété', () => {
    expect(findUnclosedLink(archive('2026-w38', 'tr'))).toBeNull();
  });

  it('attrape aussi « ](» sans parenthèse fermante', () => {
    expect(findUnclosedLink('Texte.\n\n[Voir la fiche →](/fr/domaines/bud')).toBe(3);
    expect(findUnclosedLink('Code `[x](` cité, pas un lien.')).toBeNull();
  });

  it('attrape la semaine 38 brute : une section sur neuf, 12 % du français', () => {
    const bodies = { ...weekBodies('2026-w38'), fr: brut('2026-w38.fr.brut.mdx'), tr: brut('2026-w38.tr.brut.mdx') };
    const f = checkCompleteness(bodies, { requireAll: true }).filter((x) => x.level === 'error');
    expect(f.map((x) => x.lang)).toEqual(['tr', 'tr', 'tr']);
    expect(f.map((x) => x.message).join(' ')).toMatch(/1 section\(s\) « ## » contre 9/);
    expect(f.map((x) => x.message).join(' ')).toMatch(/12 % du français/);
  });

  it('laisse passer les onze langues publiées de w38 et de w39', () => {
    expect(checkCompleteness(weekBodies('2026-w38'), { requireAll: true })).toEqual([]);
    expect(checkCompleteness(weekBodies('2026-w39'), { requireAll: true })).toEqual([]);
  });

  it('compte aussi les sous-sections « ### » : w36 publié, cinq sujets sur quinze perdus en swahili', () => {
    const f = checkCompleteness({ fr: archive('2026-w36', 'fr'), sw: archive('2026-w36', 'sw') }, { requireAll: false });
    expect(f.filter((x) => x.level === 'error').map((x) => x.message)).toEqual([
      '10 sous-section(s) « ### » contre 15 en français',
      expect.stringMatching(/^corps de \d+ caractères, 58 % du français/),
    ]);
  });

  it("langue absente : erreur pour une semaine nouvelle, avertissement pour une archive retouchée", () => {
    const sansTurc = weekBodies('2026-w39');
    delete sansTurc.tr;
    expect(checkCompleteness(sansTurc, { requireAll: true })).toEqual([expect.objectContaining({ lang: 'tr', level: 'error' })]);
    expect(checkCompleteness(sansTurc, { requireAll: false })).toEqual([expect.objectContaining({ lang: 'tr', level: 'warning' })]);
  });
});

describe('Règle 2 : lien vers une fiche et texte qui le porte', () => {
  const foyer: CardRef = { slug: 'foyer-anderlechtois', label: 'le dossier « Foyer anderlechtois »', stems: subjectStems('Foyer anderlechtois') };
  const metro: CardRef = { slug: 'metro-3', label: 'le dossier « Métro 3 »', stems: subjectStems('Métro 3') };
  const resolve = (link: string) =>
    link === '/fr/dossiers/foyer-anderlechtois' ? foyer : link === '/fr/dossiers/metro-3' ? metro : null;
  // Fiches visées par le changelog et le radar de la semaine 38 (data/ au commit 0fdf60c0).
  const w38Slugs = new Set(['budget', 'cleanliness', 'climate', 'housing', 'institutional', 'mobility', 'security', 'social', 'urban-planning', 'fusion-polices', 'metro-3', 'pfas', 'culture']);

  it('sujet de la fiche : shortTitle, sinon le titre avant les deux-points', () => {
    expect(cardSubject('Métro 3 : projet gelé 10 ans, remplacement par tram')).toBe('Métro 3');
    expect(cardSubject('Foyer anderlechtois : scandale de gouvernance', 'Foyer anderlechtois')).toBe('Foyer anderlechtois');
    expect(subjectStems('Foyer anderlechtois')).toEqual(['foyer', 'anderl']);
    expect(subjectStems('SLRB')).toEqual(['slrb']);
  });

  it('distingue un lien d’appel à l’action d’un lien intégré à la phrase', () => {
    expect(isCallToAction('Consulter le dossier Foyer anderlechtois →')).toBe(true);
    expect(isCallToAction('Voir le dossier Métro 3')).toBe(true);
    expect(isCallToAction('métro 3')).toBe(false);
  });

  it('attrape le paragraphe « Foyer anderlechtois » consacré à Kanal (w38 brut)', () => {
    const f = checkLinkCoherence(brut('2026-w38.fr.brut.mdx'), 'fr', resolve, w38Slugs);
    expect(f).toHaveLength(1);
    expect(f[0]!.message).toContain('/fr/dossiers/foyer-anderlechtois');
    expect(brut('2026-w38.fr.brut.mdx').split('\n')[f[0]!.line! - 1]).toMatch(/^\*\*Foyer anderlechtois\.\*\* .*Kanal/);
  });

  it('laisse passer la version corrigée (Kanal, lien vers le secteur culture)', () => {
    expect(checkLinkCoherence(archive('2026-w38', 'fr'), 'fr', resolve, w38Slugs)).toEqual([]);
  });

  it("n'accepte ni l'étiquette en gras, ni le titre de section, ni le texte du lien comme preuve", () => {
    const body = [
      '## Dossiers critiques : PFAS, Foyer anderlechtois, Métro 3',
      '',
      "**Foyer anderlechtois.** Un bras de fer persiste au sein du gouvernement autour de Kanal. [Consulter le dossier Foyer anderlechtois →](/fr/dossiers/foyer-anderlechtois)",
    ].join('\n');
    expect(checkLinkCoherence(body, 'fr', resolve)).toHaveLength(1);
  });

  it('une fiche visée par une entrée de la semaine est acceptée même sans son nom (Métro 3, w38)', () => {
    // « **Métro 3.** Beliris a commencé … gare du Nord » : le texte ne dit pas « métro ».
    const body = archive('2026-w38', 'fr');
    expect(checkLinkCoherence(body, 'fr', resolve, w38Slugs)).toEqual([]);
    expect(checkLinkCoherence(body, 'fr', resolve, new Set())).toEqual([expect.objectContaining({ message: expect.stringContaining('/fr/dossiers/metro-3') })]);
  });

  it('lien seul dans son paragraphe : la section, titre compris, fait foi (w11, Métro 3)', () => {
    const body = [
      "## Métro 3 : profondeur d'argile sous-estimée, coût révisé à 4,76 milliards EUR",
      '',
      "L'audition du consortium SM Toots au Parlement (12 mars) a révélé des défaillances de conception : le Palais du Midi a été évacué trop tard pour les sondages géotechniques.",
      '',
      '[Voir le dossier Métro 3 →](/fr/dossiers/metro-3)',
    ].join('\n');
    expect(checkLinkCoherence(body, 'fr', resolve)).toEqual([]);
  });

  it('un lien intégré à la phrase compte comme mention (w25)', () => {
    const body = 'Le permis de démantèlement partiel du Palais du Midi a été délivré le 17 juin, levant le principal verrou du chaînon manquant du [métro 3](/fr/dossiers/metro-3).';
    expect(checkLinkCoherence(body, 'fr', resolve)).toEqual([]);
  });

  it('fiches de la semaine : changelog de la semaine et signaux datés de la semaine seulement', () => {
    const slugs = weekCardSlugs(
      '2026-w38',
      [{ date: '2026-09-15', targetSlug: 'metro-3' }, { date: '2026-09-09', targetSlug: 'foyer-anderlechtois' }],
      [{ date: '2026-09-20', cards: ['culture'] }, { date: '2026-08-22', cards: ['urban-planning'], status: 'active' }],
    );
    expect([...slugs].sort()).toEqual(['culture', 'metro-3']);
  });
});

describe('Règle 3 : entités belges inventées', () => {
  const w38fr = brut('2026-w38.fr.brut.mdx');

  it('attrape « Région francophone » (w38 brut, français)', () => {
    const f = checkEntities(w38fr, 'fr');
    expect(f).toEqual([expect.objectContaining({ level: 'error', message: expect.stringContaining('« Région francophone »') })]);
  });

  it('attrape le dédoublement Communauté française + Fédération (w38 brut, en/nl/de)', () => {
    const en = 'This analysis confirms that Brussels and Wallonia face comparable budgetary challenges, while the French Community and the Wallonia-Brussels Federation are also classified as high-risk.';
    const nl = 'terwijl de Franse Gemeenschap en de Federatie Wallonië-Brussel eveneens als hoog risico worden ingedeeld.';
    const de = 'während die Französische Gemeinschaft und die Föderalen Wallonien-Brüssel ebenfalls als risikohoch eingestuft werden.';
    for (const [lang, text] of [['en', en], ['nl', nl], ['de', de]] as const) {
      expect(checkEntities(text, lang)).toEqual([expect.objectContaining({ level: 'error', message: expect.stringContaining('une seule entité') })]);
    }
  });

  it('attrape les traductions latines réellement produites (es, pt, ro, sw)', () => {
    expect(checkEntities('mientras que la Región francófona y la Federación Valonia-Bruselas', 'es')).toHaveLength(1);
    expect(checkEntities('enquanto a Região Francófona e a Federação', 'pt')).toHaveLength(1);
    expect(checkEntities('în timp ce Regiunea Francofonă și Federația Valonia-Bruxelles', 'ro')).toHaveLength(1);
    expect(checkEntities('wakati Kanda ya Kifaranga na Umoja wa Walonia-Brukela', 'sw')).toHaveLength(1);
  });

  it('laisse passer la version corrigée et les entités réelles', () => {
    expect(checkEntities(archive('2026-w38', 'fr'), 'fr')).toEqual([]);
    expect(checkEntities('La Région de Bruxelles-Capitale, la Région wallonne, la Communauté germanophone et la Communauté flamande.', 'fr')).toEqual([]);
  });

  it('les deux noms dans une phrase sans coordination : avertissement, pas échec', () => {
    const f = checkEntities('La Fédération Wallonie-Bruxelles, nom usuel de la Communauté française, finance les écoles.', 'fr');
    expect(f).toEqual([expect.objectContaining({ level: 'warning' })]);
  });
});

describe('Règle 4 : ancrage des dates et des nombres (français)', () => {
  // Descriptions réelles de la semaine 39 (data/ au commit 5b996e75).
  const CL_SAINT_JOSSE =
    'La Région annonce un second avertissement à Saint-Josse-ten-Noode dans la procédure de tutelle coercitive, après celui du 5 juin 2026. Comptes 2024 non approuvés, pas de receveur titulaire depuis 2021, budget 2026 non transmis : la commune a trois mois au maximum pour régulariser.';
  const RADAR_SAINT_JOSSE =
    "Le gouvernement bruxellois a décidé le jeudi 24 septembre 2026 d'adresser un second avertissement à la commune de Saint-Josse-ten-Noode dans la procédure de tutelle coercitive, après un premier avertissement le 5 juin 2026. Trois manquements subsistent : les comptes 2024 ne sont pas approuvés, la commune n'a pas de receveur titulaire, et le budget 2026 n'a pas été transmis. La commune dispose de trois mois pour y répondre ; l'étape suivante de la procédure est l'envoi d'un commissaire.";
  const sources = (week: string[], olderRadar: string[] = []) => ({ week: extractSourceFacts(week), olderRadar: extractSourceFacts(olderRadar) });
  const saintJosse = (body: string) => body.split('\n## ')[1]!.split('\n## ')[0]!;

  it('attrape la date fausse de w39 brut : « 27 septembre 2026 » pour une décision du 24', () => {
    const f = checkFacts(`## ${saintJosse(brut('2026-w39.fr.brut.mdx'))}`, sources([CL_SAINT_JOSSE, RADAR_SAINT_JOSSE]));
    expect(f.map((x) => x.message)).toEqual([expect.stringContaining('« 27 septembre 2026 »')]);
  });

  it('laisse passer le même paragraphe corrigé par #613', () => {
    expect(checkFacts(`## ${saintJosse(archive('2026-w39', 'fr'))}`, sources([CL_SAINT_JOSSE, RADAR_SAINT_JOSSE]))).toEqual([]);
  });

  it('normalise espaces insécables, séparateurs de milliers et virgule décimale', () => {
    const src = extractSourceFacts(['Plus de 11 440 personnes, 12.000 réactions, un taux de 47,6 %.']);
    expect([...src.numbers]).toEqual(expect.arrayContaining(['11440', '12000', '47,6']));
    expect(checkFacts('**11 440 personnes**, 12 000 réactions, **47,6 %**.', { week: src, olderRadar: extractSourceFacts([]) })).toEqual([]);
  });

  it("« 40 % » n'est pas ancré par « 40,4 % »", () => {
    expect(checkFacts('couvre **40 %** des Bruxellois', sources(['soit 40,4 % de la population']))).toHaveLength(1);
  });

  it('écarte années, numéro de semaine, ordinaux, « mois année », nombres collés aux lettres et cibles de liens', () => {
    const facts = extractBodyFacts('Semaine 39 : en 2027, depuis octobre 2024, le 19e rapport, la ligne T2, le COVID-19, [fiche](/fr/dossiers/metro-3) et 4 à 5 euros.');
    expect(facts).toEqual([]);
  });

  it("l'intitulé « Semaine du 31 août au 6 septembre 2026 » n'est pas un fait (w36)", () => {
    expect(extractBodyFacts('### Semaine du 31 août au 6 septembre 2026')).toEqual([]);
  });

  it('retient les dates sans année et les pourcentages d’un chiffre', () => {
    expect(extractBodyFacts('le 1er septembre, une hausse de 5 %').map((f) => f.key)).toEqual(['09-01', '5']);
  });

  it('les nombres en lettres des sources ancrent les chiffres du corps (w36 : « deux mille à mille places »)', () => {
    expect(frenchNumberWords('passe de deux mille à mille places, doté de quarante-deux millions par an')).toEqual([2000, 1000, 42, 42_000_000]);
    expect(frenchNumberWords('quatre-vingt-dix-neuf, soixante et onze, trois cents')).toEqual([99, 71, 300]);
    const src = ["Le dispositif Brussels Deal passe de deux mille à mille places."];
    expect(checkFacts('passe de **2 000 à 1 000 places**', sources(src))).toEqual([]);
  });

  it('un arrondi annoncé est comparé avec tolérance (w33 : « plus de 1 500 » pour 1 595)', () => {
    const src = ['1 595 signatures au 12 août'];
    expect(checkFacts('une mobilisation de plus de **1 500 signatures**', sources(src))).toEqual([]);
    expect(checkFacts('une mobilisation de plus de **1 000 signatures**', sources(src))).toHaveLength(1);
    expect(checkFacts('une mobilisation de **1 500 signatures**', sources(src))).toHaveLength(1);
  });

  it('hors section Radar, un signal ancien ne suffit pas ; dans la section Radar, si', () => {
    const older = ['La demande porte sur 537 logements au maximum.'];
    expect(checkFacts('## Urbanisme\n\nUn projet de **537 logements**.', sources([], older))).toHaveLength(1);
    expect(checkFacts('## Radar : signaux actifs\n\nUn projet de **537 logements**.', sources([], older))).toEqual([]);
  });

  it('sources de la semaine : changelog du lundi au dimanche, signaux actifs, archivés écartés', () => {
    const t = weekSourceTexts(
      '2026-w39',
      [{ date: '2026-09-27', descriptions: { fr: 'semaine' } }, { date: '2026-09-20', descriptions: { fr: 'avant' } }],
      [
        { date: '2026-09-24', descriptions: { fr: 'signal de la semaine' } },
        { date: '2026-08-22', descriptions: { fr: 'signal ancien' } },
        { date: '2026-08-01', archivedAt: '2026-09-01', descriptions: { fr: 'archivé' } },
        { date: '2026-09-28', descriptions: { fr: 'après' } },
      ],
    );
    expect(t).toEqual({ week: ['semaine', 'signal de la semaine'], olderRadar: ['signal ancien'] });
  });

  it('un signal re-daté après la semaine reste une source ancienne (id « 2026-08-22-josaphat » daté du 29/09)', () => {
    const t = weekSourceTexts('2026-w39', [], [{ id: '2026-08-22-josaphat', date: '2026-09-29', descriptions: { fr: '537 logements' } }]);
    expect(t).toEqual({ week: [], olderRadar: ['537 logements'] });
  });
});
