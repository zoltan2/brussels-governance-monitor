// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Contrôle de session unique pour tout ce qui vit sous /[locale]/admin.
 * Les pages enfants peuvent supposer une session valide et n'ont plus à la
 * vérifier elles-mêmes. /review et /review/digest sont ailleurs dans
 * l'arborescence et gardent leur propre contrôle.
 */
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const session = await auth();
  if (!session) {
    redirect(`/${locale}/login`);
  }

  const links = [
    { href: `/${locale}/admin`, label: "Vue d'ensemble" },
    { href: `/${locale}/admin/chat`, label: 'Chat' },
    { href: `/${locale}/admin/refonte`, label: 'Refonte' },
    { href: `/${locale}/review`, label: 'Brouillons' },
    { href: `/${locale}/review/digest`, label: 'Digest' },
  ];

  return (
    <div className="py-8">
      <nav aria-label="Administration" className="mx-auto mb-8 max-w-6xl px-4">
        <ul className="flex flex-wrap gap-4 border-b border-neutral-200 pb-3 text-sm">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-neutral-600 underline-offset-4 hover:text-neutral-900 hover:underline"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {children}
    </div>
  );
}
