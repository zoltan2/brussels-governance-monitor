// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.
// src/components/dossiers/zru/programmes.render.test.tsx
import { render, cleanup } from '@testing-library/react';
import * as matchers from 'vitest-axe/matchers';
import { axe } from 'vitest-axe';
import type { AxeMatchers } from 'vitest-axe/matchers';
import { afterEach, describe, expect, it } from 'vitest';
import { ZruProgrammes } from './programmes';
import { ZruMatrice } from './matrice';
import { PROGRAMMES, HOTES_HTTP_AUTORISES } from './data/programmes';
import { LIGNES, NIVEAUX } from './data/competences';
import type { Locale } from './data/types';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  interface Assertion<T = any> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
expect.extend(matchers);
afterEach(() => cleanup());

const LOCALES: Locale[] = ['fr', 'nl', 'en', 'de'];

/** Toutes les sources d'une ligne : la source principale et, le cas échéant, celles des colonnes Fait et Évalué. */
function sourcesDe(p: (typeof PROGRAMMES)[number]) {
  return [p.source, p.sourceFait, p.sourceEvalue].filter((s): s is { libelle: string; url: string } => s !== undefined);
}

describe('ZruProgrammes', () => {
  it('une ligne par programme, avec source liée', () => {
    const { container } = render(<ZruProgrammes />);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(PROGRAMMES.length);
    for (const p of PROGRAMMES) expect(container.querySelector(`a[href="${p.source.url}"]`)).toBeTruthy();
  });

  it('« non évalué » en texte quand evalue est null, jamais une case vide', () => {
    const { container } = render(<ZruProgrammes />);
    const nonEvalues = PROGRAMMES.filter((p) => p.evalue.fr === null).length;
    expect(container.textContent!.match(/non évalué/g)?.length ?? 0).toBe(nonEvalues);
  });

  it('« non publié » en texte quand fait est null', () => {
    const { container } = render(<ZruProgrammes />);
    const nonPublies = PROGRAMMES.filter((p) => p.fait.fr === null).length;
    expect(container.textContent!.match(/non publié/g)?.length ?? 0).toBe(nonPublies);
  });

  it('toutes les URL de source en https, sauf hôtes http listés (weblex.brussels ne sert pas de certificat valide)', () => {
    for (const p of PROGRAMMES) {
      for (const s of sourcesDe(p)) {
        const u = new URL(s.url);
        if (u.protocol === 'https:') continue;
        expect(u.protocol).toBe('http:');
        expect(HOTES_HTTP_AUTORISES).toContain(u.hostname);
      }
    }
  });

  it('source principale en https (la seule exception http est une source secondaire)', () => {
    for (const p of PROGRAMMES) expect(p.source.url.startsWith('https://')).toBe(true);
  });

  it('les sources secondaires (Fait, Évalué) sont liées dans leur cellule, et seulement quand la valeur existe', () => {
    const { container } = render(<ZruProgrammes />);
    for (const p of PROGRAMMES) {
      if (p.sourceFait) {
        expect(p.fait.fr).not.toBeNull();
        expect(container.querySelector(`a[href="${p.sourceFait.url}"]`)).toBeTruthy();
      }
      if (p.sourceEvalue) {
        expect(p.evalue.fr).not.toBeNull();
        expect(container.querySelector(`a[href="${p.sourceEvalue.url}"]`)).toBeTruthy();
      }
    }
  });

  it('liens externes : nouvel onglet, comme la liste des sources du dossier', () => {
    const { container } = render(<ZruProgrammes />);
    const liens = container.querySelectorAll('a');
    expect(liens.length).toBeGreaterThan(0);
    for (const a of liens) {
      expect(a.getAttribute('target')).toBe('_blank');
      expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    }
  });

  it('données : jamais de chaîne vide, null identique dans les 4 langues, pas de tiret long', () => {
    for (const p of PROGRAMMES) {
      for (const champ of [p.libelle, p.promis, p.fait, p.evalue] as Record<Locale, string | null>[]) {
        const estNull = champ.fr === null;
        for (const l of LOCALES) {
          expect(champ[l] === null).toBe(estNull);
          if (champ[l] !== null) {
            expect(champ[l]!.trim()).not.toBe('');
            expect(champ[l]).not.toMatch(/—/);
          }
        }
      }
      expect(p.source.libelle.trim()).not.toBe('');
    }
  });

  it('identifiants de programme uniques', () => {
    const ids = PROGRAMMES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each([
    ['nl', 'niet geëvalueerd'],
    ['en', 'not evaluated'],
    ['de', 'nicht bewertet'],
  ] as const)('locale %s : libellé localisé, pas de français', (locale, libelle) => {
    const { container } = render(<ZruProgrammes locale={locale} />);
    const nonEvalues = PROGRAMMES.filter((p) => p.evalue[locale] === null).length;
    expect(container.textContent!.split(libelle).length - 1).toBe(nonEvalues);
    expect(container.textContent).not.toMatch(/non évalué|non publié/);
  });

  it('tableau accessible : caption, en-têtes de colonne et de ligne, région défilante focalisable et nommée', () => {
    const { container } = render(<ZruProgrammes />);
    expect(container.querySelector('table caption')?.textContent).toBeTruthy();
    expect(container.querySelectorAll('thead th[scope="col"]')).toHaveLength(5);
    expect(container.querySelectorAll('tbody th[scope="row"]')).toHaveLength(PROGRAMMES.length);
    const region = container.querySelector('[role="region"]')!;
    expect(region.getAttribute('tabindex')).toBe('0');
    expect(region.getAttribute('aria-label')).toBeTruthy();
  });

  it('passe axe', async () => {
    const { container } = render(<ZruProgrammes />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('ZruMatrice', () => {
  it('une ligne par thème, un en-tête par niveau', () => {
    const { container } = render(<ZruMatrice />);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(LIGNES.length);
    expect(container.querySelectorAll('thead th[scope="col"]')).toHaveLength(NIVEAUX.length + 1);
  });

  it('identifiants dérivés de idBase, uniques', () => {
    const { container } = render(<ZruMatrice />);
    expect(container.querySelector('#zru-matrice-caption')).toBeTruthy();
    const ids = Array.from(container.querySelectorAll('[id]')).map((el) => el.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cases : jamais de chaîne vide, présentes ou absentes dans les 4 langues à la fois, pas de tiret long', () => {
    for (const l of LIGNES) {
      for (const n of NIVEAUX) {
        const c = l.cases[n.cle];
        if (!c) continue;
        for (const loc of LOCALES) {
          expect(c[loc].trim()).not.toBe('');
          expect(c[loc]).not.toMatch(/—/);
        }
      }
    }
  });

  it('IBSA en français, BISA en néerlandais', () => {
    const fr = render(<ZruMatrice locale="fr" />).container.textContent!;
    cleanup();
    const nl = render(<ZruMatrice locale="nl" />).container.textContent!;
    expect(fr).not.toMatch(/BISA/);
    expect(nl).not.toMatch(/IBSA/);
  });

  it('passe axe', async () => {
    const { container } = render(<ZruMatrice />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
