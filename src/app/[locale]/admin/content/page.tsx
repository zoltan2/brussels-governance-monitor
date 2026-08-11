// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { listContentPrs } from '@/lib/github-pr';

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
  const prs = await listContentPrs();

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
