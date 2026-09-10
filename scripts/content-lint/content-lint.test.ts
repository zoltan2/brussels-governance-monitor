import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const DIR = join(process.cwd(), 'scripts/content-lint');
const FIX = join(DIR, '__fixtures__');

// Exécute une fonction de lib.sh sur une liste de fichiers (stdin), renvoie le code de sortie.
function runCheck(fn: string, files: string[], env: Record<string, string> = {}): number {
  try {
    execFileSync(
      'bash',
      ['-c', `. "${DIR}/lib.sh"; printf '%s\\n' "$@" | ${fn}`, '_', ...files],
      { stdio: 'pipe', env: { ...process.env, ...env } },
    );
    return 0;
  } catch (e: unknown) {
    const err = e as { status?: number };
    return typeof err.status === 'number' ? err.status : 1;
  }
}

describe('content-lint shared module', () => {
  it('check_temporal échoue sur une phrase temporelle', () => {
    expect(runCheck('check_temporal', [join(FIX, 'temporal-bad.fr.mdx')])).toBe(1);
  });
  it('check_temporal passe sur une date absolue', () => {
    expect(runCheck('check_temporal', [join(FIX, 'temporal-good.fr.mdx')])).toBe(0);
  });
  it('check_empty_sources échoue sur sources: []', () => {
    expect(
      runCheck('check_empty_sources', [join(FIX, 'sources-empty.fr.mdx')], {
        CONTENT_LINT_SCOPED_DIRS: FIX,
      }),
    ).toBe(1);
  });
  it('check_empty_sources passe sur sources renseignées', () => {
    expect(
      runCheck('check_empty_sources', [join(FIX, 'sources-ok.fr.mdx')], {
        CONTENT_LINT_SCOPED_DIRS: FIX,
      }),
    ).toBe(0);
  });
});
