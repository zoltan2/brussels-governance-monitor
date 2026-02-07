import { describe, it, expect } from 'vitest';
import { readdirSync } from 'fs';
import { join } from 'path';

const CONTENT_DIR = join(process.cwd(), 'content');
const MESSAGES_DIR = join(process.cwd(), 'messages');
const REQUIRED_LOCALES = ['fr', 'nl'] as const;
const ALL_LOCALES = ['fr', 'nl', 'en', 'de'] as const;

function getContentFiles(collection: string): string[] {
  try {
    return readdirSync(join(CONTENT_DIR, collection)).filter((f) => f.endsWith('.mdx'));
  } catch {
    return [];
  }
}

function getSlugsForLocale(files: string[], locale: string): string[] {
  return files
    .filter((f) => f.endsWith(`.${locale}.mdx`))
    .map((f) => f.replace(`.${locale}.mdx`, ''));
}

describe('content integrity', () => {
  const collections = [
    'domain-cards',
    'solution-cards',
    'sector-cards',
    'formation-rounds',
    'formation-events',
    'glossary',
  ];

  for (const collection of collections) {
    describe(collection, () => {
      const files = getContentFiles(collection);
      if (files.length === 0) return;

      const frSlugs = getSlugsForLocale(files, 'fr');

      it('has FR source files', () => {
        expect(frSlugs.length).toBeGreaterThan(0);
      });

      it('every FR file has a NL counterpart', () => {
        const nlSlugs = getSlugsForLocale(files, 'nl');
        const missing = frSlugs.filter((slug) => !nlSlugs.includes(slug));
        expect(missing).toEqual([]);
      });

      it('has no orphan locale files (no slug without FR source)', () => {
        for (const locale of ALL_LOCALES) {
          if (locale === 'fr') continue;
          const localeSlugs = getSlugsForLocale(files, locale);
          const orphans = localeSlugs.filter((slug) => !frSlugs.includes(slug));
          expect(orphans, `orphan ${locale} files without FR source`).toEqual([]);
        }
      });
    });
  }
});

describe('message file integrity', () => {
  function getKeys(obj: Record<string, unknown>, prefix = ''): string[] {
    const keys: string[] = [];
    for (const key of Object.keys(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        keys.push(...getKeys(obj[key] as Record<string, unknown>, fullKey));
      } else {
        keys.push(fullKey);
      }
    }
    return keys.sort();
  }

  it('all locale message files have the same key structure', () => {
    const messageFiles: Record<string, string[]> = {};
    for (const locale of ALL_LOCALES) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const data = require(join(MESSAGES_DIR, `${locale}.json`));
      messageFiles[locale] = getKeys(data);
    }

    const frKeys = messageFiles.fr;
    for (const locale of REQUIRED_LOCALES) {
      if (locale === 'fr') continue;
      const missing = frKeys.filter((k) => !messageFiles[locale].includes(k));
      expect(missing, `keys missing in ${locale}.json`).toEqual([]);
    }
  });
});
