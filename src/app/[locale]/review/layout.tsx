// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AdminNav } from '@/components/admin/admin-nav';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function generateMetadata(): Promise<Metadata> {
  return { robots: { index: false, follow: false } };
}

/**
 * Jumeau du layout /admin, pour le sous-arbre /review.
 *
 * Deux raisons d'exister. D'abord la navigation : sans elle, on entre dans
 * les brouillons ou le digest sans pouvoir revenir au hub.
 *
 * Ensuite le contrôle de session. /review/digest est un composant client,
 * donc il ne pouvait porter ni garde serveur ni métadonnées : la page
 * répondait 200 à n'importe qui. Ses données passaient bien par une API
 * protégée, donc rien ne fuitait, mais la coquille de l'interface d'édition
 * était publique. Le layout ferme les deux.
 */
export default async function ReviewLayout({
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

  return (
    <div className="py-8">
      <AdminNav locale={locale} />
      {children}
    </div>
  );
}
