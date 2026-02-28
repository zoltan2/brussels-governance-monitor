// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { z } from 'zod';
import type { Locale } from '@/i18n/routing';
import pressMentionsData from '../../data/press-mentions.json';

const pressMentionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  outlet: z.string(),
  author: z.string().nullable(),
  titles: z.object({
    fr: z.string(),
    nl: z.string(),
    en: z.string(),
    de: z.string(),
  }),
  url: z.string().url(),
  type: z.enum(['feature', 'citation', 'mention']),
});

const pressMentionsSchema = z.array(pressMentionSchema);

export interface PressMention {
  date: string;
  outlet: string;
  author: string | null;
  title: string;
  url: string;
  type: 'feature' | 'citation' | 'mention';
}

export function getPressMentions(locale: Locale): PressMention[] {
  const parsed = pressMentionsSchema.parse(pressMentionsData);
  return parsed
    .map((entry) => ({
      date: entry.date,
      outlet: entry.outlet,
      author: entry.author,
      title: entry.titles[locale] || entry.titles.fr,
      url: entry.url,
      type: entry.type,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getPressMentionCount(): number {
  return pressMentionsData.length;
}
