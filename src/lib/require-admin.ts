// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { routing } from '@/i18n/routing';

/**
 * Contrôle de session à appeler EN PREMIER dans chaque page admin ou relecture.
 *
 * Le contrôle du layout ne suffit pas : Next rend la page même quand le layout
 * redirige, et la charge RSC part avec la réponse 307. Constaté en production
 * le 19/09/2026 : une requête sans cookie sur /fr/admin/refonte renvoyait les
 * adresses e-mail des votants dans le corps de la redirection.
 *
 * À appeler avant toute lecture de données, sinon la fuite revient.
 */
export async function requireAdmin(locale?: string): Promise<void> {
  const session = await auth();
  if (session) return;

  const safeLocale =
    locale && (routing.locales as readonly string[]).includes(locale)
      ? locale
      : routing.defaultLocale;
  const target = `/${safeLocale}/admin`;
  redirect(`/${safeLocale}/login?callbackUrl=${encodeURIComponent(target)}`);
}
