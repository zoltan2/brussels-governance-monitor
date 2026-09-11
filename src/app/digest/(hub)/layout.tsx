// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { Metadata } from 'next';
import { DigestShell } from '@/components/digest/digest-shell';

export const metadata: Metadata = {
  title: {
    default: 'Weekly Digest | Brussels Governance Monitor',
    template: '%s | BGM Digest',
  },
  description:
    'Weekly summary of Brussels governance, in French, Dutch, English, German and other languages.',
};

/** Racine de `/digest` et `/digest/feedback`, en anglais. */
export default function DigestHubLayout({ children }: { children: React.ReactNode }) {
  return (
    <DigestShell lang="en" indexed>
      {children}
    </DigestShell>
  );
}
