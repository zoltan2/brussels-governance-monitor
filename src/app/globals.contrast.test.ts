// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

/**
 * Garde-fou WCAG sur la palette de `globals.css`.
 *
 * Le mode sombre du projet marche par swap de variables CSS : un même token
 * (`text-neutral-500`, `bg-status-delayed`, …) sert dans les deux modes. Un
 * réglage qui passe en clair peut donc échouer en sombre sans que personne le
 * voie. Ce test recalcule les ratios depuis le CSS lui-même : si quelqu'un
 * retouche une valeur oklch, il échoue.
 *
 * Références : WCAG 2.2 SC 1.4.3 (texte, 4.5:1), 1.4.6 (AAA, 7:1),
 * 1.4.11 (composants d'interface et objets graphiques porteurs de sens, 3:1).
 */

const css = readFileSync(resolve(__dirname, 'globals.css'), 'utf8');

// ---------------------------------------------------------------- couleurs --

/** oklch → sRGB linéaire (gamut clampé, comme le fait le navigateur). */
function oklchToLinearRgb(L: number, C: number, H: number): [number, number, number] {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb: [number, number, number] = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return rgb.map((v) => Math.min(1, Math.max(0, v))) as [number, number, number];
}

/** Luminance relative WCAG. */
function luminance(token: string): number {
  const [r, g, b] = oklchToLinearRgb(...parseOklch(token));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [ya, yb] = [luminance(a), luminance(b)];
  const [hi, lo] = ya > yb ? [ya, yb] : [yb, ya];
  return (hi + 0.05) / (lo + 0.05);
}

// -------------------------------------------------------------- extraction --

/** Isole le texte brut d'un bloc CSS (accolades comprises), délimité par comptage de profondeur. */
function blockBody(selector: string): string {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`Bloc CSS introuvable : ${selector}`);
  const open = css.indexOf('{', start);
  let depth = 0;
  let end = open;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) {
      end = i;
      break;
    }
  }
  return css.slice(open, end);
}

/**
 * Lit un bloc CSS et renvoie les tokens `--color-*` qu'il déclare, en héritant
 * du bloc de base (`@theme`) pour ce qu'il ne redéfinit pas.
 */
function readBlock(selector: string, inherit: Record<string, string> = {}): Record<string, string> {
  const body = blockBody(selector);
  const out: Record<string, string> = { ...inherit };
  for (const m of body.matchAll(/--color-([a-z0-9-]+):\s*(oklch\([^)]*\))/g)) {
    out[m[1]] = m[2];
  }
  return out;
}

/** Lit un jeton `--color-*` dans le bloc clair / sombre / impression. */
function jeton(mode: 'clair' | 'sombre' | 'print', nom: string): string {
  const cle = nom.replace(/^--color-/, '');
  const bloc = mode === 'clair' ? LIGHT : mode === 'sombre' ? DARK : PRINT;
  const val = bloc[cle];
  if (!val) throw new Error(`Jeton introuvable : ${nom} (${mode})`);
  return val;
}

function parseOklch(value: string): [number, number, number] {
  const m = value.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (!m) throw new Error(`Valeur oklch illisible : ${value}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

const LIGHT = readBlock('@theme');
const DARK = readBlock('.dark {', LIGHT);
const MEDIA_DARK = readBlock(':root:not(.light-forced)', LIGHT);
const PRINT = readBlock('@media print');
const HC_LIGHT = readBlock('.high-contrast {', LIGHT);
// Cascade réelle en sombre + contraste élevé : `.dark`, puis `.high-contrast`
// (même spécificité, déclaré plus bas, donc il l'emporte), puis
// `.dark.high-contrast`. Modéliser `.dark` + `.dark.high-contrast` seuls, comme
// le faisait ce test, masquait les tokens que `.high-contrast` fonce et que
// `.dark.high-contrast` oublie de rééclaircir : brand-900 tombait à ~1:1.
const HC_DARK = readBlock(':root.dark.high-contrast', readBlock('.high-contrast {', DARK));

// Trois façons d'être en clair ou en sombre : le défaut clair, la classe
// `.dark` posée par la barre d'accessibilité, et la préférence du système
// (`@media`), qui est le cas par défaut d'un visiteur en sombre. Ce dernier
// n'était pas testé : les pastilles feasibility-* y retombaient sur les valeurs
// claires, sous 4.5:1, sans qu'aucun test ne le voie (audit du 23/09/2026).
const MODES: [string, Record<string, string>][] = [
  ['clair', LIGHT],
  ['sombre', DARK],
  ['sombre (système)', MEDIA_DARK],
];

/** Les trois fonds sur lesquels du texte est réellement posé dans le projet. */
const SURFACES = ['neutral-50', 'neutral-100', 'neutral-200'] as const;

// ------------------------------------------------------------------ tests ---

describe('palette : le bloc @media doit rester aligné sur .dark', () => {
  it('déclare exactement les mêmes tokens, avec les mêmes valeurs, que .dark', () => {
    // Deux blocs distincts (classe + préférence OS) : ils divergent en silence
    // si on n'en modifie qu'un. L'ancienne version ne comparait que les tokens
    // présents dans les deux, et laissait donc passer un token oublié.
    const own = (selector: string) => readBlock(selector);
    const dark = own('.dark {');
    const media = own(':root:not(.light-forced)');
    expect(Object.keys(media).sort()).toEqual(Object.keys(dark).sort());
    for (const token of Object.keys(dark)) {
      expect(media[token], `--color-${token} désaligné entre .dark et @media`).toBe(dark[token]);
    }
  });
});

describe('cascade : le contraste élevé l\'emporte sur le sombre système', () => {
  // `:root:not(.light-forced)` a une spécificité (0,2,0) : déclaré après les
  // blocs de contraste élevé, il écrasait leurs tokens dès que le système était
  // en sombre, et le mode « contraste élevé » ne faisait plus rien.
  const media = css.indexOf('@media (prefers-color-scheme: dark)');
  it('les blocs de contraste élevé sont déclarés après le @media sombre', () => {
    expect(media).toBeGreaterThan(-1);
    expect(css.indexOf('.high-contrast {')).toBeGreaterThan(media);
    expect(css.indexOf(':root.dark.high-contrast')).toBeGreaterThan(media);
  });
  it('le surlignage de recherche suit aussi le sombre système', () => {
    expect(css).toMatch(/:root:not\(\.light-forced\) mark/);
  });
});

describe.each(MODES)('mode %s — SC 1.4.3 : texte ≥ 4.5:1', (mode, palette) => {
  // Tokens effectivement utilisés comme couleur de texte dans src/.
  const TEXT_TOKENS = [
    'neutral-500',
    'neutral-600',
    'neutral-700',
    'neutral-800',
    'neutral-900',
    'brand-600',
    'brand-700',
    'brand-800',
    'brand-900',
    'status-blocked',
    'status-delayed',
    'status-ongoing',
    'status-resolved',
  ];

  it.each(TEXT_TOKENS)(`%s sur ${SURFACES.join(' / ')}`, (token) => {
    for (const surface of SURFACES) {
      const ratio = contrast(palette[token], palette[surface]);
      expect(
        ratio,
        `${mode} : text-${token} sur bg-${surface} = ${ratio.toFixed(2)}:1`
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe.each(MODES)('mode %s — SC 1.4.11 : éléments non textuels ≥ 3:1', (mode, palette) => {
  // neutral-500 sert à la fois de bordure de champ de saisie et de pastille
  // « statut inconnu » : c'est le plancher 3:1 des objets porteurs de sens.
  // (neutral-400 n'est plus utilisé que pour des états de survol, non soumis
  // au critère.)
  it('neutral-500 (bordures de contrôles, pastilles) reste lisible', () => {
    for (const surface of SURFACES) {
      const ratio = contrast(palette['neutral-500'], palette[surface]);
      expect(
        ratio,
        `${mode} : neutral-500 sur bg-${surface} = ${ratio.toFixed(2)}:1`
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it('les fonds feasibility-* se détachent du fond de page', () => {
    const tokens = Object.keys(palette).filter((k) => k.startsWith('feasibility-'));
    expect(tokens.length).toBeGreaterThan(0);
    for (const token of tokens) {
      const ratio = contrast(palette[token], palette['neutral-50']);
      expect(ratio, `${mode} : bg-${token} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
    }
  });
});

describe.each(MODES)('mode %s — pastilles pleines : texte neutral-50 sur fond coloré', (mode, palette) => {
  // Les badges de statut et de faisabilité posent `text-neutral-50` sur un fond
  // `bg-status-*` / `bg-feasibility-*` / `bg-brand-900`. Les deux couleurs
  // s'inversent en sombre : il faut que la paire tienne dans les deux sens.
  const BADGE_BACKGROUNDS = [
    'brand-900',
    'status-blocked',
    'status-delayed',
    'status-ongoing',
    'status-resolved',
    'feasibility-high',
    'feasibility-medium',
    // `feasibility-low` MANQUAIT a cette liste, et c'etait le seul des cinq a
    // echouer : 3,80:1 en mode clair, sous le seuil AA de 4,5:1, rendu sur
    // /fr/solutions. Le test passait donc au vert sur une non-conformite
    // visible en production. Une liste d'exclusions qu'on ecrit a la main finit
    // toujours par oublier exactement le cas qui compte (audit 21/09).
    'feasibility-low',
    'feasibility-very-low',
    'feasibility-near-zero',
  ];

  it.each(BADGE_BACKGROUNDS)('neutral-50 sur %s', (token) => {
    const ratio = contrast(palette['neutral-50'], palette[token]);
    expect(ratio, `${mode} : bg-${token} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
  });
});

// Familles sémantiques adaptatives : vigilance (warning), information (info),
// confirmé (confirmed). Elles remplacent les couleurs brutes de Tailwind
// (bg-amber-50, text-teal-700…), qui ne changent pas en sombre : une alerte en
// bg-amber-50 avec un texte en token tombait à 1,9:1 en sombre (23/09/2026).
const FAMILIES = ['warning', 'info', 'confirmed'] as const;
const HC_MODES: [string, Record<string, string>][] = [
  ['contraste élevé clair', HC_LIGHT],
  ['contraste élevé sombre', HC_DARK],
];

describe.each([...MODES.map(([m, p]) => [m, p, 4.5] as const), ...HC_MODES.map(([m, p]) => [m, p, 7] as const)])(
  'mode %s — familles sémantiques',
  (mode, palette, seuil) => {
    it.each(FAMILIES)('%s : texte et bordures lisibles', (f) => {
      const bg = palette[`${f}-bg`];
      expect(bg, `${mode} : --color-${f}-bg manquant`).toBeDefined();
      for (const [fg, surface, min] of [
        [`${f}-fg`, `${f}-bg`, seuil],
        [`${f}-fg`, 'neutral-50', seuil],
        ['neutral-500', `${f}-bg`, seuil],
        ['neutral-700', `${f}-bg`, seuil],
        [`${f}-border`, `${f}-bg`, 3],
        [`${f}-border`, 'neutral-50', 3],
      ] as const) {
        const ratio = contrast(palette[fg], palette[surface]);
        expect(ratio, `${mode} : ${fg} sur ${surface} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(min);
      }
    });
    it('warning-strong (alerte critique) se détache', () => {
      for (const surface of ['warning-bg', 'neutral-50']) {
        const ratio = contrast(palette['warning-strong'], palette[surface]);
        expect(ratio, `${mode} : warning-strong sur ${surface} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
      }
    });
  },
);

describe('mode contraste élevé — promesse AAA (7:1)', () => {
  it.each([
    ['clair', HC_LIGHT],
    ['sombre', HC_DARK],
  ] as [string, Record<string, string>][])('%s : le texte secondaire et la couleur de marque atteignent 7:1', (_mode, palette) => {
    for (const token of ['neutral-500', 'neutral-600', 'neutral-700', 'neutral-900', 'brand-800', 'brand-900']) {
      const ratio = contrast(palette[token], palette['neutral-50']);
      expect(ratio, `${token} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(7);
    }
  });
});

describe('rampe de choroplèthe', () => {
  for (const mode of ['clair', 'sombre'] as const) {
    it(`${mode} : cinq paliers, écart de luminance ≥ 1,4:1 entre voisins`, () => {
      const vals = [1, 2, 3, 4, 5].map((i) => jeton(mode, `--color-choro-${i}`));
      for (let i = 0; i < 4; i++) expect(contrast(vals[i], vals[i + 1])).toBeGreaterThanOrEqual(1.4);
    });
  }
  it('le contour ambre sur halo neutre atteint 3:1', () => {
    expect(contrast(jeton('clair', '--color-status-delayed'), jeton('clair', '--color-neutral-50'))).toBeGreaterThanOrEqual(3);
  });
  it('impression : paliers en valeurs claires', () => {
    expect(jeton('print', '--color-choro-1')).toBe(jeton('clair', '--color-choro-1'));
  });
  it('impression : les paliers portent !important (sinon le sombre système gagne, spécificité 0,2,0)', () => {
    const printBody = blockBody('@media print');
    for (let i = 1; i <= 5; i++) {
      const re = new RegExp(`--color-choro-${i}:\\s*oklch\\([^)]*\\)\\s*!important`);
      expect(printBody, `--color-choro-${i} sans !important dans @media print`).toMatch(re);
    }
  });
});
