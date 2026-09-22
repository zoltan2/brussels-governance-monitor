// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  SUMMARY_DIRS,
  SUMMARY_MAX,
  checkSummaryLength,
  explainSummaryLength,
  localeOf,
  readSummary,
  shouldBlockSummary,
} from './summary-length';

/** Chapeau de longueur exacte, sans dépendre d'une chaîne recopiée à la main. */
const long = (n: number) => 'a'.repeat(n);

describe('longueur du chapeau', () => {
  it('accepte un chapeau sous le maximum', () => {
    const c = checkSummaryLength(long(120));
    expect(c.verdict).toBe('ok');
    expect(c.overflow).toBe(0);
  });

  it('accepte un chapeau pile au maximum', () => {
    const c = checkSummaryLength(long(SUMMARY_MAX));
    expect(c.verdict).toBe('ok');
    expect(c.length).toBe(SUMMARY_MAX);
  });

  it('refuse un chapeau d un seul caractère de trop', () => {
    const c = checkSummaryLength(long(SUMMARY_MAX + 1));
    expect(c.verdict).toBe('too-long');
    expect(c.overflow).toBe(1);
  });

  it('signale un chapeau absent', () => {
    expect(checkSummaryLength(undefined).verdict).toBe('missing');
    expect(checkSummaryLength('   ').verdict).toBe('missing');
  });
});

/**
 * COMPTER COMME ZOD, SINON LE LINT ET LE BUILD SE CONTREDISENT.
 *
 * `z.string().max(500)` compare `string.length` : des unités de code UTF-16.
 * Un « é » pèse deux octets en UTF-8, l'espace insécable fine U+202F en pèse
 * trois, et chacun compte pour UN. Un lint qui compterait en octets bloquerait
 * des chapeaux que Velite accepte, et le français belge en est plein (« 1 036 »).
 */
describe('comptage en unités de code, comme Zod', () => {
  it('compte un accent pour un', () => {
    const accents = 'é'.repeat(SUMMARY_MAX);
    expect(Buffer.byteLength(accents, 'utf8')).toBe(2 * SUMMARY_MAX); // témoin
    expect(checkSummaryLength(accents).verdict).toBe('ok');
    expect(checkSummaryLength(`${accents}é`).verdict).toBe('too-long');
  });

  it('compte l espace insécable fine pour un', () => {
    const fine = `${' '.repeat(10)}${long(SUMMARY_MAX - 10)}`;
    expect(fine.length).toBe(SUMMARY_MAX);
    expect(Buffer.byteLength(fine, 'utf8')).toBeGreaterThan(SUMMARY_MAX); // témoin
    expect(checkSummaryLength(fine).verdict).toBe('ok');
    expect(checkSummaryLength(`${fine} `).verdict).toBe('too-long');
  });

  it('compte les espaces de bord, Zod ne rogne pas', () => {
    expect(checkSummaryLength(` ${long(SUMMARY_MAX)}`).verdict).toBe('too-long');
  });

  it('lit le chapeau brut, saut de ligne final d un bloc YAML compris', () => {
    const fiche = `---\ntitle: X\nsummary: >\n  ${long(SUMMARY_MAX)}\n---\n\nCorps.\n`;
    const summary = readSummary(fiche);
    // Le bloc `>` garde son saut de ligne final : 501 unités, Velite le refuse.
    expect(summary).toBe(`${long(SUMMARY_MAX)}\n`);
    expect(checkSummaryLength(summary).verdict).toBe('too-long');
  });
});

/**
 * Mode CI : ne bloquer que la dette CRÉÉE. Une veille republie des dizaines de
 * fiches sans toucher au chapeau ; les arrêter toutes pousserait au
 * `--no-verify`, ce qui est pire qu'un lint absent.
 */
describe('mode diff : seule la dette créée bloque', () => {
  const tropLong = long(SUMMARY_MAX + 50);

  it('ne bloque pas un chapeau trop long resté inchangé', () => {
    expect(shouldBlockSummary({ current: tropLong, atBase: tropLong, hasBase: true })).toBe(false);
  });

  it('bloque un chapeau trop long modifié', () => {
    expect(shouldBlockSummary({ current: tropLong, atBase: long(SUMMARY_MAX + 10), hasBase: true })).toBe(true);
  });

  it('bloque un chapeau conforme que la modification fait déborder', () => {
    expect(shouldBlockSummary({ current: tropLong, atBase: long(100), hasBase: true })).toBe(true);
  });

  it('bloque une fiche nouvelle au chapeau trop long', () => {
    expect(shouldBlockSummary({ current: tropLong, atBase: null, hasBase: true })).toBe(true);
  });

  it('bloque un chapeau ajouté à une fiche qui n en avait pas', () => {
    expect(shouldBlockSummary({ current: tropLong, atBase: undefined, hasBase: true })).toBe(true);
  });

  it('ne bloque jamais un chapeau conforme, modifié ou non', () => {
    expect(shouldBlockSummary({ current: long(SUMMARY_MAX), atBase: null, hasBase: true })).toBe(false);
    expect(shouldBlockSummary({ current: long(SUMMARY_MAX), atBase: long(10), hasBase: true })).toBe(false);
  });

  it('sans base, contrôle tout : mode strict', () => {
    expect(shouldBlockSummary({ current: tropLong, hasBase: false })).toBe(true);
  });
});

describe('message rendu à qui casse la règle', () => {
  it('donne locale, longueur, maximum et dépassement', () => {
    const c = checkSummaryLength(long(SUMMARY_MAX + 36));
    const m = explainSummaryLength(c, 'content/dossiers/bim-bruxelles.de.mdx');
    expect(m).toContain('locale de');
    expect(m).toContain(`${SUMMARY_MAX + 36} caractères`);
    expect(m).toContain(`maximum ${SUMMARY_MAX}`);
    expect(m).toContain('36 de trop');
  });

  it('tire la locale du nom de fichier', () => {
    expect(localeOf('content/dossiers/pfas.fr.mdx')).toBe('fr');
    expect(localeOf('content/dossiers/pfas.mdx')).toBe('?');
  });
});

/**
 * LE TEST QUI EMPÊCHE LA DÉRIVE.
 *
 * Le maximum et la liste des collections sont recopiés dans le lint, parce que
 * `velite.config.ts` ne les exporte pas. Une copie à côté de sa source dérive
 * toujours : la liste de `seoTitle` du lint de titre l'a fait dès le lendemain
 * de son écriture (PR #540 puis #542).
 *
 * Le test lit donc `velite.config.ts` et DÉRIVE des deux faits : quelles
 * collections déclarent `summary`, et avec quel maximum. Une collection qui
 * gagne un chapeau, ou un maximum qui passe à 400, fait rougir ici.
 */
describe('maximum et collections verrouillés sur le schéma Velite', () => {
  const config = readFileSync('velite.config.ts', 'utf8');

  // Chaque `defineCollection` porte son `pattern: 'dossiers/*.mdx'`. On découpe
  // sur les patterns : chaque bloc court jusqu'au pattern suivant.
  const blocs = config
    .split(/pattern: '/)
    .slice(1)
    .map((bloc) => ({ dossier: `content/${bloc.slice(0, bloc.indexOf("'")).replace(/\/\*\.mdx$/, '')}`, bloc }));

  const declarations = blocs.flatMap(({ dossier, bloc }) =>
    [...bloc.matchAll(/^\s+summary:\s*(.+?),?\s*$/gm)].map((m) => ({ dossier, decl: m[1] })),
  );

  it('chaque summary du schéma est un s.string().max(SUMMARY_MAX)', () => {
    // Filet : si le découpage casse, la comparaison passerait au vert à vide.
    expect(declarations.length).toBeGreaterThanOrEqual(6);
    for (const { dossier, decl } of declarations) {
      expect(decl, dossier).toBe(`s.string().max(${SUMMARY_MAX})`);
    }
  });

  it('la liste du lint correspond aux collections qui déclarent summary', () => {
    const declarees = new Set(declarations.map((d) => d.dossier));
    expect([...SUMMARY_DIRS].sort()).toEqual([...declarees].sort());
  });
});
