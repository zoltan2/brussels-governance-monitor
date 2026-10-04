import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { matter } from '../frontmatter';
import type { Magazine, ValidationError } from './types';
import { isV2 } from './validate';

// Décision du 27/09/2026 : les sources du magazine sont reprises des fiches, pas
// recopiées à la main. Chaque URL citée sous un sujet doit figurer dans la liste
// `sources` du frontmatter de la fiche française que le sujet désigne par `path`.

const SEGMENT_TO_DIR: Record<string, string> = {
  domaines: 'domain-cards',
  dossiers: 'dossiers',
  communes: 'commune-cards',
  secteurs: 'sector-cards',
  solutions: 'solution-cards',
  comparaisons: 'comparison-cards',
};

/** `/fr/domaines/budget` → `content/domain-cards/budget.fr.mdx` ; null si le chemin ne désigne pas une fiche. */
export function cardFileForPath(path: string | undefined): string | null {
  if (!path) return null;
  const cleaned = path.replace(/^https?:\/\/[^/]+/, '').split(/[?#]/)[0] ?? '';
  const m = cleaned.match(/^\/fr\/([^/]+)\/([^/]+)\/?$/);
  if (!m) return null;
  const dir = SEGMENT_TO_DIR[m[1]!];
  if (!dir) return null;
  return `content/${dir}/${m[2]}.fr.mdx`;
}

function cardSourceUrls(absolutePath: string): Set<string> {
  const { data } = matter(readFileSync(absolutePath, 'utf-8'));
  const sources = (data as { sources?: { url?: string }[] }).sources ?? [];
  return new Set(sources.map((s) => s.url).filter((u): u is string => typeof u === 'string'));
}

export function checkSourcesAgainstCards(mag: Magazine, root: string): ValidationError[] {
  if (!isV2(mag)) return [];
  const errors: ValidationError[] = [];
  const cache = new Map<string, Set<string> | null>();

  mag.items.forEach((item, i) => {
    const file = cardFileForPath(item.path);
    if (!file) return;
    if (!cache.has(file)) {
      const abs = join(root, file);
      cache.set(file, existsSync(abs) ? cardSourceUrls(abs) : null);
    }
    const urls = cache.get(file);
    if (urls === null) {
      errors.push({ itemIndex: i, field: 'path', reason: `fiche introuvable : ${file}` });
      return;
    }
    for (const src of item.sources ?? []) {
      if (!urls!.has(src.url)) {
        errors.push({
          itemIndex: i,
          field: 'sources',
          reason: `l'URL ${src.url} n'est pas dans les sources de ${file} : l'ajouter à la fiche d'abord`,
        });
      }
    }
  });

  return errors;
}
