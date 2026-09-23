// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

export function DraftBanner() {
  return (
    <div className="rounded-md border border-warning-strong bg-warning-bg px-4 py-2 text-sm font-medium text-warning-fg">
      DRAFT — Cette carte est en mode brouillon. Elle n&apos;est pas visible sur le site public.
    </div>
  );
}
