import type { Locale } from '@/i18n/routing';

/** Entity IDs — the 7 institutions that affect Brussels citizens */
export type EntityId = 'rbc' | 'cocom' | 'cocof' | 'vgc' | 'fwb' | 'vl-gem' | 'federal';

/** Editorial coverage level: 1=proactive, 2=reactive, 3=passive */
export type Circle = 1 | 2 | 3;

/** Domain IDs matching the Velite parentDomain enum */
export type DomainId =
  | 'budget'
  | 'mobility'
  | 'housing'
  | 'employment'
  | 'climate'
  | 'social'
  | 'security'
  | 'economy'
  | 'cleanliness'
  | 'institutional';

export interface EntityMeta {
  id: EntityId;
  labels: Record<Locale, string>;
  shortLabels: Record<Locale, string>;
  color: string;
  explainerSlug: string;
  circle: Circle;
}

export const ENTITIES: Record<EntityId, EntityMeta> = {
  rbc: {
    id: 'rbc',
    labels: {
      fr: 'Région de Bruxelles-Capitale',
      nl: 'Brussels Hoofdstedelijk Gewest',
      en: 'Brussels-Capital Region',
      de: 'Region Brüssel-Hauptstadt',
    },
    shortLabels: { fr: 'Région', nl: 'Gewest', en: 'Region', de: 'Region' },
    color: 'bg-blue-800',
    explainerSlug: 'brussels-region',
    circle: 1,
  },
  cocom: {
    id: 'cocom',
    labels: {
      fr: 'Commission communautaire commune (COCOM)',
      nl: 'Gemeenschappelijke Gemeenschapscommissie (GGC)',
      en: 'Common Community Commission (COCOM)',
      de: 'Gemeinsame Gemeinschaftskommission (GGK)',
    },
    shortLabels: { fr: 'COCOM', nl: 'GGC', en: 'COCOM', de: 'GGK' },
    color: 'bg-slate-700',
    explainerSlug: 'cocom',
    circle: 1,
  },
  cocof: {
    id: 'cocof',
    labels: {
      fr: 'Commission communautaire française (COCOF)',
      nl: 'Franse Gemeenschapscommissie (FGC)',
      en: 'French Community Commission (COCOF)',
      de: 'Französische Gemeinschaftskommission (COCOF)',
    },
    shortLabels: { fr: 'COCOF', nl: 'FGC', en: 'COCOF', de: 'COCOF' },
    color: 'bg-blue-600',
    explainerSlug: 'cocof',
    circle: 2,
  },
  vgc: {
    id: 'vgc',
    labels: {
      fr: 'Commission communautaire flamande (VGC)',
      nl: 'Vlaamse Gemeenschapscommissie (VGC)',
      en: 'Flemish Community Commission (VGC)',
      de: 'Flämische Gemeinschaftskommission (VGC)',
    },
    shortLabels: { fr: 'VGC', nl: 'VGC', en: 'VGC', de: 'VGC' },
    color: 'bg-amber-600',
    explainerSlug: 'vgc',
    circle: 2,
  },
  fwb: {
    id: 'fwb',
    labels: {
      fr: 'Fédération Wallonie-Bruxelles (FWB)',
      nl: 'Federatie Wallonië-Brussel (FWB)',
      en: 'Wallonia-Brussels Federation (FWB)',
      de: 'Föderation Wallonien-Brüssel (FWB)',
    },
    shortLabels: { fr: 'FWB', nl: 'FWB', en: 'FWB', de: 'FWB' },
    color: 'bg-slate-600',
    explainerSlug: 'communities-in-brussels',
    circle: 2,
  },
  'vl-gem': {
    id: 'vl-gem',
    labels: {
      fr: 'Communauté flamande',
      nl: 'Vlaamse Gemeenschap',
      en: 'Flemish Community',
      de: 'Flämische Gemeinschaft',
    },
    shortLabels: { fr: 'Vl. Gem.', nl: 'Vl. Gem.', en: 'Fl. Com.', de: 'Fl. Gem.' },
    color: 'bg-amber-700',
    explainerSlug: 'communities-in-brussels',
    circle: 2,
  },
  federal: {
    id: 'federal',
    labels: {
      fr: 'État fédéral',
      nl: 'Federale overheid',
      en: 'Federal State',
      de: 'Föderalstaat',
    },
    shortLabels: { fr: 'Fédéral', nl: 'Federaal', en: 'Federal', de: 'Bund' },
    color: 'bg-slate-800',
    explainerSlug: 'federal-and-brussels',
    circle: 2,
  },
};

/**
 * Domain-specific circle overrides.
 * Only domains where an entity differs from its default circle are listed.
 */
const CIRCLE_MATRIX: Partial<Record<EntityId, Partial<Record<DomainId, Circle>>>> = {
  federal: {
    security: 1,
    budget: 1,
  },
  fwb: {
    social: 1,
  },
  'vl-gem': {
    social: 1,
  },
  cocof: {
    social: 1,
  },
  vgc: {
    social: 1,
  },
};

export function getEntity(id: EntityId): EntityMeta {
  return ENTITIES[id];
}

export function getCircle(entity: EntityId, domain?: DomainId): Circle {
  if (domain) {
    const override = CIRCLE_MATRIX[entity]?.[domain];
    if (override !== undefined) return override;
  }
  return ENTITIES[entity].circle;
}

export function getEntitiesForDomain(domain: DomainId): EntityMeta[] {
  const allIds = Object.keys(ENTITIES) as EntityId[];
  return allIds
    .map((id) => ({ meta: ENTITIES[id], circle: getCircle(id, domain) }))
    .sort((a, b) => a.circle - b.circle)
    .map((item) => item.meta);
}

export const ALL_ENTITY_IDS: EntityId[] = Object.keys(ENTITIES) as EntityId[];
