// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { useTranslations } from 'next-intl';

/**
 * Shown on a `draft: true` card's own public [slug] page, in whichever of
 * the four site locales that page is served — the page itself IS reachable
 * at its URL for editorial preview (see src/lib/metadata.ts `draft` param
 * and src/app/sitemap.ts), it is just noindexed and left out of every
 * listing. The wording says exactly that: it used to claim the page "isn't
 * visible on the public site", which was false — the URL serves it to
 * anyone who has it.
 */
export function DraftBanner() {
  const t = useTranslations('draft');

  return (
    <div className="rounded-md border border-warning-strong bg-warning-bg px-4 py-2 text-sm font-medium text-warning-fg">
      {t('banner')}
    </div>
  );
}
