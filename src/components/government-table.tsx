// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { useTranslations } from 'next-intl';
import governmentData from '@/../data/government.json';
import type { Locale } from '@/i18n/routing';

type Role = 'minister-president' | 'minister' | 'state-secretary' | 'parliament-vp';

const roleBadgeClasses: Record<Role, string> = {
  'minister-president': 'bg-blue-100 text-blue-800',
  minister: 'bg-slate-100 text-slate-700',
  'state-secretary': 'bg-neutral-100 text-neutral-600',
  'parliament-vp': 'bg-neutral-100 text-neutral-600',
};

interface GovernmentTableProps {
  locale: string;
  inline?: boolean;
}

export function GovernmentTable({ locale, inline = false }: GovernmentTableProps) {
  const t = useTranslations('home');

  const table = (
    <details className="group rounded-lg border border-neutral-200 bg-white" {...(inline ? {} : { open: true })}>
      <summary className="flex cursor-pointer list-none items-center justify-between p-5 [&::-webkit-details-marker]:hidden">
        <div>
          <h2 className={`font-semibold text-neutral-900 ${inline ? 'text-xs' : 'text-sm'}`}>
            {t('governmentTitle')}
          </h2>
          <p className="mt-0.5 text-xs text-neutral-500">{t('governmentSubtitle')}</p>
        </div>
        <svg
          className="h-4 w-4 shrink-0 text-neutral-400 transition-transform group-open:rotate-90"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </summary>

      <div className="border-t border-neutral-100 px-5 pb-5 pt-3">
        <div className="space-y-3">
          {governmentData.members.map((member) => (
            <div
              key={member.name}
              className="flex flex-col gap-1 border-b border-neutral-100 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-start sm:gap-3"
            >
              <div className="flex shrink-0 items-center gap-2 sm:w-36">
                <span className="text-xs font-semibold text-neutral-900">
                  {member.party}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${roleBadgeClasses[member.role as Role]}`}
                >
                  {t(`governmentRoles.${member.role}`)}
                </span>
              </div>

              <div className="flex-1">
                {member.name ? (
                  <span className="text-sm font-medium text-neutral-800">
                    {member.name}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-700">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-xs font-bold">
                      ?
                    </span>
                    {t('governmentUnknown')}
                  </span>
                )}
                <p className="mt-0.5 text-xs text-neutral-500">
                  {member.portfolios[locale as Locale]}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 border-t border-neutral-100 pt-3 text-[10px] text-neutral-500">
          {t('governmentSource')}
        </p>
      </div>
    </details>
  );

  if (inline) return table;

  return (
    <section className="py-8">
      <div className="mx-auto max-w-3xl px-4">
        {table}
      </div>
    </section>
  );
}
