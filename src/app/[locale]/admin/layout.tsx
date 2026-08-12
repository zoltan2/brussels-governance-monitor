// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AdminNav } from '@/components/admin/admin-nav';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Contrôle de session unique pour tout ce qui vit sous /[locale]/admin.
 * Les pages enfants peuvent supposer une session valide et n'ont plus à la
 * vérifier elles-mêmes. Le sous-arbre /review a son propre layout jumeau.
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
    // Repli VOLONTAIRE sur le tableau de bord : une mise en page ne connaît
    // pas l'URL demandée (pas de `searchParams`, pas de chemin), elle ne peut
    // donc pas fabriquer un `callbackUrl` profond. Ce n'est pas un oubli.
    //
    // Le lien profond appartient à l'ÉMETTEUR du lien. L'email de veille doit
    // pointer sur
    //   /{locale}/login?callbackUrl=%2F{locale}%2Fadmin%2Fcontent%2F{numéro}
    // plutôt que directement sur la page-décision : une session déjà ouverte
    // est renvoyée sur la cible, et une session expirée y arrive après
    // connexion. Sans cela, le lien profond ne survit pas à une expiration.
    const target = `/${locale}/admin`;
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(target)}`);
  }

  return (
    <div className="py-8">
      <AdminNav locale={locale} />
      {children}
    </div>
  );
}
