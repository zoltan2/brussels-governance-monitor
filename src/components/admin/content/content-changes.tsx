// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { PrFile } from '@/lib/github-pr';

function isFrenchContent(path: string): boolean {
  return path.startsWith('content/') && path.endsWith('.fr.mdx');
}

function isTranslation(path: string): boolean {
  return (
    path.startsWith('content/') &&
    /\.(nl|en|de)\.mdx$/.test(path)
  );
}

export function ContentChanges({
  files,
  truncated,
}: {
  files: PrFile[];
  truncated: boolean;
}) {
  const french = files.filter((f) => isFrenchContent(f.path));
  const translations = files.filter((f) => isTranslation(f.path));

  return (
    <section aria-labelledby="changements-titre" className="rounded-lg border border-neutral-200 bg-neutral-50 p-5">
      <h2 id="changements-titre" className="font-semibold text-neutral-900">
        Ce qui change ({french.length} fiches)
      </h2>

      {truncated && (
        <p className="mt-2 rounded border border-amber-500 bg-amber-50/60 p-3 text-sm text-neutral-900">
          Liste incomplète : GitHub a renvoyé plus de fichiers que la limite
          autorisée. La publication depuis cet écran est désactivée, passer par
          GitHub.
        </p>
      )}

      <ul className="mt-3 space-y-2">
        {french.map((f) => (
          <li key={f.path} className="text-sm">
            <span className="font-medium text-neutral-900">
              {f.path.replace(/^content\//, '').replace(/\.fr\.mdx$/, '')}
            </span>
            <span className="ml-2 text-neutral-600">
              +{f.additions} −{f.deletions}
            </span>
          </li>
        ))}
      </ul>

      {translations.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-neutral-600">
            {translations.length} fichiers de traduction, dérivés du français
          </summary>
          <ul className="mt-2 space-y-1">
            {translations.map((f) => (
              <li key={f.path} className="text-xs text-neutral-600">
                {f.path.replace(/^content\//, '')}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
