// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * En-têtes de désabonnement en un clic (RFC 8058) pour tout email envoyé à un
 * abonné.
 *
 * `List-Unsubscribe` doit viser une route qui désabonne sur un POST
 * `List-Unsubscribe=One-Click` : `/api/unsubscribe/one-click`. Il visait
 * jusqu'au 27/09/2026 la page de préférences, qui ne désabonne pas. Le lien
 * « préférences » du corps de l'email, lui, reste inchangé.
 */
export function listUnsubscribeHeaders(
  siteUrl: string,
  unsubToken: string,
  locale: string,
): Record<'List-Unsubscribe' | 'List-Unsubscribe-Post', string> {
  const url = `${siteUrl}/api/unsubscribe/one-click?token=${encodeURIComponent(unsubToken)}&locale=${encodeURIComponent(locale)}`;
  return {
    'List-Unsubscribe': `<${url}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}
