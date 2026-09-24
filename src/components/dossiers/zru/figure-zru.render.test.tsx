// @vitest-environment jsdom
// src/components/dossiers/zru/figure-zru.render.test.tsx
import { render, cleanup } from '@testing-library/react';
import * as matchers from 'vitest-axe/matchers';
import { axe } from 'vitest-axe';
import type { AxeMatchers } from 'vitest-axe/matchers';
import { afterEach, describe, expect, it } from 'vitest';
import { FigureZru } from './figure-zru';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  interface Assertion<T = any> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
expect.extend(matchers);
afterEach(() => cleanup());

const props = {
  idBase: 'test-fig', locale: 'nl' as const, titre: 'Titel', indicateur: 'Mediaan belastbaar inkomen', periode: '2023',
  provenance: {
    producteur: { fr: 'IBSA', nl: 'BISA', en: 'IBSA', de: 'IBSA' },
    url: 'https://monitoringdesquartiers.brussels/Indicator/IndicatorPage/2498',
    sourceMiseAJour: '2026-06-01',
    extraitLe: '2026-09-24',
    licence: {
      fr: 'Réutilisation libre avec mention de la source',
      nl: 'Vrij hergebruik met bronvermelding',
      en: 'Free reuse with attribution',
      de: 'Freie Weiterverwendung mit Quellenangabe',
    },
    modifications: { fr: [] as string[], nl: [] as string[], en: [] as string[], de: [] as string[] },
    confiance: 'official' as const,
  },
  resumeSvg: 'Kaart van 145 wijken',
  svg: <svg viewBox="0 0 10 10"><path d="M0 0L1 1Z" /></svg>,
  tableau: { caption: 'Waarden', colonnes: ['Wijk', 'Waarde'], lignes: [['A', 1]] },
};

describe('FigureZru', () => {
  it('le figcaption porte indicateur, période, source et date d\'extraction localisée', () => {
    const { container } = render(<FigureZru {...props} />);
    const cap = container.querySelector('figcaption')!.textContent!;
    for (const s of ['Mediaan belastbaar inkomen', '2023', 'BISA']) expect(cap).toContain(s);
    // Date d'extraction : dateTime porte l'ISO, le texte visible est localisé (pas l'ISO brut).
    const extraitTime = container.querySelector('figcaption time[datetime="2026-09-24"]');
    expect(extraitTime).not.toBeNull();
    expect(extraitTime!.textContent).toBe('24 september 2026');
    expect(cap).not.toContain('2026-09-24');
  });

  it('les 7 champs de provenance sont présents dans le rendu (producteur, url, mise à jour source, extraction, licence, modifications, confiance)', () => {
    const { container } = render(
      <FigureZru
        {...props}
        provenance={{
          ...props.provenance,
          modifications: { fr: ['Simplification', 'Arrondi'], nl: ['Vereenvoudiging tot 5 klassen', 'Afgerond op een decimaal'], en: ['a', 'b'], de: ['c', 'd'] },
        }}
      />,
    );
    const texte = container.textContent!;
    // Producteur
    expect(texte).toContain('BISA');
    // URL : portée par le lien vers la source
    expect(container.querySelector('a')?.getAttribute('href')).toBe(props.provenance.url);
    // Mise à jour de la source : dateTime = ISO, texte visible localisé
    const majTime = container.querySelector('time[datetime="2026-06-01"]');
    expect(majTime).not.toBeNull();
    expect(majTime!.textContent).toBe('1 juni 2026');
    // Extraction
    expect(container.querySelector('time[datetime="2026-09-24"]')).not.toBeNull();
    // Licence
    expect(texte).toContain(props.provenance.licence.nl);
    // Modifications : celles de la locale, jamais celles d'une autre
    expect(texte).toContain('Vereenvoudiging tot 5 klassen; Afgerond op een decimaal');
    expect(texte).not.toContain('Simplification');
    // Confiance
    expect(texte).toContain('officieel');
  });

  it('date de mise à jour de la source absente : libellé localisé « inconnu », jamais une chaîne vide', () => {
    const { container } = render(
      <FigureZru {...props} provenance={{ ...props.provenance, sourceMiseAJour: null }} />,
    );
    const cap = container.querySelector('figcaption')!.textContent!;
    expect(cap).toContain('onbekend');
    // Jamais une valeur vide entre le libellé et le séparateur suivant.
    expect(cap).not.toMatch(/bijwerking van de bron\s*:\s*;/);
  });

  it('ponctuation localisée : espace insécable avant « : » et « ; » en français seulement', () => {
    const { container, rerender } = render(<FigureZru {...props} />);
    const nl = container.querySelector('figcaption')!.textContent!;
    expect(nl).toContain('Bron: ');
    expect(nl).not.toMatch(/\s[:;]/);
    rerender(<FigureZru {...props} locale="fr" />);
    const fr = container.querySelector('figcaption')!.textContent!;
    expect(fr).toContain('Source\u00a0: ');
    expect(fr).not.toMatch(/[^\u00a0][:;]\s/);
  });

  it('les nombres du tableau suivent la convention locale (fr-BE : virgule décimale, espace insécable pour les milliers)', () => {
    const { container } = render(
      <FigureZru
        {...props}
        locale="fr"
        tableau={{ caption: 'Valeurs', colonnes: ['Quartier', 'Valeur'], lignes: [['A', 24350.5]] }}
      />,
    );
    const cellule = container.querySelectorAll('details td')[1]!.textContent!;
    expect(cellule).toContain(',5');
    // Séparateur de milliers de type espace (insécable ou fine insécable), jamais une virgule ou un point.
    expect(cellule).toMatch(/24[   ]350,5/);
  });

  it('une chaîne de tableau passe telle quelle (pas de formatage numérique)', () => {
    const { container } = render(<FigureZru {...props} locale="fr" />);
    const cellule = container.querySelectorAll('details td')[0]!.textContent!;
    expect(cellule).toBe('A');
  });

  it('le lien externe vers la source ouvre un nouvel onglet, comme la liste des sources du dossier', () => {
    const { container } = render(<FigureZru {...props} />);
    const lien = container.querySelector('figcaption a')!;
    expect(lien.getAttribute('target')).toBe('_blank');
    expect(lien.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('aucun texte dans le SVG hormis title et desc', () => {
    const { container } = render(<FigureZru {...props} />);
    expect(container.querySelectorAll('svg text')).toHaveLength(0);
    expect(container.querySelector('svg title')?.textContent).toBe('Titel');
  });

  it('le tableau équivalent est dans un details, avec caption et en-têtes de colonne', () => {
    const { container } = render(<FigureZru {...props} />);
    expect(container.querySelector('details table caption')?.textContent).toBe('Waarden');
    expect(container.querySelectorAll('details th[scope="col"]')).toHaveLength(2);
  });

  it('libellés dans la locale passée (néerlandais), pas de français', () => {
    const { container } = render(<FigureZru {...props} />);
    expect(container.textContent).not.toMatch(/Source|Données|extrait/);
  });

  it('deux figures avec des idBase distincts ne produisent pas d\'identifiants dupliqués', () => {
    const { container } = render(
      <>
        <FigureZru {...props} idBase="fig-a" />
        <FigureZru {...props} idBase="fig-b" />
      </>,
    );
    const ids = Array.from(container.querySelectorAll('[id]')).map((el) => el.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('légende : rendue dans la figure si fournie, absente du rendu si omise', () => {
    const { container, rerender } = render(
      <FigureZru {...props} legende={<ul data-testid="legende"><li>Trait plein</li></ul>} />,
    );
    const figure = container.querySelector('figure')!;
    expect(figure.querySelector('[data-testid="legende"]')).not.toBeNull();
    expect(figure.textContent).toContain('Trait plein');

    rerender(<FigureZru {...props} />);
    expect(container.querySelector('[data-testid="legende"]')).toBeNull();
  });

  it('passe axe', async () => {
    const { container } = render(<FigureZru {...props} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
