// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { listContentPrs, type ContentPr } from '@/lib/github-pr';

export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  return { title: 'Publication', robots: { index: false, follow: false } };
}

export default async function ContentIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // `listContentPrs` lève si la configuration GitHub manque. Sans ce garde,
  // l'admin reçoit une page 500 générique au lieu d'un message actionnable —
  // alors que la tuile du tableau de bord, elle, dégrade proprement.
  let prs: ContentPr[] | null = null;
  try {
    prs = await listContentPrs();
  } catch {
    prs = null;
  }

  if (prs === null) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-neutral-900">
          Liste des veilles indisponible
        </h1>
        <p className="mt-2 text-neutral-600">
          Impossible de joindre GitHub. Vérifier la configuration du serveur,
          puis recharger. En attendant, la fusion reste possible depuis GitHub.
        </p>
      </div>
    );
  }

  // `redirect()` lève une exception de contrôle interne à Next : elle doit
  // rester HORS de tout try/catch, sinon la page devient blanche.
  // Le cas réel est zéro ou un. On évite d'imposer une liste pour un élément.
  if (prs.length === 1) {
    redirect(`/${locale}/admin/content/${prs[0].number}`);
  }

  if (prs.length === 0) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-neutral-900">Rien à publier</h1>
        <p className="mt-2 text-neutral-600">
          Aucune veille n’attend de publication. La prochaine tire dimanche à 8h.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-neutral-900">
        {prs.length} veilles en attente
      </h1>
      <ul className="mt-4 space-y-2">
        {prs.map((pr) => (
          <li key={pr.number}>
            <Link
              href={`/${locale}/admin/content/${pr.number}`}
              className="block rounded border border-neutral-200 bg-neutral-50 p-4 hover:border-brand-700"
            >
              <span className="font-medium text-neutral-900">{pr.title}</span>
              <span className="ml-2 text-sm text-neutral-600">#{pr.number}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
