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

  it('throws when validation fails', () => {
    const bad = FIXTURE_WITH_MAGAZINE.replace(`headline: "Head one."`, `headline: "   "`);
    writeFileSync(join(tmpRoot, 'content/digest/2099-w99.fr.mdx'), bad);
    expect(() => buildMagazine({ root: tmpRoot })).toThrow(/headline is empty/);
  });
});
