// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { PrFile } from '@/lib/github-pr';

function brusselsTime(iso: string): string {
  return new Intl.DateTimeFormat('fr-BE', {
    timeZone: 'Europe/Brussels',
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'long',
  }).format(new Date(iso));
}

export function Published({
  mergedAt,
  files,
}: {
  mergedAt: string;
  files: PrFile[];
}) {
  const cards = files.filter(
    (f) => f.path.startsWith('content/') && f.path.endsWith('.fr.mdx'),
  ).length;

  // On calcule la présence de signaux radar plutôt que de demander à
  // quelqu'un de fatigué de s'en souvenir.
  const hasRadar = files.some((f) => f.path === 'data/radar.json');

  return (
    <section
      aria-labelledby="publie-titre"
      className="rounded-lg border border-brand-700/30 bg-brand-900/5 p-6"
    >
      {/* M16 : seul état de l'écran sans <h1> — cassait la hiérarchie de
          titres pour un lecteur d'écran une fois la veille fusionnée. */}
      <h1 id="publie-titre" className="text-xl font-bold text-neutral-900">
        Publié le {brusselsTime(mergedAt)}
      </h1>
      <p className="mt-2 text-sm text-neutral-600">
        {cards} fiches mises à jour.{' '}
        {hasRadar
          ? 'Cette veille porte des signaux radar : ils partiront au prochain passage social, dans les cinq jours.'
          : 'Aucun signal radar dans cette veille.'}
      </p>
      <a
        href="https://governance.brussels"
        className="mt-4 inline-block text-sm underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        Voir le site
      </a>
    </section>
  );
}
