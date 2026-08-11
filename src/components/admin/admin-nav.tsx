// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import Link from 'next/link';

/**
 * Barre de navigation commune à toutes les pages d'administration.
 *
 * Partagée par les deux layouts, /[locale]/admin et /[locale]/review, qui
 * sont deux sous-arbres distincts de l'App Router mais un seul espace du
 * point de vue de l'utilisateur : sans elle, on entre dans les brouillons
 * sans pouvoir revenir au hub autrement qu'en éditant l'URL.
 */
export function AdminNav({ locale }: { locale: string }) {
  const links = [
    { href: `/${locale}/admin`, label: "Vue d'ensemble" },
    { href: `/${locale}/admin/chat`, label: 'Chat' },
    { href: `/${locale}/admin/refonte`, label: 'Refonte' },
    { href: `/${locale}/review`, label: 'Brouillons' },
    { href: `/${locale}/review/digest`, label: 'Digest' },
  ];

  return (
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
  );
}
