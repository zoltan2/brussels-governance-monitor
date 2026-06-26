// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { ReactElement } from 'react';
import { CountersRow } from './heat-counters';
import { EAU_COUNTERS, EAU_COUNTERS_CAPTION } from './data/eau';
import type { Locale } from './data/heat';

const EAU_COUNTERS_CAPTION_ID = 'rechauffement-eau-counters-caption';

export function RechauffementEauCounters({ locale = 'fr' }: { locale?: Locale }): ReactElement {
  return (
    <div className="my-8">
      <CountersRow
        counters={EAU_COUNTERS}
        caption={EAU_COUNTERS_CAPTION}
        captionId={EAU_COUNTERS_CAPTION_ID}
        locale={locale}
      />
    </div>
  );
}
