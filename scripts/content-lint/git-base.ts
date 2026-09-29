/**
 * Lecture d'un fichier tel qu'il est sur la branche de base (git show).
 * Partagé par les gardes des données (data-temporal.ts, radar-summary.ts).
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';

export const REPO_ROOT = path.resolve(__dirname, '..', '..');

/** Contenu du fichier à la base, ou null s'il n'y existe pas. */
export function readAtBase(base: string, file: string): string | null {
  try {
    return execFileSync('git', ['show', `${base}:${file}`], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    return null;
  }
}

/**
 * La référence existe-t-elle ? Une base introuvable ne doit pas faire passer
 * tout le fichier pour « nouveau » en silence, ni l'inverse.
 */
export function baseExists(base: string): boolean {
  try {
    execFileSync('git', ['rev-parse', '--verify', '-q', `${base}^{commit}`], { cwd: REPO_ROOT, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
