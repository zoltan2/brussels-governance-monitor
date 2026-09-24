import { defineCollection, defineConfig, s } from 'velite';

const localeEnum = s.enum(['fr', 'nl', 'en', 'de']);

// ──────────────────────────────────────────────
// Date de dernière vérification (dossiers et fiches domaine)
// ──────────────────────────────────────────────
//
// `lastVerified` ATTESTE qu'une personne a relu, ce jour-là, les faits de la
// fiche contre leurs sources, QUE LE TEXTE AIT CHANGÉ OU NON. Il se distingue de :
//   - `lastModified` : dernier changement du texte. Une fiche revérifiée sans
//     changement garde son `lastModified` ; une fiche modifiée n'est pas pour
//     autant vérifiée. Les deux dates ne se déduisent pas l'une de l'autre.
//   - `summaryReviewed` / `faqReviewed` : relecture du chapeau ou de la FAQ,
//     pas des faits de toute la fiche.
//
// ⚑ Une attestation ne se tamponne pas : jamais posée en masse, jamais
// remplie par un script, jamais recopiée de `lastModified`. Absente = non
// affichée (aucune date inventée). Aucune fiche n'a été pré-remplie à
// l'introduction du champ (24/09/2026).
//
// `verificationIntervalDays` (facultatif) : nombre de jours au terme duquel la
// fiche doit être revérifiée. Sans lui, aucune échéance n'est calculée.
// L'échéance dépassée est signalée à l'éditeur seul (content-lint
// scripts/content-lint/verification-overdue.ts et /admin/relecture), jamais
// au public, et ne bloque jamais la CI. Règle : src/lib/verification-due.ts.
//
// Jour strict `AAAA-MM-JJ` en chaîne, PAS `s.isodate()` : celui-ci rend un
// horodatage complet (voir src/lib/velite-date.ts) et plante sur un jour
// illisible. Velite ne bloque pas sur une erreur de schéma : le lint
// ci-dessus, lui, échoue sur une valeur illisible ou future.
const lastVerifiedField = s
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'lastVerified : jour attendu au format AAAA-MM-JJ')
  // Jamais `toISOString()` sur une date invalide : il lève au lieu de refuser.
  .refine((v) => {
    const ms = Date.parse(`${v}T00:00:00Z`);
    return !Number.isNaN(ms) && new Date(ms).toISOString().slice(0, 10) === v;
  }, 'lastVerified : ce jour n’existe pas')
  .optional();
const verificationIntervalDaysField = s.number().int().positive().max(730).optional();

const sourceSchema = s.object({
  label: s.string(),
  url: s.string().url(),
  accessedAt: s.isodate(),
});

// Source in a proof chain — used for the "narrative" tab of a proof drawer.
// `type` is rendered by the React component as the corresponding CSS class:
//   'primary'   → .proof-tag.primaire   (vert  — source législative ou données officielles)
//   'analysis'  → .proof-tag.analyse    (bleu  — analyse sectorielle)
//   'relay'     → .proof-tag.relaye     (violet — presse relayant une info primaire)
//   'contested' → .proof-tag.conteste   (rose  — information sous litige)
// Color is applied by the rendering component, not stored here.
const proofSourceSchema = s.object({
  label: s.string(),
  url: s.string().url(),
  type: s.enum(['primary', 'analysis', 'relay', 'contested']),
  description: s.string().optional(),
  accessedAt: s.isodate().optional(),
});

// Revision entry — used for the "historique" tab of a proof drawer.
// CSS class mapping rendered by the component:
//   'initial'  → .hb-ajout    (teal   — ajout initial du claim)
//   'update'   → .hb-maj      (bleu   — révision factuelle, contenu changé)
//   'alert'    → .hb-alerte   (rose   — événement de litige ou contestation)
//   'expected' → .hb-attendu  (violet — mise à jour attendue NON arrivée à temps, rare ;
//                                       pour une mise à jour future "live", utiliser le champ
//                                       `nextUpdate` de la métrique, pas une revisions[] manuelle)
const revisionSchema = s.object({
  date: s.isodate(),
  badge: s.enum(['initial', 'update', 'alert', 'expected']),
  title: s.string(),
  description: s.string(),
  oldRobustness: s.number().optional(),
  newRobustness: s.number().optional(),
});

// Collection-level helper — enforces unique `id` values within a single document's
// metrics array. Called by `.refine()` on each consumer collection (domainCards.metrics,
// dossierCards.metrics, communeCards.keyFigures). Without this, two metrics sharing an
// `id` would silently route Ask BGM and shareable URLs to the first DOM match.
const refineUniqueMetricIds = (metrics: Array<{ id?: string }>) => {
  const ids = metrics.map((m) => m.id).filter((id): id is string => !!id);
  return new Set(ids).size === ids.length;
};

const metricSchema = s
  .object({
    label: s.string(),
    value: s.string(),
    unit: s.string().optional(),
    // `source` is OPTIONAL in v2: required only when `id` is absent (legacy metric).
    // For instrumented metrics (with `id`), the canonical primary source lives in
    // `proofSources[i]` where type === 'primary' (enforced by refine 2).
    source: s.string().optional(),
    url: s.string().url().optional(),
    date: s.isodate(),
    // ── Proof-drawer instrumentation ──
    // `id` = stable claim ID, used as data-proof="{id}" in the rendered HTML
    // and as key in the Ask BGM auditMapping. Convention: kebab-case, ASCII, ≤40 chars,
    // unique within a single document (enforced by refineUniqueMetricIds at collection level).
    id: s.string().optional(),
    // `claim` = short, self-contained affirmation displayed in the robustness bar of the
    // proof drawer (distinct from `label`, which is a column-style label).
    claim: s.string().optional(),
    /**
     * Robustness score 0-100 for the proof drawer.
     *
     * PRECEDENCE RULE: if `robustness` is provided explicitly by the editor, the
     * component MUST use it as-is, without recalculating. The explicit value always
     * wins over derivation. Use case: editorial decisions argued from a specific
     * institutional event (e.g. UVCW arrêt 25 janvier justifies 55% independent of
     * the formula).
     *
     * If OMITTED, the component derives the value via the indicative formula:
     *   base = { stable: 85, confirmed_declared: 80, projection_pending: 60, contested: 45 }[proofStatus] ?? 60
     *   + 5 per `proofSources` entry of type 'primary' (cap +10)
     *   - 10 if `proofSources` contains at least one entry of type 'contested'
     *   - 5 if `bgmAlert === true`
     *   clamped to [0, 100]
     *
     * No min/max constraint at the schema level — the component handles clamping.
     * (A `.refine()` on 0-100 may be added later if drift is observed.)
     */
    robustness: s.number().optional(),
    proofStatus: s.enum(['stable', 'confirmed_declared', 'projection_pending', 'contested']).optional(),
    bgmAlert: s.boolean().default(false),
    /**
     * Text displayed by the Pulse banner and chapter dot when `bgmAlert: true`.
     * REQUIRED whenever `bgmAlert: true` (enforced by refine 5 — no silent alerts).
     */
    alertText: s.string().optional(),
    /**
     * Free-form pointer to the next expected update (e.g. "indicators.be T2 2026").
     *
     * RENDERING CONVENTION (component-side, no Velite build-time transform):
     * - The editor writes ONLY `nextUpdate` to signal an expected forthcoming update.
     * - The React component reads `nextUpdate` and renders a dedicated `hb-attendu`
     *   tile at the head/tail of the `revisions[]` timeline. This tile is NOT in
     *   the array.
     * - The editor MUST NOT also write a manual `revisions[].badge: 'expected'` entry
     *   for the same information (would cause double display). The `expected` badge
     *   in `revisions[]` is reserved for past expected updates that DID NOT arrive
     *   on time and need an explicit historical record (rare).
     */
    nextUpdate: s.string().optional(),
    proofSources: s.array(proofSourceSchema).default([]),
    revisions: s.array(revisionSchema).default([]),
  })
  // Refine 1 — `claim` required when `id` is provided
  .refine((m) => !m.id || !!m.claim, {
    message: '`claim` is required when `id` is provided',
    path: ['claim'],
  })
  // Refine 2 — `proofSources` must contain at least one primary entry when `id` is provided
  .refine((m) => !m.id || m.proofSources.some((src) => src.type === 'primary'), {
    message: 'When `id` is provided, `proofSources` must contain at least one entry of type "primary"',
    path: ['proofSources'],
  })
  // Refine 3 — `source` required for legacy (non-instrumented) metrics
  .refine((m) => !!m.id || !!m.source, {
    message: '`source` is required for non-instrumented metrics (i.e. when `id` is not provided)',
    path: ['source'],
  })
  // Refine 4 — symmetric: `id` required when `proofSources` is non-empty
  // (no orphan proof chains: a chain must be addressable by Ask BGM and shareable via URL hash)
  .refine((m) => m.proofSources.length === 0 || !!m.id, {
    message: '`id` is required when `proofSources` is non-empty (no orphan proof chains)',
    path: ['id'],
  })
  // Refine 5 — `alertText` required when `bgmAlert: true` (no silent alerts in BGM)
  .refine((m) => !m.bgmAlert || !!m.alertText, {
    message: '`alertText` is required when `bgmAlert: true` (silent alerts forbidden by BGM credibility policy)',
    path: ['alertText'],
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
      // Titre et description réservés aux moteurs de recherche. Google coupe le
      // <title> vers 60 caractères et la description vers 155. Facultatifs :
      // sans eux, la page garde `title` (suffixé « | BGM ») et son résumé. Le H1
      // reste `title`, qui peut donc rester long et énumératif.
      //
      // Étendus à cette collection le 21/09/2026 : elle n'avait aucun moyen de
      // piloter son titre de recherche, alors que le lint de longueur de titre
      // (scripts/content-lint/title-length.ts) désigne `seoTitle` comme la
      // porte de sortie. Les 44 fiches secteur, toutes hors budget, en étaient
      // les premières privées.
      seoTitle: s.string().max(60).optional(),
      seoDescription: s.string().max(155).optional(),
      slug: s.string(),
      locale: localeEnum,
      domain: s.enum(['budget', 'mobility', 'housing', 'employment', 'climate', 'social', 'security', 'economy', 'cleanliness', 'institutional', 'urban-planning', 'digital', 'education']),
      status: s.enum(['blocked', 'delayed', 'ongoing', 'resolved']),
      blockedSince: s.isodate().optional(),
      summary: s.string().max(500),
      // Date de dernière relecture du chapeau `summary`. Contrôlée par
      // scripts/content-lint/summary-freshness.ts : au-delà de nonante jours
      // d'écart avec lastModified, une PR qui touche la fiche échoue. Optionnel
      // au schéma pour ne pas casser une fiche en cours de rédaction ; c'est le
      // lint, pas Velite, qui traite l'absence comme une dette.
      summaryReviewed: s.isodate().optional(),
      // Date de relecture de la FAQ, exigée à chaque republication par
      // scripts/content-lint/faq-check.ts. Voir src/lib/faq-review.ts.
      faqReviewed: s.isodate().optional(),
      // Dernière vérification des faits contre les sources. Voir lastVerifiedField.
      lastVerified: lastVerifiedField,
      verificationIntervalDays: verificationIntervalDaysField,
      sectors: s.array(s.string()).default([]),
      sources: s.array(sourceSchema),
      confidenceLevel: s.enum(['official', 'estimated', 'unconfirmed']),
      metrics: s.array(metricSchema).default([]).refine(refineUniqueMetricIds, {
        message: 'Metric `id` values must be unique within a single document',
      }),
      faq: s
        .array(
          s.object({
            q: s.string().max(150),
            a: s.string().max(1000),
            sources: s.array(sourceSchema).default([]),
          }),
        )
        .default([]),
      lastModified: s.isodate(),
      changeType: s.enum(['new', 'updated', 'status-change', 'data-refresh']).optional(),
      changeSummary: s.string().optional(),
      changeSummaryDate: s.isodate().optional(),
      digestHeadline: s.string().max(120).optional(),
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
      changeType: s.enum(['added', 'updated', 'corrected', 'removed']).optional(),
      changeSummary: s.string().optional(),
      changeSummaryDate: s.isodate().optional(),
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
      result: s.enum(['ongoing', 'recommendation', 'stalled', 'failed', 'success']),
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
      chapter: s.number().optional(), // links to GovernmentChapter.number (post-formation)
      eventType: s.enum([
        'designation',
        'consultation',
        'proposal',
        'blockage',
        'resignation',
        'citizen',
        'budget',
        'initiative',
        'agreement',
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
// Collection: Government Chapters (post-formation mandate tracking)
// ──────────────────────────────────────────────
const governmentChapters = defineCollection({
  name: 'GovernmentChapter',
  pattern: 'government-chapters/*.mdx',
  schema: s
    .object({
      number: s.number(),
      label: s.string().max(120),
      slug: s.string(),
      locale: localeEnum,
      startDate: s.isodate(),
      endDate: s.isodate().optional(),
      status: s.enum(['ongoing', 'closed']),
      summary: s.string().max(500),
      lastModified: s.isodate(),
      content: s.mdx(),
    })
    .transform((data) => ({
      ...data,
      permalink: `/timeline#chapter-${data.number}`,
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
      // `s.isodate()` rend un horodatage complet : sans la coupe, ce permalink
      // valait `/verifications/budget-2026-02-08T00:00:00.000Z`. Il n'a jamais
      // ete une URL utilisable, ce qui est reste invisible tant qu'aucune route
      // ne servait la collection (corrige le 21/09/2026).
      permalink: `/verifications/${data.cardSlug}-${String(data.date).slice(0, 10)}`,
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
      // Titre et description réservés aux moteurs de recherche. Google coupe le
      // <title> vers 60 caractères et la description vers 155. Facultatifs :
      // sans eux, la page garde `title` (suffixé « | BGM ») et son résumé. Le H1
      // reste `title`, qui peut donc rester long et énumératif.
      //
      // Étendus à cette collection le 21/09/2026 : elle n'avait aucun moyen de
      // piloter son titre de recherche, alors que le lint de longueur de titre
      // (scripts/content-lint/title-length.ts) désigne `seoTitle` comme la
      // porte de sortie. Les 44 fiches secteur, toutes hors budget, en étaient
      // les premières privées.
      seoTitle: s.string().max(60).optional(),
      seoDescription: s.string().max(155).optional(),
      slug: s.string(),
      locale: localeEnum,
      parentDomain: s.enum(['budget', 'mobility', 'housing', 'employment', 'climate', 'social', 'security', 'economy', 'cleanliness', 'institutional', 'urban-planning', 'digital', 'education']),
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
      changeType: s.enum(['added', 'updated', 'corrected', 'removed']).optional(),
      changeSummary: s.string().optional(),
      changeSummaryDate: s.isodate().optional(),
      digestHeadline: s.string().max(120).optional(),
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
      // Titre de recherche, rendu sans suffixe (voir searchMeta). Étendu à
      // cette collection le 24/09/2026 : le `title` porte le nom de la commune
      // avant le « : », que la meta description et le digest découpent. Le
      // raccourcir aurait cassé ce découpage ; `seoTitle` ne touche qu'au <title>.
      seoTitle: s.string().max(60).optional(),
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
        .array(s.enum(['budget', 'mobility', 'housing', 'employment', 'climate', 'social', 'security', 'economy', 'cleanliness', 'institutional', 'urban-planning', 'digital', 'education']))
        .default([]),
      relatedSectors: s.array(s.string()).default([]),
      sources: s.array(communeSourceSchema),
      keyFigures: s.array(metricSchema).default([]).refine(refineUniqueMetricIds, {
        message: 'keyFigures `id` values must be unique within a single commune card',
      }),
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
      changeType: s.enum(['added', 'updated', 'corrected', 'removed']).optional(),
      changeSummary: s.string().optional(),
      changeSummaryDate: s.isodate().optional(),
      digestHeadline: s.string().optional(),
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
// Budget (dossier cards) — three accepted shapes
// ──────────────────────────────────────────────
// 1. string        — one short amount: "~5,2 milliards EUR (projet suspendu)"
// 2. BudgetLine[]  — several budget lines, rendered as a financial table
// 3. { status }    — nothing published; the opacity IS the information
//
// The string form stays valid on purpose: it is the natural shape for a single
// amount, and it keeps a fiche written without knowledge of the structured form
// from breaking the build. Rendering is handled by `src/components/budget-table.tsx`;
// list views derive their one-liner via `budgetSummary()` in `src/lib/budget.ts`,
// so a summary can never drift from the detail shown on the fiche.
const budgetLineSchema = s.object({
  label: s.string().max(80),
  value: s.string().max(60),
  note: s.string().max(240).optional(),
  confidence: s.enum(['official', 'estimated', 'unconfirmed']).default('official'),
});

const budgetSchema = s.union([
  s.string(),
  s.array(budgetLineSchema).min(1),
  s.object({
    status: s.enum([
      'unpublished',
      'not-communicated',
      'not-quantified',
      'not-consolidated',
      'not-applicable',
    ]),
    reason: s.string().max(300).optional(),
  }),
]);

// ──────────────────────────────────────────────
// Collection: Dossier Cards (transversal impact layer)
// ──────────────────────────────────────────────
const dossierCards = defineCollection({
  name: 'DossierCard',
  pattern: 'dossiers/*.mdx',
  schema: s
    .object({
      title: s.string().max(120),
      shortTitle: s.string().max(50).optional(),
      // Titre et description réservés aux moteurs de recherche. Google coupe le
      // <title> vers 60 caractères et la description vers 155 : un titre de
      // dossier de 90 caractères y perd sa fin. Facultatifs : sans eux, la page
      // garde `title` (suffixé « | BGM ») et `summary`. Le H1 reste `title`.
      seoTitle: s.string().max(60).optional(),
      seoDescription: s.string().max(155).optional(),
      slug: s.string(),
      // Slugs localisés pour SEO per-locale (spec 2026-05-03). Optionnel,
      // rétro-compat : si absent pour une locale, fallback sur `slug` global.
      // Convention : ASCII strict `[a-z0-9-]`, ≤ 60 chars. Unicité par locale
      // garantie par `refineUniqueLocalizedSlugs` au niveau collection.
      //
      // ⚠ MANDATORY (mémoire feedback_localized_slugs_redirect_pairing.md) :
      // toute modification d'un slug localisé qui change l'URL effective
      // DOIT être accompagnée d'une entrée 301 correspondante dans
      // `src/lib/redirects-301.ts` dans le même commit. Sinon les URLs
      // externes (bookmarks, partages LinkedIn/X, citations presse) qui
      // pointent vers l'ancienne URL renverront 404 silencieusement.
      // Vérifié en CI par scripts/content-lint/slug-redirects.ts, qui donne
      // l'entrée exacte à ajouter. Un slug localisé doit figurer à l'identique
      // sur la carte FR ET sur la carte de sa langue (sinon la page répond 404).
      localizedSlugs: s
        .object({
          fr: s.string().optional(),
          nl: s.string().optional(),
          en: s.string().optional(),
          de: s.string().optional(),
        })
        .optional(),
      locale: localeEnum,
      dossierType: s.enum(['infrastructure', 'housing', 'regulatory', 'utility', 'security', 'social', 'cultural']),
      phase: s.enum(['announced', 'planned', 'in-progress', 'stalled', 'completed', 'cancelled']),
      crisisImpact: s.enum(['blocked', 'delayed', 'reduced', 'unaffected', 'resolved']),
      blockedSince: s.isodate().optional(),
      decisionLevel: s.enum(['regional', 'communal', 'federal', 'mixed']),
      summary: s.string().max(500),
      // Date de dernière relecture du chapeau `summary`. Contrôlée par
      // scripts/content-lint/summary-freshness.ts : au-delà de nonante jours
      // d'écart avec lastModified, une PR qui touche la fiche échoue. Optionnel
      // au schéma pour ne pas casser une fiche en cours de rédaction ; c'est le
      // lint, pas Velite, qui traite l'absence comme une dette.
      summaryReviewed: s.isodate().optional(),
      // Date de relecture de la FAQ, exigée à chaque republication par
      // scripts/content-lint/faq-check.ts. Voir src/lib/faq-review.ts.
      faqReviewed: s.isodate().optional(),
      // Dernière vérification des faits contre les sources. Voir lastVerifiedField.
      lastVerified: lastVerifiedField,
      verificationIntervalDays: verificationIntervalDaysField,
      estimatedBudget: budgetSchema.optional(),
      estimatedCostOfInaction: budgetSchema.optional(),
      stakeholders: s.array(s.string()).default([]),
      relatedDomains: s
        .array(s.enum(['budget', 'mobility', 'housing', 'employment', 'climate', 'social', 'security', 'economy', 'cleanliness', 'institutional', 'urban-planning', 'digital', 'education']))
        .default([]),
      relatedSectors: s.array(s.string()).default([]),
      relatedCommunes: s.array(s.string()).default([]),
      relatedFormationEvents: s.array(s.string()).default([]),
      // Slugs canoniques des dossiers à proposer sous le texte. Facultatif : s'il
      // est présent, il remplace la sélection automatique (dossiers qui partagent
      // un domaine). Voir src/lib/related-dossiers.ts.
      relatedDossiers: s.array(s.string()).optional(),
      sources: s.array(sourceSchema),
      metrics: s.array(metricSchema).default([]).refine(refineUniqueMetricIds, {
        message: 'Metric `id` values must be unique within a single dossier',
      }),
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
      faq: s
        .array(
          s.object({
            q: s.string().max(150),
            a: s.string().max(1000),
            sources: s.array(sourceSchema).default([]),
          }),
        )
        .default([]),
      changeType: s.enum(['added', 'updated', 'corrected', 'removed']).optional(),
      changeSummary: s.string().optional(),
      changeSummaryDate: s.isodate().optional(),
      digestHeadline: s.string().max(120).optional(),
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
// Magazine block schema (used in digestEntries)
// ──────────────────────────────────────────────
const magazineItemSchema = s.object({
  category: s.string().optional(),
  headline: s.string().min(1).max(80),
  path: s.string().optional(),
  // Le grand chiffre de la carte. La borne haute est un garde-fou d'affichage,
  // pas une règle éditoriale : elle doit laisser passer une valeur légitime
  // comme « 131 000 000 EUR » sans faire tomber le build du site.
  stat: s.string().min(1).max(32),
  stat_label: s.string().min(1).max(60),
  pill: s.string().optional(),
  description: s.string().min(100).max(800),
  howto: s.string().min(80).max(800),
});

const magazineSchema = s.object({
  tagline: s.string().min(1).max(120),
  closing_line: s.string().min(1).max(120),
  // ⚠️ Contrainte DURE : un dépassement fait échouer `npm run build`, donc la CI
  // et le déploiement du site entier, pas seulement le magazine. Une semaine
  // dense peut légitimement porter treize, quinze ou vingt items : le plafond
  // est une sécurité contre un bloc corrompu, jamais une limite éditoriale.
  items: s.array(magazineItemSchema).min(3).max(30),
});

// ──────────────────────────────────────────────
// Collection: Digest Entries (weekly multilingual digest pages)
// ──────────────────────────────────────────────
const digestEntries = defineCollection({
  name: 'DigestEntry',
  pattern: 'digest/*.mdx',
  schema: s
    .object({
      week: s.string(), // e.g. "2026-w07"
      lang: s.string(), // e.g. "fr", "ar", "sw" — NOT limited to 4 locales
      title: s.string().max(200),
      auto_translated: s.boolean().default(false),
      redirect_lang: s.enum(['fr', 'nl', 'en', 'de']),
      generated_at: s.isodate(),
      magazine: magazineSchema.optional(),
      // Plain-text opening of the edition, for the meta description.
      excerpt: s.excerpt({ length: 320 }),
      content: s.mdx(),
    })
    .transform((data) => {
      const [year, weekNum] = data.week.split('-w');
      return {
        ...data,
        year,
        weekNum: `w${weekNum}`,
        permalink: `/digest/${data.lang}/${year}/w${weekNum}`,
      };
    }),
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
      // Titre et description réservés aux moteurs de recherche. Google coupe le
      // <title> vers 60 caractères et la description vers 155. Facultatifs :
      // sans eux, la page garde `title` (suffixé « | BGM ») et son résumé. Le H1
      // reste `title`, qui peut donc rester long et énumératif.
      //
      // Étendus à cette collection le 21/09/2026 : elle n'avait aucun moyen de
      // piloter son titre de recherche, alors que le lint de longueur de titre
      // (scripts/content-lint/title-length.ts) désigne `seoTitle` comme la
      // porte de sortie. Les 44 fiches secteur, toutes hors budget, en étaient
      // les premières privées.
      seoTitle: s.string().max(60).optional(),
      seoDescription: s.string().max(155).optional(),
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
      // Rendered as the schema.org Dataset description: Google requires 50-5000 chars.
      methodology: s.string().min(50).max(5000),
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
      changeType: s.enum(['added', 'updated', 'corrected', 'removed']).optional(),
      changeSummary: s.string().optional(),
      changeSummaryDate: s.isodate().optional(),
      content: s.mdx(),
    })
    .transform((data) => ({
      ...data,
      permalink: `/comparisons/${data.slug}`,
    })),
});

// ──────────────────────────────────────────────
// Collection: Archive Pages (frozen historical content)
// ──────────────────────────────────────────────
const archivePages = defineCollection({
  name: 'ArchivePage',
  pattern: 'archive-pages/*.mdx',
  schema: s
    .object({
      title: s.string().max(200),
      // Titre de recherche, rendu sans suffixe (voir searchMeta). Étendu à
      // cette collection le 24/09/2026, dernière à ne pas l'avoir.
      seoTitle: s.string().max(60).optional(),
      slug: s.string(),
      locale: localeEnum,
      summary: s.string().max(500),
      period: s.string(),
      lastModified: s.isodate(),
      content: s.mdx(),
    })
    .transform((data) => ({
      ...data,
      permalink: `/archives/${data.slug}`,
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
    governmentChapters,
    glossaryTerms,
    verifications,
    sectorCards,
    comparisonCards,
    communeCards,
    dossierCards,
    digestEntries,
    archivePages,
  },
});
