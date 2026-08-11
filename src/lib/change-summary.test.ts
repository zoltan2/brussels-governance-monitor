// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect } from 'vitest';
import { extractSummary, extractNumbers } from './change-summary';

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
});
