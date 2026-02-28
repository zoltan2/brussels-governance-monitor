// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { ComponentProps } from 'react';

type LinkHref = ComponentProps<typeof Link>['href'];

interface RelatedItem {
  href: LinkHref;
  label: string;
  type: 'domain' | 'sector' | 'explainer' | 'solution';
}

const typeIcons: Record<RelatedItem['type'], string> = {
  domain: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  sector: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  explainer: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  solution: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
};

const relatedByDomain: Record<string, RelatedItem[]> = {
  budget: [
    { href: '/explainers/brussels-paradox', label: 'explainerParadox', type: 'explainer' },
    { href: '/explainers/brussels-overview', label: 'explainerOverview', type: 'explainer' },
    { href: { pathname: '/sectors/[slug]', params: { slug: 'construction' } }, label: 'sectorConstruction', type: 'sector' },
  ],
  mobility: [
    { href: { pathname: '/sectors/[slug]', params: { slug: 'transport' } }, label: 'sectorTransport', type: 'sector' },
    { href: { pathname: '/sectors/[slug]', params: { slug: 'construction' } }, label: 'sectorConstruction', type: 'sector' },
    { href: '/explainers/levels-of-power', label: 'explainerLevels', type: 'explainer' },
  ],
  employment: [
    { href: '/explainers/brussels-paradox', label: 'explainerParadox', type: 'explainer' },
    { href: '/explainers/brussels-cosmopolitan', label: 'explainerCosmopolitan', type: 'explainer' },
    { href: { pathname: '/sectors/[slug]', params: { slug: 'nonprofit' } }, label: 'sectorNonprofit', type: 'sector' },
  ],
  housing: [
    { href: { pathname: '/sectors/[slug]', params: { slug: 'housing-sector' } }, label: 'sectorHousing', type: 'sector' },
    { href: { pathname: '/sectors/[slug]', params: { slug: 'construction' } }, label: 'sectorConstruction', type: 'sector' },
    { href: '/explainers/brussels-paradox', label: 'explainerParadox', type: 'explainer' },
  ],
  climate: [
    { href: { pathname: '/sectors/[slug]', params: { slug: 'environment' } }, label: 'sectorEnvironment', type: 'sector' },
    { href: '/explainers/parliament-powers', label: 'explainerParliament', type: 'explainer' },
  ],
  social: [
    { href: { pathname: '/sectors/[slug]', params: { slug: 'health-social' } }, label: 'sectorHealthSocial', type: 'sector' },
    { href: { pathname: '/sectors/[slug]', params: { slug: 'nonprofit' } }, label: 'sectorNonprofit', type: 'sector' },
    { href: '/explainers/brussels-cosmopolitan', label: 'explainerCosmopolitan', type: 'explainer' },
  ],
  security: [
    { href: '/explainers/levels-of-power', label: 'explainerLevels', type: 'explainer' },
  ],
  economy: [
    { href: { pathname: '/sectors/[slug]', params: { slug: 'commerce' } }, label: 'sectorCommerce', type: 'sector' },
    { href: '/explainers/brussels-paradox', label: 'explainerParadox', type: 'explainer' },
  ],
  cleanliness: [
    { href: '/explainers/levels-of-power', label: 'explainerLevels', type: 'explainer' },
  ],
  institutional: [
    { href: '/explainers/who-decides-what', label: 'explainerWhoDecides', type: 'explainer' },
    { href: '/explainers/levels-of-power', label: 'explainerLevels', type: 'explainer' },
  ],
  'urban-planning': [
    { href: { pathname: '/sectors/[slug]', params: { slug: 'construction' } }, label: 'sectorConstruction', type: 'sector' },
    { href: { pathname: '/sectors/[slug]', params: { slug: 'environment' } }, label: 'sectorEnvironment', type: 'sector' },
    { href: '/explainers/levels-of-power', label: 'explainerLevels', type: 'explainer' },
  ],
  digital: [
    { href: { pathname: '/sectors/[slug]', params: { slug: 'digital' } }, label: 'sectorDigital', type: 'sector' },
    { href: '/explainers/brussels-overview', label: 'explainerOverview', type: 'explainer' },
  ],
  education: [
    { href: { pathname: '/sectors/[slug]', params: { slug: 'education' } }, label: 'sectorEducation', type: 'sector' },
    { href: '/explainers/communities-in-brussels', label: 'explainerCommunities', type: 'explainer' },
    { href: '/explainers/brussels-cosmopolitan', label: 'explainerCosmopolitan', type: 'explainer' },
  ],
};

export function RelatedCards({ domain }: { domain: string }) {
  const t = useTranslations('relatedCards');
  const th = useTranslations('home');

  const items = relatedByDomain[domain];
  if (!items || items.length === 0) return null;

  const labelMap: Record<string, string> = {
    explainerParadox: th('explainerParadox'),
    explainerOverview: th('explainerOverview'),
    explainerLevels: th('explainerLevels'),
    explainerParliament: th('explainerParliament'),
    explainerCosmopolitan: th('explainerCosmopolitan'),
    sectorConstruction: 'Construction',
    sectorTransport: 'Transport',
    sectorNonprofit: 'Associatif',
    sectorHousing: 'Logement',
    sectorEnvironment: 'Environnement',
    sectorHealthSocial: 'Santé & social',
    sectorCommerce: 'Commerce',
    sectorDigital: 'Numérique',
    sectorEducation: 'Enseignement',
    explainerWhoDecides: 'Qui décide quoi ?',
    explainerCommunities: 'Les Communautés à Bruxelles',
  };

  return (
    <div className="mt-10 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {t('title')}
      </h2>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            <svg
              className="h-4 w-4 shrink-0 text-neutral-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d={typeIcons[item.type]}
              />
            </svg>
            <Link
              href={item.href}
              className="text-sm text-brand-700 underline underline-offset-2 hover:text-brand-900"
            >
              {labelMap[item.label] || item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
