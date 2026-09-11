// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { Metadata } from 'next';
import digestLanguages from '../../../../config/digest-languages.json';
import { DigestShell } from '@/components/digest/digest-shell';
import { routing } from '@/i18n/routing';

const RTL_LANGS = new Set(
  digestLanguages.filter((l) => l.rtl).map((l) => l.code),
);
const SITE_LOCALES: readonly string[] = routing.locales;

export const metadata: Metadata = {
  title: {
    default: 'Weekly Digest | Brussels Governance Monitor',
    template: '%s | BGM Digest',
  },
  description:
    'Weekly summary of Brussels governance — available in 78 languages.',
};

/**
 * Racine des archives `/digest/<lang>/…` : `<html lang>` porte la langue de
 * l'archive. Voir `DigestShell`.
 */
export default async function DigestLangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return (
    <DigestShell lang={lang} dir={RTL_LANGS.has(lang) ? 'rtl' : 'ltr'} indexed={SITE_LOCALES.includes(lang)}>
      {children}
    </DigestShell>
  );
}
