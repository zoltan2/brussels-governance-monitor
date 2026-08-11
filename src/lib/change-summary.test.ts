// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractSummary, extractNumbers } from './change-summary';

beforeEach(() => {
  vi.resetModules();
});

const mdx = `---
title: Mobilité
changeSummary: "Le budget passe de 12 à 18 millions d'euros."
lastModified: 2026-08-09
---

Le corps de la fiche, avec 42 kilomètres de pistes cyclables.
`;

describe('extractSummary', () => {
  it('lit le changeSummary entre guillemets', () => {
    expect(extractSummary(mdx)).toBe("Le budget passe de 12 à 18 millions d'euros.");
  });

  it('lit un changeSummary sans guillemets', () => {
    expect(extractSummary('---\nchangeSummary: Texte simple\n---\n')).toBe('Texte simple');
  });

  it('renvoie null quand le champ est absent', () => {
    expect(extractSummary('---\ntitle: X\n---\n')).toBeNull();
  });

  it('renvoie null sur un fichier sans en-tête', () => {
    expect(extractSummary('Juste du texte.')).toBeNull();
  });

  it('ne rend pas le marqueur d\'un scalaire bloc YAML', () => {
    // `changeSummary: >` n'a pas sa valeur sur cette ligne ; la rendre
    // afficherait « Après : > » à l'écran.
    expect(extractSummary('---\nchangeSummary: >\n  Texte plus bas.\n---\n')).toBeNull();
    expect(extractSummary('---\nchangeSummary: |\n  Texte plus bas.\n---\n')).toBeNull();
  });

  it('ne lit pas un changeSummary situé dans le corps', () => {
    expect(extractSummary('---\ntitle: X\n---\n\nchangeSummary: piège\n')).toBeNull();
  });
});

describe('extractNumbers', () => {
  it('relève les nombres du corps et de l\'en-tête', () => {
    const found = extractNumbers(mdx);
    expect(found).toContain('12');
    expect(found).toContain('18');
    expect(found).toContain('42');
  });

  it('ignore les dates au format ISO, qui ne sont pas des chiffres éditoriaux', () => {
    expect(extractNumbers('---\nlastModified: 2026-08-09\n---\n')).toEqual([]);
  });

  it('garde les nombres à séparateur de milliers', () => {
    expect(extractNumbers('Le total atteint 1 250 000 euros.')).toContain('1 250 000');
  });

  it('garde la décimale à la virgule, omniprésente dans le contenu', () => {
    expect(extractNumbers('7,4 µg/m³ et +60,9 %')).toEqual(['7,4', '60,9']);
  });

  it('ne soude pas deux nombres séparés par une virgule et une espace', () => {
    expect(extractNumbers('En 2024, 12 communes')).toEqual(['2024', '12']);
  });

  it('repère une transposition de décimale, cas de fausse assurance', () => {
    // « 3,1 % » devenu « 1,3 % » : mêmes chiffres, valeur différente. Une
    // version antérieure rendait [] et ne signalait rien.
    const avant = new Set(extractNumbers('Une baisse de 3,1 %.'));
    const apres = extractNumbers('Une baisse de 1,3 %.');
    expect(apres.filter((n) => !avant.has(n))).toEqual(['1,3']);
  });
});

describe('collectSummaryChanges', () => {
  it('ne signale que les chiffres absents de la version antérieure', async () => {
    vi.doMock('./github-pr', () => ({
      readFileAtRef: vi.fn(async (_p: string, ref: string) =>
        ref === 'base'
          ? '---\nchangeSummary: "Le budget est de 12 millions."\n---\n'
          : '---\nchangeSummary: "Le budget passe à 18 millions."\n---\n',
      ),
    }));
    const { collectSummaryChanges } = await import('./change-summary');
    const [c] = await collectSummaryChanges(
      ['content/domain-cards/x.fr.mdx'],
      'base',
      'head',
    );
    expect(c.before).toBe('Le budget est de 12 millions.');
    expect(c.after).toBe('Le budget passe à 18 millions.');
    expect(c.numbers).toEqual(['18']);
    expect(c.label).toBe('domain-cards/x');
  });

  it('reste lisible pour une fiche créée, sans état antérieur', async () => {
    vi.doMock('./github-pr', () => ({
      readFileAtRef: vi.fn(async (_p: string, ref: string) =>
        ref === 'base' ? null : '---\nchangeSummary: "Nouvelle fiche."\n---\n',
      ),
    }));
    const { collectSummaryChanges } = await import('./change-summary');
    const [c] = await collectSummaryChanges(['content/dossiers/y.fr.mdx'], 'base', 'head');
    expect(c.before).toBeNull();
    expect(c.after).toBe('Nouvelle fiche.');
  });
});
