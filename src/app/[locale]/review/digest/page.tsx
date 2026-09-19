// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { DigestReviewClient } from '@/components/admin/digest-review-client';
import { requireAdmin } from '@/lib/require-admin';

export const dynamic = 'force-dynamic';

/**
 * Coquille serveur : l'écran d'édition est un composant client, il ne peut donc
 * pas contrôler la session lui-même. Les données arrivent par des routes d'API
 * protégées, mais sans ce contrôle la coquille reste publique.
 */
export default async function DigestReviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdmin(locale);

  return <DigestReviewClient />;
}
