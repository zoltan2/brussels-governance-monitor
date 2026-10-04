export type MagazineConfidence = 'official' | 'estimated' | 'unconfirmed';
export type MagazineSourceKind = 'primaire' | 'secondaire' | 'tierce';

/** Une référence citée sous un sujet (gabarit v2). Son URL doit figurer dans la fiche désignée par `path`. */
export interface MagazineSource {
  label: string;
  url: string;
  kind: MagazineSourceKind;
  note?: string;
}

export interface MagazineItem {
  category?: string;
  headline: string;
  path?: string;
  stat: string;
  stat_label: string;
  pill?: string;
  description: string;
  /** v1 : mode d'emploi du chiffre. v2 : texte de « La nuance qui compte », sous `nuance_title`. */
  howto: string;

  // ---- Gabarit v2 (maquette du 27/09/2026) ----
  /** Libellé court pour le sommaire et la couverture (« Fiscalité »). */
  short?: string;
  /** Chapeau en une ou deux phrases, sous le titre. */
  lead?: string;
  /** Un ou deux repères sous le grand chiffre (« 339 881 déclarations sur 791 621 »). */
  facts?: string[];
  /** Titre de « La nuance qui compte ». */
  nuance_title?: string;
  /** Niveau de confiance de la fiche : donne le statut affiché. */
  confidence?: MagazineConfidence;
  /** Précision facultative sous le statut (« Analyse rapportée par BRUZZ »). */
  status?: string;
  /** Références du sujet, reprises de la fiche. */
  sources?: MagazineSource[];
  /** Mis en avant sur la couverture (trois au plus). */
  cover?: boolean;
}

export interface Magazine {
  tagline: string;
  closing_line: string;
  items: MagazineItem[];

  // ---- Gabarit v2 ----
  version?: 1 | 2;
  /** Période couverte, en toutes lettres (« 21 au 27 septembre 2026 »). */
  period?: string;
  /** Jour de consultation des références, AAAA-MM-JJ. */
  consulted?: string;
  /** Phrase d'intention sous le titre de couverture. */
  intro?: string;
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
