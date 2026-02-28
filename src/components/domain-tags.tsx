// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import tagsData from '@/../data/tags-registry.json';

interface Tag {
  id: string;
  type: 'public' | 'transversal';
  labels: Record<string, string>;
  domains: string[];
}

const tags = tagsData.tags as Tag[];

export function DomainTags({ domain, locale }: { domain: string; locale: string }) {
  const matching = tags.filter((tag) => tag.domains.includes(domain));
  if (matching.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {matching.map((tag) => (
        <span
          key={tag.id}
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
            tag.type === 'transversal'
              ? 'border border-neutral-300 bg-white text-neutral-600'
              : 'bg-neutral-100 text-neutral-700'
          }`}
        >
          {tag.labels[locale] || tag.labels.fr}
        </span>
      ))}
    </div>
  );
}
