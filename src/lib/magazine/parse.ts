import matter from 'gray-matter';
import type { MagazineDraft, Magazine } from './types';

export function parseDigestMagazine(raw: string): MagazineDraft {
  const parsed = matter(raw);
  const data = parsed.data as Record<string, unknown>;

  const week = String(data.week ?? '');
  const weekNum = week.split('-w')[1] ?? '';
  const weekShort = weekNum ? `s${weekNum}` : '';

  return {
    week,
    weekShort,
    lang: String(data.lang ?? ''),
    title: String(data.title ?? ''),
    generated_at: String(data.generated_at ?? ''),
    magazine: (data.magazine as Magazine | undefined) ?? undefined,
  };
}
