import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { matter } from '../frontmatter';
import type { Magazine, ValidationError } from './types';
import { isV2 } from './validate';
import { CARD_DIRS, cardRefForPath } from './locales';

// Décision du 27/09/2026 : les sources du magazine sont reprises des fiches, pas
// recopiées à la main. Chaque URL citée sous un sujet doit figurer dans la liste
// `sources` du frontmatter de la fiche que le sujet désigne par `path`, dans la langue de l'édition.

/** `/fr/domaines/budget` → `content/domain-cards/budget.fr.mdx`, `/nl/domeinen/budget` → `…budget.nl.mdx` ; null si le chemin ne désigne pas une fiche. */
export function cardFileForPath(path: string | undefined): string | null {
  const ref = cardRefForPath(path);
  if (!ref) return null;
  return `content/${CARD_DIRS[ref.kind]}/${ref.slug}.${ref.locale}.mdx`;
}

// Toutes les URL que la fiche cite : sa liste `sources` quand elle en a une
// (domaines, dossiers, communes) et les liens de son texte (les fiches secteur
// n'ont pas de liste et citent leurs références en fin de section).
function cardSourceUrls(absolutePath: string): Set<string> {
  const raw = readFileSync(absolutePath, 'utf-8');
  const urls = new Set<string>();
  const { data } = matter(raw);
  for (const s of (data as { sources?: { url?: string }[] }).sources ?? []) {
    if (typeof s.url === 'string') urls.add(s.url);
  }
  for (const m of raw.matchAll(/https?:\/\/[^\s)"'<>\]]+/g)) urls.add(m[0]);
  return urls;
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
