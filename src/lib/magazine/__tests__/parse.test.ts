import { describe, it, expect } from 'vitest';
import { parseDigestMagazine } from '../parse';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const fixturePath = resolve(
  __dirname,
  '../../../../content/digest/__fixtures__/minimal.fr.mdx',
);

describe('parseDigestMagazine', () => {
  it('extracts frontmatter week, lang and magazine block', () => {
    const raw = readFileSync(fixturePath, 'utf-8');
    const result = parseDigestMagazine(raw);

    expect(result.week).toBe('2099-w99');
    expect(result.weekShort).toBe('s99');
    expect(result.lang).toBe('fr');
    expect(result.magazine).toBeDefined();
    expect(result.magazine?.items.length).toBe(3);
    expect(result.magazine?.items[0].headline).toBe('Test Headline.');
  });

  it('returns magazine=undefined when frontmatter has no magazine block', () => {
    const raw = `---
week: "2099-w98"
lang: "fr"
title: "No magazine"
auto_translated: false
redirect_lang: "fr"
generated_at: "2099-12-31"
---

## Just a section
`;
    const result = parseDigestMagazine(raw);
    expect(result.magazine).toBeUndefined();
  });
});
