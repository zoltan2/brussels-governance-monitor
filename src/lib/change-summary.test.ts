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
          ? '---\nchangeSummary: "Le budget de 12 millions couvre 5 communes."\n---\n'
          : '---\nchangeSummary: "Le budget de 18 millions couvre 5 communes."\n---\n',
      ),
    }));
    const { collectSummaryChanges } = await import('./change-summary');
    const [c] = await collectSummaryChanges(
      ['content/domain-cards/x.fr.mdx'],
      'base',
      'head',
    );
    expect(c.before).toBe('Le budget de 12 millions couvre 5 communes.');
    expect(c.after).toBe('Le budget de 18 millions couvre 5 communes.');
    // Le « 5 » est présent des deux côtés : il ne doit PAS être signalé.
    // C'est ce chiffre partagé qui rend le filtre observable — sans lui, un
    // code qui ne filtrerait rien passerait ce test sans broncher.
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
    // Un 404 sur la base est le cas NOMINAL : ce n'est pas une panne.
    expect(c.unreadable).toBe(false);
  });

  it('marque la fiche illisible quand la lecture échoue, sans se taire', async () => {
    // Un 403 de quota faisait afficher « aucun résumé de changement » et zéro
    // chiffre nouveau, indiscernable d'une veille sans résumé.
    vi.doMock('./github-pr', () => ({
      readFileAtRef: vi.fn(async () => {
        throw new Error('contents/x: GitHub a répondu 403');
      }),
    }));
    const { collectSummaryChanges } = await import('./change-summary');
    const [c] = await collectSummaryChanges(['content/dossiers/y.fr.mdx'], 'base', 'head');
    expect(c.unreadable).toBe(true);
    expect(c.after).toBeNull();
    expect(c.numbers).toEqual([]);
    // Le drapeau ne remplace pas la fiche : on sait toujours de laquelle il
    // s'agit.
    expect(c.label).toBe('dossiers/y');
  });

  it('n\'abandonne pas les fiches lisibles quand une seule échoue', async () => {
    vi.doMock('./github-pr', () => ({
      readFileAtRef: vi.fn(async (p: string) => {
        if (p.includes('casse')) throw new Error('403');
        return '---\nchangeSummary: "Fiche lisible."\n---\n';
      }),
    }));
    const { collectSummaryChanges } = await import('./change-summary');
    const changes = await collectSummaryChanges(
      ['content/dossiers/casse.fr.mdx', 'content/dossiers/ok.fr.mdx'],
      'base',
      'head',
    );
    expect(changes.map((c) => c.unreadable)).toEqual([true, false]);
    expect(changes[1].after).toBe('Fiche lisible.');
  });
});

describe('extractNumbers — bruit écarté (veille du 27 août 2026)', () => {
  it("n'extrait pas l'identifiant numérique d'une URL de source", () => {
    const mdx = [
      '  - label: "RTBF — Une fresque en hommage (30 juillet 2026)"',
      '    url: "https://www.rtbf.be/article/une-fresque-en-hommage-a-driss-atounane-11764332"',
    ].join('\n');
    expect(extractNumbers(mdx)).not.toContain('11764332');
  });

  it("n'extrait pas la cible d'un lien markdown", () => {
    const prose = 'Sources : [BX1 (26 août 2026)](https://bx1.be/categories/news/xyz-11773596/).';
    expect(extractNumbers(prose)).not.toContain('11773596');
  });

  it('garde le libellé chiffré d\'un lien mais jette sa cible', () => {
    const prose = '[57 fusillades](https://bx1.be/a-11764332/)';
    const found = extractNumbers(prose);
    expect(found).toContain('57');
    expect(found).not.toContain('11764332');
  });

  it('écarte les dates en toutes lettres dans les quatre langues', () => {
    expect(extractNumbers('Le 26 août 2026, la Ville a déposé sa demande.')).toEqual([]);
    expect(extractNumbers('Op 25 augustus 2026 werd het gevonden.')).toEqual([]);
    expect(extractNumbers('On 21 August 2026 the auditor ruled.')).toEqual([]);
    expect(extractNumbers('Am 1. September 2026 entfallen die Plätze.')).toEqual([]);
  });

  it('écarte « 1er septembre 2026 » en entier', () => {
    expect(extractNumbers('Les places disparaissent le 1er septembre 2026.')).toEqual([]);
  });

  it('garde une année citée seule, qui porte une information éditoriale', () => {
    expect(extractNumbers('En 2024, 12 communes ont relevé leurs additionnels.')).toEqual([
      '2024',
      '12',
    ]);
  });

  it('garde les chiffres éditoriaux voisins d\'une date', () => {
    const prose =
      'Le 27 août 2026, le baromètre établit 23,2 % à Bruxelles contre 8,5 % en Flandre.';
    expect(extractNumbers(prose)).toEqual(['23,2', '8,5']);
  });

  it('garde un grand nombre à séparateur de milliers hors URL', () => {
    expect(extractNumbers('97 392 demandeurs d\'emploi au 31 juillet 2026.')).toContain('97 392');
  });
});

describe('extractNumbers — dates sans année, heures, doublons', () => {
  it('écarte une date sans année, portée par le titre de section', () => {
    expect(extractNumbers('Le 29 juillet, une fresque a été peinte.')).toEqual([]);
    expect(extractNumbers('Op 25 augustus werd het vastgesteld.')).toEqual([]);
  });

  it('écarte une heure d\'horloge', () => {
    expect(extractNumbers('Le 23 juillet, vers 15h20, dans le tram 55.')).toEqual(['55']);
  });

  it('dédoublonne en conservant l\'ordre d\'apparition', () => {
    expect(extractNumbers('54 ans, ligne 55, puis 54 à nouveau, puis 12.')).toEqual([
      '54',
      '55',
      '12',
    ]);
  });

  it('ne confond pas un mois avec un chiffre voisin non daté', () => {
    // « 12 » n'est pas suivi d'un mois : il reste relevé.
    expect(extractNumbers('En mai 2026, 12 communes ont voté.')).toEqual(['12']);
  });
});
