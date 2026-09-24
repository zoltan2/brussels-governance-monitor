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
import { LIGNES, NIVEAUX, SOURCES_MATRICE, sourcesCitees } from './data/competences';
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

/** Toutes les sources d'une ligne : la source principale et, le cas échéant, celles des colonnes Fait et Évalué (sourceEvalue peut être un tableau). */
function sourcesDe(p: (typeof PROGRAMMES)[number]) {
  const evalues = p.sourceEvalue === undefined ? [] : Array.isArray(p.sourceEvalue) ? p.sourceEvalue : [p.sourceEvalue];
  return [p.source, p.sourcePromis, p.sourceFait, ...evalues].filter((s): s is { libelle: string; url: string } => s !== undefined);
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

  it('les sources secondaires (Promis, Fait, Évalué) sont liées dans leur cellule, et seulement quand la valeur existe', () => {
    const { container } = render(<ZruProgrammes />);
    for (const p of PROGRAMMES) {
      if (p.sourcePromis) expect(container.querySelector(`a[href="${p.sourcePromis.url}"]`)).toBeTruthy();
      if (p.sourceFait) {
        expect(p.fait.fr).not.toBeNull();
        expect(container.querySelector(`a[href="${p.sourceFait.url}"]`)).toBeTruthy();
      }
      if (p.sourceEvalue) {
        expect(p.evalue.fr).not.toBeNull();
        const evalues = Array.isArray(p.sourceEvalue) ? p.sourceEvalue : [p.sourceEvalue];
        for (const s of evalues) expect(container.querySelector(`a[href="${s.url}"]`)).toBeTruthy();
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

  it('grandes villes : Fait null, rendu « non publié pour Bruxelles », sans le chiffre national', () => {
    const p = PROGRAMMES.find((x) => x.id === 'grandes-villes-2005-2007')!;
    for (const l of LOCALES) expect(p.fait[l]).toBeNull();
    const attendus: Record<Locale, string> = {
      fr: 'non publié pour Bruxelles',
      nl: 'niet gepubliceerd voor Brussel',
      en: 'not published for Brussels',
      de: 'für Brüssel nicht veröffentlicht',
    };
    for (const l of LOCALES) {
      const { container } = render(<ZruProgrammes locale={l} />);
      const ligne = Array.from(container.querySelectorAll('tbody tr')).find((tr) =>
        tr.querySelector('th')!.textContent!.includes(p.libelle[l]),
      )!;
      expect(ligne.textContent).toContain(attendus[l]);
      expect(ligne.textContent).not.toMatch(/60[.,\u00a0 ]?412[.,\u00a0 ]?545|30[.,]5/);
      cleanup();
    }
  });

  it('contrats de quartier : les engagements sont dans Promis, Fait est null', () => {
    const p = PROGRAMMES.find((x) => x.id === 'contrats-quartier')!;
    for (const l of LOCALES) {
      expect(p.fait[l]).toBeNull();
      expect(p.promis[l]).toMatch(/194[.,\u00a0]881[.,\u00a0]409/);
    }
  });

  it('contrats de quartier : \u00c9valu\u00e9 cite les deux \u00e9valuations publi\u00e9es (audit 2001 et \u00e9valuation 2018), chacune avec sa source li\u00e9e', () => {
    const p = PROGRAMMES.find((x) => x.id === 'contrats-quartier')!;
    expect(Array.isArray(p.sourceEvalue)).toBe(true);
    const sources = p.sourceEvalue as { libelle: string; url: string }[];
    expect(sources).toHaveLength(2);
    expect(sources.map((s) => s.url)).toContain('https://www.ccrek.be/sites/default/files/Docs/158e_12e_b_opm_c_obs_br.pdf');
    expect(sources.map((s) => s.url)).toContain(
      'https://publication.urban.brussels/DRU_DSV/COM/Liens_doc_site_quartiers/EVAL_CQD_Rapport%20final_FR_03092018.pdf',
    );
    for (const l of LOCALES) {
      expect(p.evalue[l]).toMatch(/2001/);
      expect(p.evalue[l]).toMatch(/2018/);
    }
    const { container } = render(<ZruProgrammes />);
    const ligne = Array.from(container.querySelectorAll('tbody tr')).find((tr) => tr.querySelector('th')!.textContent!.includes(p.libelle.fr))!;
    for (const s of sources) expect(ligne.querySelector(`a[href="${s.url}"]`)).toBeTruthy();
  });

  it('pourcentages : espace insécable avant % en fr, nl et de, jamais une espace simple', () => {
    const textes: string[] = [];
    for (const p of PROGRAMMES) {
      for (const champ of [p.libelle, p.promis, p.fait, p.evalue]) {
        for (const l of ['fr', 'nl', 'de'] as const) if (champ[l]) textes.push(champ[l]!);
      }
    }
    for (const lg of LIGNES) for (const c of Object.values(lg.cases)) for (const l of ['fr', 'nl', 'de'] as const) textes.push(c![l]);
    for (const t of textes) expect(t).not.toMatch(/\d %/);
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

  it('ligne des sources : un lien par source citée, chaque case remplie sourcée, aucune source sur une case vide', () => {
    for (const l of LIGNES) {
      for (const n of NIVEAUX) {
        const rempli = l.cases[n.cle] !== undefined;
        const sources = l.sources[n.cle] ?? [];
        expect(sources.length > 0).toBe(rempli);
      }
    }
    const cles = sourcesCitees();
    const { container } = render(<ZruMatrice />);
    const liens = Array.from(container.querySelectorAll('p a'));
    expect(liens).toHaveLength(new Set(cles).size);
    for (const cle of cles) {
      const a = liens.find((x) => x.getAttribute('href') === SOURCES_MATRICE[cle].url)!;
      expect(a, cle).toBeTruthy();
      expect(a.getAttribute('target')).toBe('_blank');
      expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    }
  });

  it('sources de la matrice en https, sauf hôtes http listés', () => {
    for (const s of Object.values(SOURCES_MATRICE)) {
      const u = new URL(s.url);
      if (u.protocol === 'https:') continue;
      expect(HOTES_HTTP_AUTORISES).toContain(u.hostname);
    }
  });

  it('cases vides : nom accessible valide (role="img" et aria-label)', () => {
    const { container } = render(<ZruMatrice />);
    const vides = container.querySelectorAll('[aria-label="Aucun rôle établi par les sources"]');
    expect(vides.length).toBeGreaterThan(0);
    for (const v of vides) expect(v.getAttribute('role')).toBe('img');
  });

  it('région défilante du tableau : focalisable et nommée par la légende', () => {
    const { container } = render(<ZruMatrice />);
    const region = container.querySelector('[role="region"]')!;
    expect(region.getAttribute('tabindex')).toBe('0');
    expect(region.getAttribute('aria-labelledby')).toBe('zru-matrice-caption');
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
