import { defineCollection, defineConfig, s } from 'velite';

const localeEnum = s.enum(['fr', 'nl', 'en', 'de']);

const sourceSchema = s.object({
  label: s.string(),
  url: s.string().url(),
  accessedAt: s.isodate(),
});

const metricSchema = s.object({
  label: s.string(),
  value: s.string(),
  unit: s.string().optional(),
  source: s.string(),
  date: s.isodate(),
});

// ──────────────────────────────────────────────
// Collection: Domain Cards (MVP — Budget, Mobility)
// ──────────────────────────────────────────────
const domainCards = defineCollection({
  name: 'DomainCard',
  pattern: 'domain-cards/*.mdx',
  schema: s
    .object({
      title: s.string().max(120),
      slug: s.string(),
      locale: localeEnum,
      domain: s.enum(['budget', 'mobility', 'housing', 'employment', 'climate', 'social']),
      status: s.enum(['blocked', 'delayed', 'ongoing', 'resolved']),
      blockedSince: s.isodate().optional(),
      summary: s.string().max(500),
      sectors: s.array(s.string()).default([]),
      sources: s.array(sourceSchema),
      confidenceLevel: s.enum(['official', 'estimated', 'unconfirmed']),
      metrics: s.array(metricSchema).default([]),
      lastModified: s.isodate(),
      changeType: s.enum(['new', 'updated', 'status-change', 'data-refresh']).optional(),
      changeSummary: s.string().optional(),
      summaryFalc: s.string().max(200).optional(),
      draft: s.boolean().default(false),
      content: s.mdx(),
    })
    .transform((data) => ({
      ...data,
      permalink: `/domains/${data.slug}`,
    })),
});

// ──────────────────────────────────────────────
// Collection: Solution Cards (MVP — 2 cards)
// ──────────────────────────────────────────────
const solutionCards = defineCollection({
  name: 'SolutionCard',
  pattern: 'solution-cards/*.mdx',
  schema: s
    .object({
      title: s.string().max(120),
      slug: s.string(),
      locale: localeEnum,
      solutionType: s.enum(['political', 'constitutional', 'parliamentary']),
      feasibility: s.enum(['high', 'medium', 'low', 'very-low', 'near-zero']),
      timeline: s.enum(['immediate', 'weeks', 'months', 'years']),
      precedent: s
        .object({
          description: s.string(),
          country: s.string(),
          year: s.number(),
        })
        .optional(),
      legalBasis: s.string().optional(),
      mechanism: s.string(),
      risks: s.array(s.string()).default([]),
      whoCanTrigger: s.string(),
      summaryFalc: s.string().max(200).optional(),
      draft: s.boolean().default(false),
      lastModified: s.isodate(),
      content: s.mdx(),
    })
    .transform((data) => ({
      ...data,
      permalink: `/solutions/${data.slug}`,
    })),
});

// ──────────────────────────────────────────────
// Collection: Formation Rounds (timeline macro-structure)
// ──────────────────────────────────────────────
const formationRounds = defineCollection({
  name: 'FormationRound',
  pattern: 'formation-rounds/*.mdx',
  schema: s
    .object({
      number: s.number(),
      label: s.string().max(120),
      slug: s.string(),
      locale: localeEnum,
      actor: s.string(), // e.g. "Formateur (MR)", "Informateurs (Les Engagés + Groen)"
      startDate: s.isodate(),
      endDate: s.isodate().optional(), // null if ongoing
      formulaAttempted: s.string(),
      result: s.enum(['ongoing', 'recommendation', 'stalled', 'failed']),
      failureReason: s.string().optional(),
      lastModified: s.isodate(),
      content: s.mdx(),
    })
    .transform((data) => ({
      ...data,
      permalink: `/timeline#round-${data.number}`,
    })),
});

// ──────────────────────────────────────────────
// Collection: Formation Events (timeline detail)
// ──────────────────────────────────────────────
const formationEvents = defineCollection({
  name: 'FormationEvent',
  pattern: 'formation-events/*.mdx',
  schema: s
    .object({
      title: s.string().max(200),
      slug: s.string(),
      locale: localeEnum,
      date: s.isodate(),
      round: s.number(), // links to FormationRound.number
      eventType: s.enum([
        'designation',
        'consultation',
        'proposal',
        'blockage',
        'resignation',
        'citizen',
        'budget',
        'initiative',
      ]),
      confidenceLevel: s.enum(['official', 'estimated', 'unconfirmed']).optional(),
      order: s.number().optional(), // intra-day ordering (higher = later in the day)
      summary: s.string().max(500),
      impact: s.string().optional(),
      sources: s.array(sourceSchema),
      lastModified: s.isodate(),
      content: s.mdx(),
    })
    .transform((data) => ({
      ...data,
      permalink: `/timeline#event-${data.slug}`,
    })),
});

// ──────────────────────────────────────────────
// Collection: Glossary Terms
// ──────────────────────────────────────────────
const glossaryTerms = defineCollection({
  name: 'GlossaryTerm',
  pattern: 'glossary/*.mdx',
  schema: s
    .object({
      term: s.string().max(120),
      slug: s.string(),
      locale: localeEnum,
      definition: s.string().max(500),
      category: s.enum([
        'institution',
        'procedure',
        'budget',
        'political',
        'legal',
        'bgm',
      ]),
      relatedTerms: s.array(s.string()).default([]),
      sources: s.array(sourceSchema).default([]),
      lastModified: s.isodate(),
      content: s.mdx(),
    })
    .transform((data) => ({
      ...data,
      permalink: `/glossary#${data.slug}`,
    })),
});

// ──────────────────────────────────────────────
// Collection: Verifications (audit trail per card)
// ──────────────────────────────────────────────
const verifications = defineCollection({
  name: 'Verification',
  pattern: 'verifications/*.mdx',
  schema: s
    .object({
      slug: s.string(),
      locale: localeEnum,
      cardType: s.enum(['domain', 'sector']),
      cardSlug: s.string(),
      date: s.isodate(),
      result: s.enum(['no-change', 'change-detected', 'uncertainty', 'suspended']),
      summary: s.string().max(500),
      trigger: s
        .enum(['scheduled', 'source-contradiction', 'external-report', 'institutional-event'])
        .optional(),
      sourcesConsulted: s.array(sourceSchema),
      editor: s.string().default('BGM'),
      nextVerification: s.isodate().optional(),
      lastModified: s.isodate(),
      content: s.mdx(),
    })
    .transform((data) => ({
      ...data,
      permalink: `/verifications/${data.cardSlug}-${data.date}`,
    })),
});

// ──────────────────────────────────────────────
// Collection: Sector Cards (V1 — schema ready, 0 content)
// ──────────────────────────────────────────────
const sectorCards = defineCollection({
  name: 'SectorCard',
  pattern: 'sector-cards/*.mdx',
  schema: s
    .object({
      title: s.string().max(120),
      slug: s.string(),
      locale: localeEnum,
      parentDomain: s.enum(['budget', 'mobility', 'housing', 'employment', 'climate', 'social']),
      sector: s.string(),
      frozenMechanisms: s
        .array(
          s.object({
            name: s.string(),
            description: s.string(),
            since: s.isodate().optional(),
          }),
        )
        .default([]),
      activeMechanisms: s
        .array(
          s.object({
            name: s.string(),
            description: s.string(),
          }),
        )
        .default([]),
      impactIndicators: s
        .array(
          s.object({
            label: s.string(),
            value: s.string(),
            source: s.string(),
            url: s.string().url().optional(),
            frequency: s.string().optional(),
          }),
        )
        .default([]),
      stakeholders: s
        .array(
          s.object({
            name: s.string(),
            type: s.enum(['federation', 'agency', 'ngo', 'union']),
            url: s.string().url().optional(),
          }),
        )
        .default([]),
      humanImpact: s.string().optional(),
      draft: s.boolean().default(false),
      lastModified: s.isodate(),
      content: s.mdx(),
    })
    .transform((data) => ({
      ...data,
      permalink: `/sectors/${data.slug}`,
    })),
});

// ──────────────────────────────────────────────
// Collection: Commune Cards (19 communes bruxelloises)
// ──────────────────────────────────────────────
const communeSourceSchema = s.object({
  label: s.string(),
  url: s.string().url(),
  type: s.enum(['official', 'media', 'opendata', 'citizen', 'regional']),
  accessedAt: s.isodate(),
});

const communeCards = defineCollection({
  name: 'CommuneCard',
  pattern: 'commune-cards/*.mdx',
  schema: s
    .object({
      title: s.string().max(120),
      slug: s.string(),
      locale: localeEnum,
      commune: s.string(),
      postalCode: s.string(),
      population: s.number(),
      area: s.number().optional(),
      mayor: s.string(),
      mayorParty: s.string(),
      coalition: s.array(s.string()),
      councilSeats: s.number(),
      transparencyIndicators: s.object({
        budgetOnline: s.enum(['yes', 'partial', 'no']),
        councilMinutesOnline: s.enum(['yes', 'partial', 'no']),
        councilLivestream: s.enum(['yes', 'partial', 'no']),
        openData: s.enum(['yes', 'partial', 'no']),
        participationPlatform: s.enum(['yes', 'partial', 'no']),
        mandateRegistry: s.enum(['yes', 'partial', 'no']),
      }),
      relatedDomains: s
        .array(s.enum(['budget', 'mobility', 'housing', 'employment', 'climate', 'social']))
        .default([]),
      relatedSectors: s.array(s.string()).default([]),
      sources: s.array(communeSourceSchema),
      keyFigures: s.array(metricSchema).default([]),
      alerts: s
        .array(
          s.object({
            label: s.string(),
            severity: s.enum(['info', 'warning', 'critical']),
            date: s.isodate(),
          }),
        )
        .default([]),
      draft: s.boolean().default(false),
      lastModified: s.isodate(),
      content: s.mdx(),
    })
    .transform((data) => ({
      ...data,
      permalink: `/communes/${data.slug}`,
      transparencyScore: Object.values(data.transparencyIndicators).filter(
        (v) => v === 'yes',
      ).length,
      transparencyTotal: Object.keys(data.transparencyIndicators).length,
    })),
});

// ──────────────────────────────────────────────
// Collection: Dossier Cards (transversal impact layer)
// ──────────────────────────────────────────────
const dossierCards = defineCollection({
  name: 'DossierCard',
  pattern: 'dossiers/*.mdx',
  schema: s
    .object({
      title: s.string().max(120),
      slug: s.string(),
      locale: localeEnum,
      dossierType: s.enum(['infrastructure', 'housing', 'regulatory', 'utility', 'security']),
      phase: s.enum(['announced', 'planned', 'in-progress', 'stalled', 'completed', 'cancelled']),
      crisisImpact: s.enum(['blocked', 'delayed', 'reduced', 'unaffected']),
      blockedSince: s.isodate().optional(),
      decisionLevel: s.enum(['regional', 'communal', 'federal', 'mixed']),
      summary: s.string().max(500),
      estimatedBudget: s.string().optional(),
      estimatedCostOfInaction: s.string().optional(),
      stakeholders: s.array(s.string()).default([]),
      relatedDomains: s
        .array(s.enum(['budget', 'mobility', 'housing', 'employment', 'climate', 'social']))
        .default([]),
      relatedSectors: s.array(s.string()).default([]),
      relatedCommunes: s.array(s.string()).default([]),
      relatedFormationEvents: s.array(s.string()).default([]),
      sources: s.array(sourceSchema),
      metrics: s.array(metricSchema).default([]),
      alerts: s
        .array(
          s.object({
            label: s.string(),
            severity: s.enum(['info', 'warning', 'critical']),
            date: s.isodate(),
          }),
        )
        .default([]),
      confidenceLevel: s.enum(['official', 'estimated', 'unconfirmed']),
      dprCommitment: s.string().optional(),
      lastModified: s.isodate(),
      draft: s.boolean().default(false),
      content: s.mdx(),
    })
    .transform((data) => ({
      ...data,
      permalink: `/dossiers/${data.slug}`,
    })),
});

// ──────────────────────────────────────────────
// Collection: Comparison Cards (V1 — schema ready, 0 content)
// ──────────────────────────────────────────────
const comparisonCards = defineCollection({
  name: 'ComparisonCard',
  pattern: 'comparison-cards/*.mdx',
  schema: s
    .object({
      title: s.string().max(120),
      slug: s.string(),
      locale: localeEnum,
      comparisonType: s.enum(['intra-belgian', 'international']),
      entities: s.array(
        s.object({
          name: s.string(),
          code: s.string(),
        }),
      ),
      indicator: s.string(),
      sourceDataset: s.object({
        name: s.string(),
        url: s.string().url(),
        code: s.string().optional(),
      }),
      methodology: s.string(),
      dataPoints: s
        .array(
          s.object({
            entity: s.string(),
            value: s.string(),
            date: s.isodate(),
          }),
        )
        .default([]),
      caveat: s.string().optional(),
      draft: s.boolean().default(false),
      lastModified: s.isodate(),
      content: s.mdx(),
    })
    .transform((data) => ({
      ...data,
      permalink: `/comparisons/${data.slug}`,
    })),
});

export default defineConfig({
  root: 'content',
  output: {
    data: '.velite',
    assets: 'public/static',
    base: '/static/',
    name: '[name]-[hash:6].[ext]',
    clean: true,
  },
  collections: {
    domainCards,
    solutionCards,
    formationRounds,
    formationEvents,
    glossaryTerms,
    verifications,
    sectorCards,
    comparisonCards,
    communeCards,
    dossierCards,
  },
});
