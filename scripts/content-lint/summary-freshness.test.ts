// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Vérifie, sur le vrai script (pas seulement sur checkSummaryFreshness en
 * isolation), que la dispense de brouillon fonctionne de bout en bout :
 * lecture du champ `draft`, ligne explicite en cas de dispense, échec normal
 * dès que la fiche est publiée. SCOPED_DIRS de summary-freshness.ts est un
 * chemin fixe résolu depuis le script : la fiche temporaire vit donc dans
 * content/domain-cards/, comme pour faq-check.test.ts, et est retirée après
 * chaque test.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPO = path.resolve(__dirname, '..', '..');
const SCRIPT = path.join(REPO, 'scripts/content-lint/summary-freshness.ts');
const FIXTURE_REL = 'content/domain-cards/__citest-summary-draft-fixture.fr.mdx';
const FIXTURE_ABS = path.join(REPO, FIXTURE_REL);

function fixture(fields: Record<string, string>): string {
  const lines = Object.entries(fields).map(([k, v]) => `${k}: ${v}`);
  return `---\n${lines.join('\n')}\n---\n\nCorps.\n`;
}

function writeFixture(fields: Record<string, string>): void {
  fs.writeFileSync(FIXTURE_ABS, fixture(fields), 'utf8');
}

function runSummaryFreshness(files: string[]): { status: number; stdout: string; stderr: string } {
  const listFile = path.join(
    os.tmpdir(),
    `summary-freshness-list-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`,
  );
  fs.writeFileSync(listFile, `${files.join('\n')}\n`, 'utf8');
  try {
    const r = spawnSync('npx', ['tsx', SCRIPT, listFile], { cwd: REPO, encoding: 'utf8' });
    return { status: r.status ?? 1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
  } finally {
    fs.rmSync(listFile, { force: true });
  }
}

const BASE_FIELDS = {
  title: '"Fixture CI summary-freshness"',
  slug: '__citest-summary-draft-fixture',
  locale: 'fr',
  lastModified: '"2026-09-24"',
};

describe('summary-freshness.ts — dispense de brouillon (relecture exigée à la publication)', () => {
  afterEach(() => {
    fs.rmSync(FIXTURE_ABS, { force: true });
  });

  it('un brouillon sans summaryReviewed passe, avec une ligne explicite (jamais un OK muet)', () => {
    writeFixture({ ...BASE_FIELDS, draft: 'true' });
    const r = runSummaryFreshness([FIXTURE_REL]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain(FIXTURE_REL);
    expect(r.stdout).toContain('brouillon : attestations exigées à la publication');
  });

  it('une fiche publiée (draft absent) sans summaryReviewed échoue, comme avant', () => {
    writeFixture(BASE_FIELDS);
    const r = runSummaryFreshness([FIXTURE_REL]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain(FIXTURE_REL);
  });

  it('transition brouillon → publié sans summaryReviewed échoue : la dispense ne survit pas à la publication', () => {
    writeFixture({ ...BASE_FIELDS, draft: 'false' });
    const r = runSummaryFreshness([FIXTURE_REL]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain(FIXTURE_REL);
  });

  it('preuve par mutation : mêmes champs, seul `draft` diffère, verdicts opposés', () => {
    writeFixture({ ...BASE_FIELDS, draft: 'true' });
    const draftRun = runSummaryFreshness([FIXTURE_REL]);
    writeFixture({ ...BASE_FIELDS, draft: 'false' });
    const publishedRun = runSummaryFreshness([FIXTURE_REL]);
    expect(draftRun.status).toBe(0);
    expect(publishedRun.status).toBe(1);
  });
});
