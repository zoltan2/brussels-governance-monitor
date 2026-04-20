export interface MagazineItem {
  category?: string;
  headline: string;
  path?: string;
  stat: string;
  stat_label: string;
  pill?: string;
  description: string;
  howto: string;
}

export interface Magazine {
  tagline: string;
  closing_line: string;
  items: MagazineItem[];
}

export interface MagazineDraft {
  week: string; // "2026-w15"
  weekShort: string; // "s15"
  lang: string;
  title: string;
  generated_at: string;
  magazine: Magazine | undefined;
}

export interface ValidationError {
  itemIndex: number | null;
  field: string;
  reason: string;
}
