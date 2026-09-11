// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { FrontmatterError } from './frontmatter';
import {
  checkFaqReview,
  extractFaqQuestions,
  findQuestionCollisions,
  normalizeQuestion,
} from './faq-review';

// Fragment figé, recopié tel quel de content/dossiers/lez.fr.mdx le 2026-09-11.
// Il porte la vraie forme du bloc : sources imbriquées, clé suivante au premier
// niveau, et un corps MDX qui contient lui-même le motif « q: ».
const REAL_SHAPE = `---
title: "LEZ : maintenue avec pass annuel et amendes réduites"
slug: lez
locale: fr
faq:
  - q: "Qu'est-ce que la zone de basses émissions (LEZ) à Bruxelles ?"
    a: "La LEZ (Low Emission Zone) est un dispositif régional instauré en 2018."
    sources:
      - label: "Bruxelles Environnement, LEZ"
        url: "https://lez.brussels/"
        accessedAt: "2026-06-17"
  - q: "Où se procurer un pass LEZ à Bruxelles ?"
    a: "Un seul pass existe aujourd'hui, le pass d'une journée."
    sources:
      - label: "Bruxelles Fiscalité, pass d'une journée LEZ"
        url: "https://lez.brussels/mytax/fr/day-pass-info"
        accessedAt: "2026-09-10"
lastModified: "2026-09-10"
changeType: updated
---

## Corps de la fiche

  - q: "Cette ligne est dans le corps MDX et ne doit jamais être lue."
`;

describe('checkFaqReview', () => {
  it('accepte une FAQ relue le jour de la republication', () => {
    const r = checkFaqReview({ lastModified: '2026-09-10', faqReviewed: '2026-09-10' });
    expect(r.verdict).toBe('ok');
    expect(r.reason).toBe('');
  });

  it('accepte une FAQ relue après la republication', () => {
    const r = checkFaqReview({ lastModified: '2026-09-10', faqReviewed: '2026-09-11' });
    expect(r.verdict).toBe('ok');
  });

  it('refuse une date de relecture postérieure à demain, et tolère demain (fuseau)', () => {
    // La date atteste une relecture faite. La CI tourne en UTC : entre 22 h et
    // minuit à Bruxelles, la date locale a un jour d'avance, d'où la marge.
    const today = '2026-09-11';
    expect(checkFaqReview({ lastModified: '2026-09-10', faqReviewed: '2026-09-12', today }).verdict).toBe('ok');
    const r = checkFaqReview({ lastModified: '2026-09-10', faqReviewed: '2026-09-13', today });
    expect(r.verdict).toBe('future');
    expect(r.reason).toContain('futur');
  });

  it("refuse une FAQ relue ne serait-ce qu'un jour avant la republication", () => {
    // Pas de tolérance : la panne du 2026-09-10 était une contradiction le
    // jour même entre le corps de la fiche et sa FAQ.
    const r = checkFaqReview({ lastModified: '2026-09-10', faqReviewed: '2026-09-09' });
    expect(r.verdict).toBe('stale');
    expect(r.reason).toContain('faqReviewed');
  });

  it('refuse une fiche republiée sans date de relecture de la FAQ', () => {
    const r = checkFaqReview({ lastModified: '2026-09-10', faqReviewed: undefined });
    expect(r.verdict).toBe('missing');
    expect(r.reason).toContain('faqReviewed');
  });

  it('signale une date de relecture illisible', () => {
    const r = checkFaqReview({ lastModified: '2026-09-10', faqReviewed: '10/09/2026' });
    expect(r.verdict).toBe('unparsable');
  });

  it('signale une lastModified illisible', () => {
    const r = checkFaqReview({ lastModified: 'hier', faqReviewed: '2026-09-10' });
    expect(r.verdict).toBe('unparsable');
  });

  it("laisse passer une fiche sans lastModified, déjà refusée par le check dédié", () => {
    const r = checkFaqReview({ lastModified: undefined, faqReviewed: '2026-09-10' });
    expect(r.verdict).toBe('ok');
  });
});

describe('normalizeQuestion', () => {
  it('rend identiques deux formulations qui ne diffèrent que par la typographie', () => {
    const a = normalizeQuestion("Qu'est-ce que la zone de basses émissions (LEZ) à Bruxelles ?");
    const b = normalizeQuestion('qu’est-ce que la zone de basses emissions LEZ a  Bruxelles');
    expect(a).toBe(b);
  });

  it('distingue deux questions réellement différentes', () => {
    expect(normalizeQuestion('Qui gère la mobilité à Bruxelles ?')).not.toBe(
      normalizeQuestion('Qui gère le logement social à Bruxelles ?'),
    );
  });
});

describe('extractFaqQuestions', () => {
  it('lit les questions du bloc faq dans leur ordre, sans les sources imbriquées', () => {
    expect(extractFaqQuestions(REAL_SHAPE)).toEqual([
      "Qu'est-ce que la zone de basses émissions (LEZ) à Bruxelles ?",
      'Où se procurer un pass LEZ à Bruxelles ?',
    ]);
  });

  it('ignore une ligne « q: » située dans le corps MDX', () => {
    expect(extractFaqQuestions(REAL_SHAPE)).not.toContain(
      'Cette ligne est dans le corps MDX et ne doit jamais être lue.',
    );
  });

  it('rend une liste vide pour une fiche sans bloc faq', () => {
    const noFaq = '---\ntitle: "Sans FAQ"\nlastModified: "2026-09-10"\n---\n\nCorps.\n';
    expect(extractFaqQuestions(noFaq)).toEqual([]);
  });

  it('lit aussi une question entre apostrophes simples ou sans guillemets', () => {
    const variants = [
      '---',
      'faq:',
      "  - q: 'Question entre apostrophes ?'",
      '    a: "Réponse."',
      '  - q: Question sans guillemets ?',
      '    a: "Réponse."',
      'lastModified: "2026-09-10"',
      '---',
    ].join('\n');
    expect(extractFaqQuestions(variants)).toEqual([
      'Question entre apostrophes ?',
      'Question sans guillemets ?',
    ]);
  });
});

describe('extractFaqQuestions, parseur YAML', () => {
  it('lit une question écrite en bloc replié', () => {
    const file = ['---', 'faq:', '  - q: >-', '      Question sur', '      deux lignes ?', '    a: "R."', '---', ''].join('\n');
    expect(extractFaqQuestions(file)).toEqual(['Question sur deux lignes ?']);
  });

  it('lève sur une clé dupliquée plutôt que de choisir en silence', () => {
    // La lecture ligne à ligne retenait la première, Velite retient la dernière.
    const file = ['---', 'faqReviewed: "2026-09-01"', 'faqReviewed: "2026-09-11"', '---', ''].join('\n');
    expect(() => extractFaqQuestions(file)).toThrow(FrontmatterError);
  });

  it('lève sur un frontmatter YAML invalide', () => {
    const file = ['---', 'faq:', '  - q: "non fermée', '---', ''].join('\n');
    expect(() => extractFaqQuestions(file)).toThrow(/illisible/);
  });
});

describe('findQuestionCollisions', () => {
  it('signale une question répétée dans une même fiche', () => {
    const collisions = findQuestionCollisions([
      { slug: 'lez', locale: 'fr', questions: ['Où acheter un pass LEZ ?', 'Où acheter un pass LEZ ?'] },
    ]);
    expect(collisions).toHaveLength(1);
    expect(collisions[0]!.slugs).toEqual(['lez']);
    expect(collisions[0]!.count).toBe(2);
  });

  it('signale une même question portée par deux fiches dans la même langue', () => {
    const collisions = findQuestionCollisions([
      { slug: 'lez', locale: 'fr', questions: ["Qu'est-ce que la zone de basses émissions (LEZ) à Bruxelles ?"] },
      { slug: 'mobility', locale: 'fr', questions: ['Qu’est-ce que la zone de basses émissions (LEZ) à Bruxelles ?'] },
    ]);
    expect(collisions).toHaveLength(1);
    expect(collisions[0]!.locale).toBe('fr');
    expect(collisions[0]!.slugs).toEqual(['lez', 'mobility']);
  });

  it("ne confond pas deux langues différentes", () => {
    const collisions = findQuestionCollisions([
      { slug: 'lez', locale: 'fr', questions: ['LEZ ?'] },
      { slug: 'mobility', locale: 'nl', questions: ['LEZ ?'] },
    ]);
    expect(collisions).toEqual([]);
  });

  it('ne signale rien quand chaque question a une seule fiche', () => {
    const collisions = findQuestionCollisions([
      { slug: 'lez', locale: 'fr', questions: ['Où se procurer un pass LEZ à Bruxelles ?'] },
      { slug: 'mobility', locale: 'fr', questions: ['Qui gère la mobilité à Bruxelles ?'] },
    ]);
    expect(collisions).toEqual([]);
  });
});
