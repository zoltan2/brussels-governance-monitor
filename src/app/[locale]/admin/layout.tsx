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
