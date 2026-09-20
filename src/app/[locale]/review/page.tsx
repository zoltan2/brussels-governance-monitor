// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/require-admin';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Review · Draft Cards',
    robots: { index: false, follow: false },
  };
}

/**
 * La relecture des brouillons vit désormais dans /admin/relecture, en
 * second bloc à côté des deux autres signaux (pages citées par les
 * assistants IA, FAQ en retard, chapeaux périmés). Cette page ne fait plus
 * que rediriger, pour que les liens déjà distribués (favoris, emails de
 * veille) continuent de fonctionner.
 */
export default async function ReviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdmin(locale);

  redirect(`/${locale}/admin/relecture`);
}
