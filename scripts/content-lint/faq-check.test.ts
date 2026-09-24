// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Vérifie, sur le vrai script (pas seulement sur checkFaqReview en isolation),
 * que la dispense de brouillon fonctionne de bout en bout : lecture du champ
 * `draft`, ligne explicite en cas de dispense, et échec normal dès que la
 * fiche est publiée. Le fichier de test crée une fiche temporaire dans
 * content/domain-cards/ (SCOPED_DIRS de faq-check.ts est un chemin fixe
 * résolu depuis le script, pas injectable) et la retire après chaque test.
 * Sans FAQ, elle n'entre jamais dans le registre d'unicité (voir
 * extractFaqQuestions : un tableau `faq` vide n'est pas retenu).
 */

import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPO = path.resolve(__dirname, '..', '..');
const SCRIPT = path.join(REPO, 'scripts/content-lint/faq-check.ts');
const FIXTURE_REL = 'content/domain-cards/__citest-faq-draft-fixture.fr.mdx';
const FIXTURE_ABS = path.join(REPO, FIXTURE_REL);

function fixture(fields: Record<string, string>): string {
  const lines = Object.entries(fields).map(([k, v]) => `${k}: ${v}`);
  return `---\n${lines.join('\n')}\n---\n\nCorps.\n`;
}

function writeFixture(fields: Record<string, string>): void {
  fs.writeFileSync(FIXTURE_ABS, fixture(fields), 'utf8');
}

function runFaqCheck(files: string[]): { status: number; stdout: string; stderr: string } {
  const listFile = path.join(os.tmpdir(), `faq-check-list-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`);
  fs.writeFileSync(listFile, `${files.join('\n')}\n`, 'utf8');
  try {
    const r = spawnSync('npx', ['tsx', SCRIPT, listFile], { cwd: REPO, encoding: 'utf8' });
    return { status: r.status ?? 1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
  } finally {
    fs.rmSync(listFile, { force: true });
  }
}

const BASE_FIELDS = {
  title: '"Fixture CI faq-check"',
  slug: '__citest-faq-draft-fixture',
  locale: 'fr',
  lastModified: '"2026-09-24"',
};

describe('faq-check.ts — dispense de brouillon (relecture exigée à la publication)', () => {
  afterEach(() => {
    fs.rmSync(FIXTURE_ABS, { force: true });
  });

  it('un brouillon sans faqReviewed passe, avec une ligne explicite (jamais un OK muet)', () => {
    writeFixture({ ...BASE_FIELDS, draft: 'true' });
    const r = runFaqCheck([FIXTURE_REL]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain(FIXTURE_REL);
    expect(r.stdout).toContain('brouillon : attestations exigées à la publication');
  });

  it('une fiche publiée (draft absent) sans faqReviewed échoue, comme avant', () => {
    writeFixture(BASE_FIELDS);
    const r = runFaqCheck([FIXTURE_REL]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain(FIXTURE_REL);
  });

  it('transition brouillon → publié sans faqReviewed échoue : la dispense ne survit pas à la publication', () => {
    // Ce que voit la CI au moment de publier : `draft` passe à false, aucune
    // date n'a été posée. Le fichier est déjà dans la liste (un diff Git le
    // voit dès que le frontmatter change, voir le describe suivant), et
    // faq-check.ts doit refuser exactement comme une fiche jamais brouillon.
    writeFixture({ ...BASE_FIELDS, draft: 'false' });
    const r = runFaqCheck([FIXTURE_REL]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain(FIXTURE_REL);
  });

  it('preuve par mutation : mêmes champs, seul `draft` diffère, verdicts opposés', () => {
    writeFixture({ ...BASE_FIELDS, draft: 'true' });
    const draftRun = runFaqCheck([FIXTURE_REL]);
    writeFixture({ ...BASE_FIELDS, draft: 'false' });
    const publishedRun = runFaqCheck([FIXTURE_REL]);
    expect(draftRun.status).toBe(0);
    expect(publishedRun.status).toBe(1);
  });
});

describe('sélection des fichiers modifiés (git diff) — transition de publication', () => {
  it('un git diff --name-only voit un fichier dont seul `draft` a changé', () => {
    // run.sh, content-lint.yml et preflight.sh alimentent tous faq-check.ts et
    // summary-freshness.ts avec `git diff --name-only BASE...HEAD -- 'content/'`.
    // Une transition brouillon → publié ne touche que le frontmatter : ce test
    // vérifie que le diff la voit quand même, sans dépendre du texte du corps.
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bgm-draft-diff-'));
    try {
      const git = (...args: string[]) => execFileSync('git', args, { cwd: tmp, encoding: 'utf8' });
      git('init', '-q');
      git('config', 'user.email', 'test@example.com');
      git('config', 'user.name', 'Test');
      fs.mkdirSync(path.join(tmp, 'content/dossiers'), { recursive: true });
      const rel = 'content/dossiers/exemple.fr.mdx';
      const abs = path.join(tmp, rel);

      fs.writeFileSync(abs, fixture({ slug: 'exemple', locale: 'fr', lastModified: '"2026-09-24"', draft: 'true' }));
      git('add', '-A');
      git('commit', '-q', '-m', 'base (brouillon)');
      git('branch', 'base');

      fs.writeFileSync(abs, fixture({ slug: 'exemple', locale: 'fr', lastModified: '"2026-09-24"', draft: 'false' }));
      git('add', '-A');
      git('commit', '-q', '-m', 'publication');

      const diff = git('diff', '--name-only', 'base...HEAD', '--', 'content/');
      expect(diff.trim().split('\n')).toContain(rel);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
