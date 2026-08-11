// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { ContentPr, CheckState } from '@/lib/github-pr';

function ageLabel(createdAt: string, now: Date): string {
  const opened = new Date(createdAt).getTime();
  if (Number.isNaN(opened)) return 'date d\'ouverture inconnue';
  const hours = Math.floor((now.getTime() - opened) / 3_600_000);
  if (hours < 1) return 'ouverte à l\'instant';
  if (hours === 1) return 'ouverte il y a une heure';
  if (hours < 24) return `ouverte il y a ${hours} heures`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'ouverte hier' : `ouverte il y a ${days} jours`;
}

export function Verdict({
  pr,
  checks,
  truncated,
  fileRefusal,
  now,
}: {
  pr: ContentPr;
  checks: CheckState;
  truncated: boolean;
  /** Message de la liste blanche, ou `null`. Vient de `fileSetRefusal`. */
  fileRefusal: string | null;
  now: Date;
}) {
  // `missing` compte autant que `failed` : une PR sans aucun contrôle exécuté
  // n'a rien en échec, et l'écran annoncerait « Prêt à publier » alors que la
  // route refusera. Le verdict doit dire la même chose que le serveur.
  // `truncated` compte aussi : sans lui, l'écran annonçait « Prêt à publier »
  // pendant que la route répondait 422.
  // `fileRefusal` de même : une PR touchant un fichier hors périmètre
  // annonçait « Prêt à publier », bouton actif, et recevait un 403 au clic.
  const blocked =
    checks.failed.length > 0 ||
    checks.missing.length > 0 ||
    truncated ||
    fileRefusal !== null;
  const running = checks.pending > 0;

  const headline = truncated
    ? 'Publication indisponible : liste de fichiers incomplète'
    : fileRefusal
    ? `Publication impossible. ${fileRefusal}`
    : checks.failed.length > 0
    ? `Bloqué : ${checks.failed.join(', ')}`
    : running
      ? `Contrôles en cours (${checks.passed}/${checks.total})`
      : blocked
        ? `Contrôles manquants : ${checks.missing.join(', ')}`
        : 'Prêt à publier';

  return (
    <section
      aria-labelledby="verdict-titre"
      className={`rounded-lg border p-6 ${
        blocked ? 'border-amber-500 bg-amber-50/60' : 'border-neutral-200 bg-neutral-50'
      }`}
    >
      <h1 id="verdict-titre" className="text-2xl font-bold text-neutral-900">
        {headline}
      </h1>
      <p className="mt-2 text-sm text-neutral-600">
        {pr.title} · {ageLabel(pr.createdAt, now)}
      </p>
    </section>
  );
}
