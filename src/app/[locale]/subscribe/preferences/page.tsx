// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { setRequestLocale } from 'next-intl/server';
import { PreferencesForm } from '@/components/preferences-form';

export default async function PreferencesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { token } = await searchParams;

  return (
    <section className="py-12">
      <div className="mx-auto max-w-lg px-4">
        <PreferencesForm token={token} />
      </div>
    </section>
  );
}
