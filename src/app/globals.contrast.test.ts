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

/**
 * Lit un bloc CSS et renvoie les tokens `--color-*` qu'il déclare, en héritant
 * du bloc de base (`@theme`) pour ce qu'il ne redéfinit pas.
 */
function readBlock(selector: string, inherit: Record<string, string> = {}): Record<string, string> {
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
  const body = css.slice(open, end);
  const out: Record<string, string> = { ...inherit };
  for (const m of body.matchAll(/--color-([a-z0-9-]+):\s*(oklch\([^)]*\))/g)) {
    out[m[1]] = m[2];
  }
  return out;
}

function parseOklch(value: string): [number, number, number] {
  const m = value.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (!m) throw new Error(`Valeur oklch illisible : ${value}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

const LIGHT = readBlock('@theme');
const DARK = readBlock('.dark {', LIGHT);
const MEDIA_DARK = readBlock(':root:not(.light-forced)', LIGHT);
const HC_LIGHT = readBlock('.high-contrast {', LIGHT);
const HC_DARK = readBlock('.dark.high-contrast', DARK);

const MODES: [string, Record<string, string>][] = [
  ['clair', LIGHT],
  ['sombre', DARK],
];

/** Les trois fonds sur lesquels du texte est réellement posé dans le projet. */
const SURFACES = ['neutral-50', 'neutral-100', 'neutral-200'] as const;

// ------------------------------------------------------------------ tests ---

describe('palette : le bloc @media doit rester aligné sur .dark', () => {
  it('déclare les mêmes valeurs que .dark pour tous les tokens communs', () => {
    // Deux blocs distincts (classe + préférence OS) : ils divergent en silence
    // si on n'en modifie qu'un. Les status/feasibility ne sont pas tous repris
    // dans le @media, on ne compare donc que l'intersection déclarée.
    const declaredInMedia = Object.keys(MEDIA_DARK).filter((k) =>
      css.slice(css.indexOf(':root:not(.light-forced)')).includes(`--color-${k}:`)
    );
    for (const token of declaredInMedia) {
      expect(MEDIA_DARK[token], `--color-${token} désaligné entre .dark et @media`).toBe(
        DARK[token]
      );
    }
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
    'feasibility-very-low',
    'feasibility-near-zero',
  ];

  it.each(BADGE_BACKGROUNDS)('neutral-50 sur %s', (token) => {
    const ratio = contrast(palette['neutral-50'], palette[token]);
    expect(ratio, `${mode} : bg-${token} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
  });
});

describe('mode contraste élevé — promesse AAA (7:1)', () => {
  it.each([
    ['clair', HC_LIGHT],
    ['sombre', HC_DARK],
  ] as [string, Record<string, string>][])('%s : le texte secondaire atteint 7:1', (_mode, palette) => {
    for (const token of ['neutral-500', 'neutral-600', 'neutral-700', 'neutral-900']) {
      const ratio = contrast(palette[token], palette['neutral-50']);
      expect(ratio, `${token} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(7);
    }
  });
});
