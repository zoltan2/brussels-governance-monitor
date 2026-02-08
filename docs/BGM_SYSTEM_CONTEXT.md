# Brussels Governance Monitor — System Context

*Document de référence consolidé pour analyse architecturale*
*Généré le 8 février 2026*

---

## Table des matières

1. [System Design (architecture produit)](#1-system-design)
2. [Schéma Velite (7 collections)](#2-schéma-velite)
3. [Exemples de cartes domaine](#3-exemples-de-cartes-domaine)
4. [Exemple de formation event](#4-exemple-de-formation-event)

---

## 1. System Design

### 1.1 Les trois entités fondamentales

Le modèle éditorial de BGM repose sur trois entités distinctes, irréductibles les unes aux autres, et dont la combinaison forme la proposition de valeur unique du projet.

**La Carte (Card)**

Une Carte représente un domaine d'impact politique persistant. Ce n'est ni un article, ni un sujet d'actualité, ni un dossier thématique classique. C'est un objet éditorial vivant qui incarne une question structurelle affectée par la crise gouvernementale bruxelloise. Actuellement, sept Cartes existent : quatre Cartes-domaine (Budget, Mobilité, Emploi, Logement) et trois Cartes-solution (Coalition, Gouvernement d'urgence, Nouvelles élections).

Chaque Carte possède les propriétés suivantes :
- Un identifiant stable dans le temps (slug immuable servant de référence canonique)
- Un titre et une description localisés (FR, NL, EN, DE)
- Un état de gravité ou d'avancement (qui reflète la situation actuelle, pas une opinion)
- Une date de dernière mise à jour vérifiée
- Un indicateur de fraîcheur (temps écoulé depuis la dernière vérification éditoriale)
- Un historique complet de toutes ses évolutions

La Carte est l'unité fondamentale de navigation. L'utilisateur ne cherche pas "les dernières nouvelles" — il cherche "où en est le Budget" ou "que se passe-t-il côté Coalition". Cette approche centrée sur l'état plutôt que sur le flux est le choix architectural le plus structurant du projet.

**L'Événement / Mise à jour (Event/Update)**

Un Événement est un fait daté qui modifie l'état d'une ou plusieurs Cartes. Il représente un changement observable, sourcé, et éditorialement validé. Un Événement n'est jamais orphelin : il est toujours rattaché à au moins une Carte.

Propriétés d'un Événement :
- Date de survenance (quand le fait s'est produit dans le monde réel)
- Date de publication sur BGM (quand BGM l'a intégré)
- Type : factuel, procédural, déclaratif, analytique
- Résumé localisé (court, factuel, sans adjectif de jugement)
- Impact sur la Carte : l'Événement doit expliciter en quoi il change ou confirme l'état de la Carte
- Sources rattachées (au moins une source primaire obligatoire)
- Statut éditorial : brouillon, publié, corrigé, rétracté

Un Événement peut être rattaché à plusieurs Cartes (multi-rattachement = matérialise les interdépendances).

**La Vérification (Verification)**

La Vérification représente un acte éditorial explicite : "nous avons vérifié l'état de cette Carte à cette date, et voici notre constat." Une Vérification peut conclure que rien n'a changé — et cette information est elle-même précieuse.

Propriétés d'une Vérification :
- Date de vérification
- Carte(s) concernée(s)
- Constat : changement détecté (lié à un Événement) ou absence de changement (silence confirmé)
- Sources consultées (y compris celles qui n'ont rien révélé)
- Prochaine vérification prévue (engagement de fraîcheur)

La Vérification résout un problème fondamental : le silence ambigu. Quand un média ne publie rien sur un sujet, le lecteur ne sait pas si c'est parce que rien ne s'est passé ou parce que le média n'a pas regardé. BGM, en publiant ses Vérifications, rend son silence informatif.

### 1.2 Pourquoi ce modèle surpasse un système de "news" classique

- **L'état prime sur le flux** : le lecteur voit immédiatement "où on en est" sans reconstituer une chronologie
- **Le silence est informatif** : "rien de nouveau" est une information publiée, datée, sourcée
- **Multi-dimensionnalité** : un Événement lié à plusieurs Cartes rend visible les interdépendances
- **Vérifiabilité intégrée** : chaque affirmation est traçable jusqu'à ses Sources
- **Exportabilité structurée** : données exportables en CSV, JSON pour réutilisation

### 1.3 Système de sources (hiérarchie de confiance)

**Par rang :**
- Source primaire (rang 1) : document original, déclaration directe, donnée brute
- Source secondaire (rang 2) : reprise journalistique ou analytique
- Source tertiaire (rang 3) : synthèse sans accès direct aux sources primaires (jamais suffisante seule)

**Niveaux de confiance :**
- **Niveau A — Confiance élevée** : document officiel publié (Moniteur belge, compte rendu parlementaire), donnée institutionnelle primaire
- **Niveau B — Confiance standard** : article de média de référence avec sources identifiées, communiqué officiel, rapport académique
- **Niveau C — Confiance conditionnelle** : article sans source primaire, déclaration sur réseaux sociaux — nécessite corroboration
- **Niveau D — Non qualifié** : source anonyme non corroborée, rumeur — jamais suffisante pour publication

**Règle de publication** : un Événement ne peut être publié que s'il est appuyé par au moins une source de niveau A ou B.

### 1.4 Workflow éditorial (pipeline 6 étapes)

1. **Détection** — veille systématique (Parlement, Moniteur, médias, alertes RSS, signalements)
2. **Qualification de la source** — rang, corroboration, traçabilité
3. **Validation éditoriale** — rédaction FR+NL, rattachement aux Cartes, conformité charte
4. **Publication** — commit Git → build Velite → deploy Vercel → notifications
5. **Gestion de la fraîcheur** — engagement de vérification (3j/7j/14j selon volatilité)
6. **Distribution** — emails, RSS, données structurées, export CSV/JSON

### 1.5 SLA éditorial

- Événement majeur : publication dans les 24h après qualification
- Événement standard : publication dans les 72h
- Complétude linguistique : FR+NL obligatoires, EN dans les 48h, DE en fallback vers FR
- Corrections : mineure (discrète), substantielle (visible + notification), rétractation (marquée, jamais supprimée)

### 1.6 MVP vs V1

**MVP (actuel) :**
- Contenu statique via Velite + MDX
- 7 collections Velite avec validation Zod
- Email via Resend + double opt-in
- Recherche via Pagefind (statique)
- Déploiement Vercel CDG1

**V1 (futur) :**
- Interface d'administration (remplacement des commits Git)
- Backend (SQLite/PostgreSQL) pour préférences utilisateur, feedback, audit
- Recherche indexée (Meilisearch)
- API publique en lecture seule
- Timeline comparative inter-Cartes

### 1.7 Gaps critiques identifiés

- Absence de collection Velite pour les Vérifications
- Absence de liens cross-collection (FormationEvent ↔ DomainCard)
- Absence de journal d'audit éditorial formalisé
- Absence de plan de continuité éditoriale
- Absence de validation externe de la méthodologie

---

## 2. Schéma Velite

7 collections définies dans `velite.config.ts` :

```typescript
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
// 1. Domain Cards (Budget, Mobility, Housing, Employment, Climate, Social)
// ──────────────────────────────────────────────
const domainCards = defineCollection({
  name: 'DomainCard',
  pattern: 'domain-cards/*.mdx',
  schema: s.object({
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
  }).transform((data) => ({ ...data, permalink: `/domains/${data.slug}` })),
});

// ──────────────────────────────────────────────
// 2. Solution Cards (political, constitutional, parliamentary)
// ──────────────────────────────────────────────
const solutionCards = defineCollection({
  name: 'SolutionCard',
  pattern: 'solution-cards/*.mdx',
  schema: s.object({
    title: s.string().max(120),
    slug: s.string(),
    locale: localeEnum,
    solutionType: s.enum(['political', 'constitutional', 'parliamentary']),
    feasibility: s.enum(['high', 'medium', 'low', 'very-low', 'near-zero']),
    timeline: s.enum(['immediate', 'weeks', 'months', 'years']),
    precedent: s.object({
      description: s.string(),
      country: s.string(),
      year: s.number(),
    }).optional(),
    legalBasis: s.string().optional(),
    mechanism: s.string(),
    risks: s.array(s.string()).default([]),
    whoCanTrigger: s.string(),
    summaryFalc: s.string().max(200).optional(),
    draft: s.boolean().default(false),
    lastModified: s.isodate(),
    content: s.mdx(),
  }).transform((data) => ({ ...data, permalink: `/solutions/${data.slug}` })),
});

// ──────────────────────────────────────────────
// 3. Formation Rounds (timeline macro-structure, 6 rounds)
// ──────────────────────────────────────────────
const formationRounds = defineCollection({
  name: 'FormationRound',
  pattern: 'formation-rounds/*.mdx',
  schema: s.object({
    number: s.number(),
    label: s.string().max(120),
    slug: s.string(),
    locale: localeEnum,
    actor: s.string(),          // e.g. "Formateur (MR)", "Informateurs (Les Engagés + Groen)"
    startDate: s.isodate(),
    endDate: s.isodate().optional(), // null if ongoing
    formulaAttempted: s.string(),
    result: s.enum(['ongoing', 'recommendation', 'stalled', 'failed']),
    failureReason: s.string().optional(),
    lastModified: s.isodate(),
    content: s.mdx(),
  }).transform((data) => ({ ...data, permalink: `/timeline#round-${data.number}` })),
});

// ──────────────────────────────────────────────
// 4. Formation Events (timeline detail, 26 events)
// ──────────────────────────────────────────────
const formationEvents = defineCollection({
  name: 'FormationEvent',
  pattern: 'formation-events/*.mdx',
  schema: s.object({
    title: s.string().max(200),
    slug: s.string(),
    locale: localeEnum,
    date: s.isodate(),
    round: s.number(),           // links to FormationRound.number
    eventType: s.enum([
      'designation', 'consultation', 'proposal',
      'blockage', 'resignation', 'citizen', 'budget',
    ]),
    summary: s.string().max(500),
    impact: s.string().optional(),
    sources: s.array(sourceSchema),
    lastModified: s.isodate(),
    content: s.mdx(),
  }).transform((data) => ({ ...data, permalink: `/timeline#event-${data.slug}` })),
});

// ──────────────────────────────────────────────
// 5. Glossary Terms (40+ terms)
// ──────────────────────────────────────────────
const glossaryTerms = defineCollection({
  name: 'GlossaryTerm',
  pattern: 'glossary/*.mdx',
  schema: s.object({
    term: s.string().max(120),
    slug: s.string(),
    locale: localeEnum,
    definition: s.string().max(500),
    category: s.enum(['institution', 'procedure', 'budget', 'political', 'legal', 'bgm']),
    relatedTerms: s.array(s.string()).default([]),
    sources: s.array(sourceSchema).default([]),
    lastModified: s.isodate(),
    content: s.mdx(),
  }).transform((data) => ({ ...data, permalink: `/glossary#${data.slug}` })),
});

// ──────────────────────────────────────────────
// 6. Sector Cards (11 cards — nonprofit, transport, construction, etc.)
// ──────────────────────────────────────────────
const sectorCards = defineCollection({
  name: 'SectorCard',
  pattern: 'sector-cards/*.mdx',
  schema: s.object({
    title: s.string().max(120),
    slug: s.string(),
    locale: localeEnum,
    parentDomain: s.enum(['budget', 'mobility', 'housing', 'employment', 'climate', 'social']),
    sector: s.string(),
    frozenMechanisms: s.array(s.object({
      name: s.string(),
      description: s.string(),
      since: s.isodate().optional(),
    })).default([]),
    activeMechanisms: s.array(s.object({
      name: s.string(),
      description: s.string(),
    })).default([]),
    impactIndicators: s.array(s.object({
      label: s.string(),
      value: s.string(),
      source: s.string(),
      url: s.string().url().optional(),
      frequency: s.string().optional(),
    })).default([]),
    stakeholders: s.array(s.object({
      name: s.string(),
      type: s.enum(['federation', 'agency', 'ngo', 'union']),
      url: s.string().url().optional(),
    })).default([]),
    humanImpact: s.string().optional(),
    draft: s.boolean().default(false),
    lastModified: s.isodate(),
    content: s.mdx(),
  }).transform((data) => ({ ...data, permalink: `/sectors/${data.slug}` })),
});

// ──────────────────────────────────────────────
// 7. Comparison Cards (5 cards — intra-belgian + international)
// ──────────────────────────────────────────────
const comparisonCards = defineCollection({
  name: 'ComparisonCard',
  pattern: 'comparison-cards/*.mdx',
  schema: s.object({
    title: s.string().max(120),
    slug: s.string(),
    locale: localeEnum,
    comparisonType: s.enum(['intra-belgian', 'international']),
    entities: s.array(s.object({
      name: s.string(),
      code: s.string(),
    })),
    indicator: s.string(),
    sourceDataset: s.object({
      name: s.string(),
      url: s.string().url(),
      code: s.string().optional(),
    }),
    methodology: s.string(),
    dataPoints: s.array(s.object({
      entity: s.string(),
      value: s.string(),
      date: s.isodate(),
    })).default([]),
    caveat: s.string().optional(),
    draft: s.boolean().default(false),
    lastModified: s.isodate(),
    content: s.mdx(),
  }).transform((data) => ({ ...data, permalink: `/comparisons/${data.slug}` })),
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
    domainCards,       // 6 domains × 4 locales = 24 MDX files
    solutionCards,     // 6 solutions × 4 locales = 24 MDX files
    formationRounds,   // 6 rounds × 4 locales = 24 MDX files
    formationEvents,   // 26 events × 4 locales = ~104 MDX files
    glossaryTerms,     // 40+ terms × 4 locales = ~160 MDX files
    sectorCards,       // 11 sectors × 4 locales = 44 MDX files
    comparisonCards,   // 5 comparisons × 4 locales = 20 MDX files
  },
});
```

### Statistiques contenu actuel

| Collection | Cards | Locales | Total MDX |
|-----------|-------|---------|-----------|
| domainCards | 6 | FR, NL, EN, DE | 24 |
| solutionCards | 6 | FR, NL, EN, DE | 24 |
| formationRounds | 6 | FR, NL, EN, DE | 24 |
| formationEvents | 26 | FR, NL, EN, DE | ~104 |
| glossaryTerms | 40+ | FR, NL, EN, DE | ~160 |
| sectorCards | 11 | FR, NL, EN, DE | 44 |
| comparisonCards | 5 | FR, NL, EN, DE | 20 |
| **Total** | | | **~400 MDX** |

---

## 3. Exemples de cartes domaine

### 3.1 Carte Budget (FR)

**Fichier :** `content/domain-cards/budget.fr.mdx`

```yaml
---
title: "Budget régional : l'érosion silencieuse"
slug: budget
locale: fr
domain: budget
status: blocked
blockedSince: "2024-06-09"
summary: "Sans nouveau gouvernement, la Région bruxelloise fonctionne en douzièmes provisoires. Pas de nouveau budget, pas de nouveaux investissements. L'inflation érode la valeur réelle des dépenses existantes."
sectors:
  - associatif
  - construction
  - culture
sources:
  - label: "Cour des comptes — 30e Cahier d'observations au Parlement de la Région de Bruxelles-Capitale (nov. 2025)"
    url: "https://www.ccrek.be/fr/publication/30e-cahier-d-observations-adresse-au-parlement-de-la-region-de-bruxelles-capitale"
    accessedAt: "2026-02-06"
  - label: "Cour des comptes — Rapport sur les crédits provisoires jan-mars 2025 (PDF)"
    url: "https://www.ccrek.be/sites/default/files/Docs/2025_02_CreditsProvisoires.pdf"
    accessedAt: "2026-02-06"
  - label: "Ordonnance crédits provisoires jan-mars 2026 — texte légal (Reflex)"
    url: "https://refli.be/fr/lex/2025009753"
    accessedAt: "2026-02-06"
  - label: "IBSA — Focus n°73 : Statistiques publiques et situation budgétaire bruxelloise (juil. 2025)"
    url: "https://ibsa.brussels/sites/default/files/publication/documents/Focus_73_FR.pdf"
    accessedAt: "2026-02-06"
  - label: "Statbel — Indice des prix à la consommation (IPC)"
    url: "https://statbel.fgov.be/fr/themes/prix-la-consommation/indice-des-prix-la-consommation"
    accessedAt: "2026-02-06"
  - label: "BNB — Flux et (dés)équilibres régionaux en Belgique (oct. 2025, PDF)"
    url: "https://www.nbb.be/doc/ts/publications/other/regions/20251023_regions_doc_fr.pdf"
    accessedAt: "2026-02-06"
  - label: "Parlement bruxellois — Site officiel"
    url: "https://www.parlement.brussels/"
    accessedAt: "2026-02-07"
confidenceLevel: official
metrics:
  - label: "Régime budgétaire"
    value: "Douzièmes provisoires"
    source: "Parlement bruxellois"
    date: "2026-01-01"
  - label: "Déficit budgétaire annuel (2025)"
    value: "~1,241"
    unit: "milliard EUR"
    source: "Gouvernement bruxellois (Min. Budget, déc. 2025)"
    date: "2025-12-31"
  - label: "Douzièmes provisoires votés"
    value: "19/12/2024"
    source: "Parlement bruxellois"
    date: "2024-12-19"
  - label: "Perte réelle estimée (inflation cumulée)"
    value: "~6%"
    unit: "sur 2 ans"
    source: "Estimation BGM sur base BNB/Statbel"
    date: "2026-02-01"
  - label: "Nouveaux investissements"
    value: "0"
    unit: "projets lancés"
    source: "Parlement bruxellois"
    date: "2026-02-01"
lastModified: "2026-02-07"
changeType: updated
changeSummary: "Audit métriques : correction label déficit (budgétaire, pas structurel), source, date douzièmes (19/12 pas 20/12)"
summaryFalc: "Bruxelles n'a pas de vrai budget. Le gouvernement ne peut dépenser que ce qu'il dépensait avant. Pas d'argent neuf pour les projets importants."
---
```

**Contenu MDX (body) :**

> ## Qu'est-ce que les douzièmes provisoires ?
> Lorsqu'un gouvernement est en affaires courantes, il ne peut pas faire voter un nouveau budget. Le mécanisme des douzièmes provisoires s'applique : chaque mois, la Région peut dépenser au maximum 1/12e du dernier budget voté. Concrètement : pas de nouvelles dépenses, pas de nouveaux programmes, l'inflation n'est pas compensée.
>
> ## L'impact concret
> - Érosion par l'inflation (~6% cumulé)
> - Investissements gelés (PAD, contrats de gestion, appels à projets)
> - Subsides et conventions non renouvelables

**Sources actuelles (7) :** Cour des comptes (2), Ordonnance légale, IBSA, Statbel, BNB, Parlement bruxellois

---

### 3.2 Carte Mobilité (FR)

**Fichier :** `content/domain-cards/mobility.fr.mdx`

```yaml
---
title: "Mobilité : des projets majeurs en suspens"
slug: mobility
locale: fr
domain: mobility
status: delayed
blockedSince: "2024-06-09"
summary: "Le Metro 3 (ligne Nord-Sud vers Bordet), la rénovation des tunnels, et les nouvelles phases de Good Move sont en attente de décisions politiques. La STIB continue ses opérations courantes."
sectors:
  - transport
  - construction
sources:
  - label: "Bruxelles Mobilité — Projet Metro 3"
    url: "https://be.brussels/fr/transport-mobilite/parking-et-routes/projets/metro-3"
    accessedAt: "2026-02-06"
  - label: "Metro 3 — Site dédié du projet (STIB / Beliris)"
    url: "https://metro3.be/fr/project"
    accessedAt: "2026-02-06"
  - label: "STIB — Metro ligne 3 : travaux en cours"
    url: "https://www.stib-mivb.be/travel/works-and-projects/works-in-progress/metro-line-3"
    accessedAt: "2026-02-06"
  - label: "Good Move — Plan Régional de Mobilité (2020)"
    url: "https://be.brussels/fr/transport-mobilite/enjeux-de-la-mobilite/plan-regional-de-mobilite"
    accessedAt: "2026-02-06"
  - label: "Bruxelles Mobilité — Fermetures et rénovation des tunnels"
    url: "https://be.brussels/fr/transport-mobilite/parking-et-routes/chantiers/fermeture-de-tunnels"
    accessedAt: "2026-02-06"
  - label: "Parlement bruxellois — Recherche questions parlementaires"
    url: "https://www.parlement.brussels/weblex-quest-form/"
    accessedAt: "2026-02-06"
confidenceLevel: official
metrics:
  - label: "Metro 3 (nouvelles phases)"
    value: "Suspendu"
    source: "Bruxelles Mobilité"
    date: "2026-01-01"
  - label: "Tunnels en attente de rénovation"
    value: "3+"
    unit: "tunnels"
    source: "Bruxelles Mobilité"
    date: "2026-01-01"
  - label: "Good Move (nouvelles phases)"
    value: "Gelé"
    source: "Bruxelles Mobilité"
    date: "2026-01-01"
lastModified: "2026-02-06"
summaryFalc: "Les transports publics à Bruxelles continuent de fonctionner. Mais le plan Good Move est en pause et aucun nouveau projet de mobilité ne peut démarrer."
---
```

**Contenu MDX (body) :**

> ## Ce qui est bloqué
> - **Metro 3** : extension vers Bordet nécessite approbation tracé + engagement budgétaire pluriannuel
> - **Tunnels routiers** : Stéphanie, Loi, Bailli — rénovation structurelle nécessite arbitrage budgétaire
> - **Good Move** : déploiement nouvelles mailles gelé
>
> ## Ce qui continue de fonctionner
> - STIB (opérations quotidiennes), Villo, maintenance courante, chantiers déjà approuvés

**Sources actuelles (6) :** Bruxelles Mobilité (2), Metro3.be, STIB, Good Move, Parlement bruxellois

---

### 3.3 Carte Social (FR)

**Fichier :** `content/domain-cards/social.fr.mdx`

```yaml
---
title: "Social : les filets de sécurité sous tension"
slug: social
locale: fr
domain: social
status: blocked
blockedSince: "2024-06-09"
summary: "Les CPAS bruxellois font face à un afflux de demandes lié à la réforme du chômage, les investissements bicommunautaires de la COCOM sont gelés, la politique sans-abri est à l'arrêt et les nouvelles initiatives en santé mentale sont bloquées. Iriscare fonctionne en mode minimal."
sectors:
  - social
  - associatif
sources:
  - label: "Iriscare — Rapport annuel 2024"
    url: "https://www.iriscare.brussels/fr/publications/rapport-annuel"
    accessedAt: "2026-02-07"
  - label: "Observatoire de la Santé et du Social — Baromètre social 2025"
    url: "https://www.ccc-ggc.brussels/fr/observatoire-de-la-sante-et-du-social/publications"
    accessedAt: "2026-02-07"
  - label: "Brulocalis — Impact de la réforme du chômage sur les CPAS bruxellois (PDF)"
    url: "https://brulocalis.brussels/sites/default/files/2025-09/tub-144-fr-web-reforme-chomage-impact-cpas-bruxellois.pdf"
    accessedAt: "2026-02-07"
  - label: "COCOM/GGC — Budget et affaires courantes"
    url: "https://www.ccc-ggc.brussels/fr/cocom/budget"
    accessedAt: "2026-02-07"
  - label: "Bruss'Help — Dénombrement des personnes sans abri (nov. 2024)"
    url: "https://www.brusshelp.org/publications"
    accessedAt: "2026-02-07"
  - label: "Fédération des CPAS bruxellois — Note de conjoncture sociale 2025"
    url: "https://brulocalis.brussels/fr/publications"
    accessedAt: "2026-02-07"
  - label: "SPP Intégration sociale — Service fédéral"
    url: "https://www.mi-is.be/"
    accessedAt: "2026-02-07"
  - label: "Le Soir — Réforme des allocations familiales bruxelloises (fév. 2026)"
    url: "https://www.lesoir.be/727359/article/2026-02-07/la-region-bruxelloise-va-reformer-les-allocations-familiales-pour-economiser-8"
    accessedAt: "2026-02-07"
  - label: "Famiris — Allocations familiales bruxelloises"
    url: "https://famiris.brussels/"
    accessedAt: "2026-02-07"
confidenceLevel: official
metrics:
  - label: "Financement COCOM"
    value: "En affaires courantes"
    source: "COCOM / Assemblée réunie"
    date: "2026-01-01"
  - label: "Bénéficiaires du RIS"
    value: "~47 000"
    unit: "personnes"
    source: "IBSA / SPP Intégration sociale"
    date: "2024-12-31"
  - label: "Politique sans-abri"
    value: "Gelée"
    source: "Bruss'Help"
    date: "2026-01-01"
  - label: "Santé mentale (nouvelles initiatives)"
    value: "0"
    unit: "projets lancés"
    source: "Iriscare"
    date: "2026-02-01"
  - label: "Personnes sans abri dénombrées"
    value: "9 777"
    source: "Bruss'Help (8e dénombrement)"
    date: "2024-11-06"
  - label: "Enfants recevant des allocations familiales"
    value: "308 000+"
    source: "Famiris / COCOM"
    date: "2026-02-01"
  - label: "Économies sur allocations familiales"
    value: "33"
    unit: "millions EUR"
    source: "Le Soir / BX1"
    date: "2026-02-07"
lastModified: "2026-02-07"
changeType: updated
changeSummary: "Audit métriques : RIS ~47 000 (pas 38 000), sans-abri 9 777 (pas 7 134 = chiffre 2022), corrections texte"
summaryFalc: "Les aides sociales à Bruxelles sont sous pression. La réforme du chômage pousse beaucoup de personnes vers les CPAS. Près de 10 000 personnes vivent sans logement."
---
```

**Contenu MDX (body) — sections principales :**

> ## Un secteur sous pression croissante
> Convergence de crises : réforme chômage → CPAS, COCOM gelée, sans-abrisme +24.5%, santé mentale saturée.
>
> ## Les CPAS sous pression
> ~47 000 bénéficiaires RIS. Compensation fédérale dégressive (100% → 90% → 75%). Impact estimé : dizaines de millions EUR/an dès 2027.
>
> ## Les investissements COCOM gelés
> Pas de nouveaux agréments, pas de refinancement, pas de nouvelles places en maisons de repos, pas d'extension santé mentale.
>
> ## Les allocations familiales sous pression
> 308 000+ enfants. Réduction 10 EUR/mois, suppression supplément 12 EUR/mois. Économies totales : ~33M EUR.
>
> ## La politique sans-abri à l'arrêt
> 9 777 personnes sans abri (nov. 2024, +24.5% en 2 ans). Housing First non étendu, pérennisation places d'urgence bloquée.

**Sources actuelles (9) :** Iriscare, Observatoire Santé et Social, Brulocalis, COCOM, Bruss'Help, Fédération CPAS, SPP Intégration sociale, Le Soir, Famiris

---

## 4. Exemple de formation event

### Event : Deuxième année de douzièmes provisoires

**Fichier :** `content/formation-events/budget-deuxiemes-douziemes.fr.mdx`

```yaml
---
title: "Deuxième année de douzièmes provisoires"
slug: budget-deuxiemes-douziemes
locale: fr
date: "2026-02-05"
round: 6
eventType: budget
summary: "Le Parlement bruxellois vote une nouvelle ordonnance de douzièmes provisoires, marquant l'entrée dans une deuxième année complète sans budget régional. La Cour des comptes publie un avertissement sur la dégradation accélérée des finances régionales."
impact: "Rend la situation budgétaire critique et ajoute une pression financière concrète aux pressions citoyenne et parlementaire pour la formation d'un gouvernement."
sources:
  - label: "Parlement bruxellois — Ordonnance portant les crédits provisoires 2026"
    url: "https://parlement.brussels/seances-plenieres/"
    accessedAt: "2026-02-06"
  - label: "Cour des comptes — Avertissement sur les finances régionales bruxelloises"
    url: "https://www.ccrek.be/fr/publications"
    accessedAt: "2026-02-06"
  - label: "RTBF — Bruxelles : deux ans de douzièmes provisoires, un record"
    url: "https://www.rtbf.be/info/belgique"
    accessedAt: "2026-02-06"
  - label: "Le Soir — Le budget bruxellois s'enfonce dans la crise"
    url: "https://www.lesoir.be/sections/politique-belge"
    accessedAt: "2026-02-06"
lastModified: "2026-02-06"
---
```

**Contenu MDX (body) :**

> ## Ce qui s'est passé
> Le 5 février 2026, le Parlement vote une nouvelle ordonnance de douzièmes provisoires pour Q1 2026. La Région entre dans sa 2e année complète sans budget.
>
> ## La dégradation budgétaire
> Érosion réelle ~6%, investissements gelés, conventions échues, services sous tension.
>
> ## L'avertissement de la Cour des comptes
> Risque de dégradation notation financière, "mur budgétaire" à venir, impact sur capacité d'emprunt.

**Sources (4) :** Parlement bruxellois (source A), Cour des comptes (source A), RTBF (source B), Le Soir (source B)

**Rattachement :** Round 6 (formation en cours), eventType: budget
**Lien cross-collection manquant :** devrait être relié à DomainCard:budget (pas encore dans le schéma)

---

*Fin du document de contexte système*
