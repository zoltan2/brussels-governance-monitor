import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildMagazine } from '../build';

let tmpRoot: string;

const FIXTURE_WITH_MAGAZINE = `---
week: "2099-w99"
lang: "fr"
title: "Test"
auto_translated: false
redirect_lang: "fr"
generated_at: "2099-12-31"

magazine:
  tagline: "Tagline."
  closing_line: "Close."
  items:
    - category: "Cat"
      headline: "Head one."
      stat: "100"
      stat_label: "Lbl"
      description: "${'d'.repeat(120)}"
      howto: "${'h'.repeat(100)}"
    - category: "Cat"
      headline: "Head two."
      stat: "200"
      stat_label: "Lbl"
      description: "${'d'.repeat(120)}"
      howto: "${'h'.repeat(100)}"
    - category: "Cat"
      headline: "Head three."
      stat: "300"
      stat_label: "Lbl"
      description: "${'d'.repeat(120)}"
      howto: "${'h'.repeat(100)}"
---

## x
body
`;

const FIXTURE_WITHOUT_MAGAZINE = `---
week: "2099-w98"
lang: "fr"
title: "No magazine"
auto_translated: false
redirect_lang: "fr"
generated_at: "2099-12-30"
---

## x
body
`;

beforeEach(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), 'mag-build-'));
  mkdirSync(join(tmpRoot, 'content/digest'), { recursive: true });
});

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

describe('buildMagazine', () => {
  it('writes latest and sNN HTML when a valid magazine block exists', () => {
    writeFileSync(join(tmpRoot, 'content/digest/2099-w99.fr.mdx'), FIXTURE_WITH_MAGAZINE);
    const result = buildMagazine({ root: tmpRoot });
    expect(result.status).toBe('built');
    expect(existsSync(join(tmpRoot, 'docs/magazine/latest/index.html'))).toBe(true);
    expect(existsSync(join(tmpRoot, 'docs/magazine/s99/index.html'))).toBe(true);
    expect(existsSync(join(tmpRoot, 'docs/magazine/index.html'))).toBe(true);
    const index = readFileSync(join(tmpRoot, 'docs/magazine/index.html'), 'utf-8');
    expect(index).toContain('s99');
  });

  it('skips and returns status=skipped when no magazine block', () => {
    writeFileSync(join(tmpRoot, 'content/digest/2099-w98.fr.mdx'), FIXTURE_WITHOUT_MAGAZINE);
    const result = buildMagazine({ root: tmpRoot });
    expect(result.status).toBe('skipped');
    expect(existsSync(join(tmpRoot, 'docs/magazine'))).toBe(false);
  });

  it('lists every digest with a magazine block in the archive index, even when docs/magazine is empty', () => {
    // Simulates fresh CI checkout: docs/magazine/ does not exist yet, only
    // content/digest/ carries the source of truth.
    const olderWeek = FIXTURE_WITH_MAGAZINE.replace('2099-w99', '2099-w98').replace(
      'Head one.',
      'Older head.',
    );
    writeFileSync(join(tmpRoot, 'content/digest/2099-w98.fr.mdx'), olderWeek);
    writeFileSync(join(tmpRoot, 'content/digest/2099-w99.fr.mdx'), FIXTURE_WITH_MAGAZINE);
    buildMagazine({ root: tmpRoot });
    const index = readFileSync(join(tmpRoot, 'docs/magazine/index.html'), 'utf-8');
    expect(index).toContain('./s99/');
    expect(index).toContain('./s98/');
    expect(index.indexOf('./s99/')).toBeLessThan(index.indexOf('./s98/'));
  });

  it('throws when validation fails', () => {
    const bad = FIXTURE_WITH_MAGAZINE.replace(`headline: "Head one."`, `headline: "   "`);
    writeFileSync(join(tmpRoot, 'content/digest/2099-w99.fr.mdx'), bad);
    expect(() => buildMagazine({ root: tmpRoot })).toThrow(/headline is empty/);
  });

  // ---- Éditions traduites (spec magazine trilingue, 15/11/2026) ----

  const v2 = (lang: string, segment: string, stats: [string, string, string]) => `---
week: "2099-w99"
lang: "${lang}"
title: "Digest — Week 99 (1 - 7 x 2099)"
auto_translated: ${lang !== 'fr'}
redirect_lang: "${lang}"
generated_at: "2099-12-31"
magazine:
  version: 2
  period: "1 au 7 x 2099"
  consulted: "2099-12-31"
  tagline: "Tagline ${lang}."
  closing_line: "Close."
  items:
${[0, 1, 2]
  .map(
    (i) => `    - category: "Cat"
      short: "S${i}"
      headline: "Head ${lang} ${i}."
      path: "/${lang}/${segment}/budget"
      stat: "${stats[i]}"
      stat_label: "Lbl"
      description: "${'d'.repeat(120)}"
      nuance_title: "N"
      howto: "${'h'.repeat(100)}"
      confidence: "official"`,
  )
  .join('\n')}
---

## x
body
`;

  function ecrireFiche(lang: string): void {
    mkdirSync(join(tmpRoot, 'content/domain-cards'), { recursive: true });
    writeFileSync(join(tmpRoot, `content/domain-cards/budget.${lang}.mdx`), '---\ntitle: "B"\n---\n');
  }

  it('trois éditions : le français à la racine, nl et en sous leur langue, liées entre elles', () => {
    for (const l of ['fr', 'nl', 'en']) ecrireFiche(l);
    writeFileSync(join(tmpRoot, 'content/digest/2099-w99.fr.mdx'), v2('fr', 'domaines', ['48,7 %', '2 500', '7']));
    writeFileSync(join(tmpRoot, 'content/digest/2099-w99.nl.mdx'), v2('nl', 'domeinen', ['48,7 %', '2.500', '7']));
    writeFileSync(join(tmpRoot, 'content/digest/2099-w99.en.mdx'), v2('en', 'domains', ['48.7%', '2,500', '7']));
    expect(buildMagazine({ root: tmpRoot }).status).toBe('built');
    const lire = (p: string) => readFileSync(join(tmpRoot, 'docs/magazine', p), 'utf-8');
    expect(lire('s99/index.html')).toContain('<html lang="fr">');
    expect(lire('nl/s99/index.html')).toContain('<html lang="nl">');
    expect(lire('nl/latest/index.html')).toBe(lire('nl/s99/index.html'));
    expect(lire('en/s99/index.html')).toContain('Head en 0.');
    expect(lire('s99/index.html')).toContain('hreflang="nl" href="https://magazine.governance.brussels/nl/s99/"');
    // Page d'accueil par langue, avec ses seuls numéros.
    expect(lire('nl/index.html')).toContain('<html lang="nl">');
    expect(lire('nl/index.html')).toContain('./s99/');
    expect(lire('en/index.html')).toContain('Latest issue');
    expect(lire('index.html')).toContain('<html lang="fr">');
  });

  it('édition absente ou sans bloc : sautée, le français sort seul et sans lien entre éditions', () => {
    ecrireFiche('fr');
    writeFileSync(join(tmpRoot, 'content/digest/2099-w99.fr.mdx'), v2('fr', 'domaines', ['48,7 %', '2 500', '7']));
    writeFileSync(join(tmpRoot, 'content/digest/2099-w99.nl.mdx'), FIXTURE_WITHOUT_MAGAZINE.replace('"fr"', '"nl"'));
    expect(buildMagazine({ root: tmpRoot }).status).toBe('built');
    expect(existsSync(join(tmpRoot, 'docs/magazine/nl'))).toBe(false);
    expect(existsSync(join(tmpRoot, 'docs/magazine/en'))).toBe(false);
    expect(readFileSync(join(tmpRoot, 'docs/magazine/s99/index.html'), 'utf-8')).not.toContain('hreflang');
  });

  it('édition qui s’écarte du français : le build échoue et rien n’est écrit', () => {
    for (const l of ['fr', 'nl']) ecrireFiche(l);
    writeFileSync(join(tmpRoot, 'content/digest/2099-w99.fr.mdx'), v2('fr', 'domaines', ['48,7 %', '2 500', '7']));
    writeFileSync(join(tmpRoot, 'content/digest/2099-w99.nl.mdx'), v2('nl', 'domeinen', ['47,8 %', '2.500', '7']));
    expect(() => buildMagazine({ root: tmpRoot })).toThrow(/édition nl : chiffre « 47,8 % », le français dit « 48,7 % »/);
    expect(existsSync(join(tmpRoot, 'docs/magazine'))).toBe(false);
  });

  it('édition dont la fiche n’existe pas dans sa langue : le build échoue', () => {
    ecrireFiche('fr');
    writeFileSync(join(tmpRoot, 'content/digest/2099-w99.fr.mdx'), v2('fr', 'domaines', ['48,7 %', '2 500', '7']));
    writeFileSync(join(tmpRoot, 'content/digest/2099-w99.nl.mdx'), v2('nl', 'domeinen', ['48,7 %', '2.500', '7']));
    expect(() => buildMagazine({ root: tmpRoot })).toThrow(/fiche introuvable : content\/domain-cards\/budget\.nl\.mdx/);
  });
});
