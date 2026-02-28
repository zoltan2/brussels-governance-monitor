// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const tocLabel: Record<string, string> = {
  fr: 'Sommaire',
  nl: 'Inhoud',
  en: 'Contents',
  de: 'Inhalt',
};

interface Heading {
  id: string;
  text: string;
}

function getHeadingsSnapshot(): Heading[] {
  const mdxContainer = document.querySelector('[data-mdx-content]');
  if (!mdxContainer) return [];

  const h2s = mdxContainer.querySelectorAll('h2');
  const items: Heading[] = [];

  h2s.forEach((h2) => {
    const text = h2.textContent ?? '';
    if (!text.trim()) return;
    const id = h2.id || slugify(text);
    if (!h2.id) h2.id = id;
    items.push({ id, text: text.trim() });
  });

  return items;
}

const emptyHeadings: Heading[] = [];

export function TableOfContents({ locale }: { locale: string }) {
  const headingsRef = useRef<Heading[]>(emptyHeadings);
  const [activeId, setActiveId] = useState<string>('');

  // Read headings once after mount, stored in ref to avoid setState-in-effect
  const headings = useSyncExternalStore(
    () => () => {},
    () => {
      if (headingsRef.current.length === 0) {
        headingsRef.current = getHeadingsSnapshot();
      }
      return headingsRef.current;
    },
    () => emptyHeadings,
  );

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px' },
    );

    for (const h of headings) {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 3) return null;

  return (
    <nav
      aria-label={tocLabel[locale] ?? tocLabel.en}
      className="mb-8 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3"
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
        {tocLabel[locale] ?? tocLabel.en}
      </p>
      <ol className="space-y-1">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`block rounded px-2 py-1 text-xs transition-colors ${
                activeId === h.id
                  ? 'bg-brand-50 font-medium text-brand-700'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
