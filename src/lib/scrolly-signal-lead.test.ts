// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SCROLLY_ENABLED_DOSSIERS } from './scrolly-allowlist';

// En mode signal, la vue scrolly masque <Essentiel> et <Complet> : une section
// sans <SignalLead> n'y montre que son titre (ZRU publié ainsi le 24/09/2026).
const LOCALES = ['fr', 'nl', 'en', 'de'] as const;

function sectionsSansSignal(mdx: string): string[] {
  return mdx
    .split(/^## /m)
    .slice(1)
    .filter((section) => section.includes('<Essentiel>') && !section.includes('<SignalLead>'))
    .map((section) => section.split('\n')[0]);
}

describe('dossiers scrolly : une phrase signal par section', () => {
  for (const slug of SCROLLY_ENABLED_DOSSIERS) {
    for (const locale of LOCALES) {
      it(`${slug}.${locale}`, () => {
        const mdx = readFileSync(join(process.cwd(), 'content/dossiers', `${slug}.${locale}.mdx`), 'utf8');
        expect(mdx).toContain('<SignalLead>');
        expect(sectionsSansSignal(mdx)).toEqual([]);
      });
    }
  }
});
