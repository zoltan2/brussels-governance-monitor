# BGM Social — Automated Multi-Platform Distribution

**Date:** 2026-03-25
**Status:** Approved (design phase)
**Repository:** bgm-ops (private)
**Dependencies:** bgm-ops veille pipeline (existing)

## Problem

The Brussels Governance Monitor updates content daily but has zero social media presence. Each veille produces 3-8 discrete facts that could reach audiences where they are (X, Instagram, Bluesky). Without distribution, the site relies entirely on direct visits and the weekly digest email.

The core challenge is **spreading** — posting everything at once looks like spam; posting nothing looks dead. The system must produce a steady rhythm of 2-3 posts per day per language, even on quiet days.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Architecture | Integrated in bgm-ops | Same stack (Node.js/tsx), same GitHub Actions, zero additional infra |
| Platforms | X + Instagram + Bluesky | Full reach: institutional (X), visual (IG), growing tech-savvy (Bluesky) |
| Languages | FR + NL (staggered 30 min) | Brussels bilingual reality; translations already exist in data files |
| Image generation | Satori (@vercel/og) | Already in Vercel ecosystem, free, deterministic, matches BGM palette |
| Tone | Editorial light | One sentence of context + fact. No opinion, no question, no editorializing |
| Validation | Kill switch via Telegram | Phase 1: 30 min notification before each post. Phase 2: full auto with kill switch |
| Fallback content | Day counter + DPR rotation + metrics + weekly recap | 4 fallback types ensure zero silent days |

## Architecture

```
bgm-ops (daily veille cron — existing)
  │
  ├── [post-veille] social-generate.ts
  │     → reads radar.json, changelog.json, commitments.json from BGM repo
  │     → generates social-queue.json (prioritized items with target times)
  │     → renders Satori card images (1 per item × 2 languages × 2 formats)
  │     → sends Telegram notification with queue preview
  │
  └── [cron every 2h, 08:00-22:00 CET] social-publish.ts
        → reads social-queue.json
        → checks kill switch (no Telegram block received)
        → publishes next FR item, then NL item 30 min later
        → posts to X + Instagram + Bluesky in parallel
        → marks item as published
        → Sunday: weekly recap replaces last slot
```

### Two-cron design

**Why two crons instead of one?** The veille runs once (typically early morning). The publishing cron runs 7-8 times/day. Separating them means:
- The queue is deterministic after generation (debuggable, previewable)
- Publishing failures don't block veille
- The kill switch operates between publish cycles, not within the veille

### Data flow

```
BGM repo (radar.json, changelog.json, commitments.json)
    ↓ git pull or API read
bgm-ops/social-generate.ts
    ↓ writes
bgm-ops/data/social-queue.json     ← today's queue
bgm-ops/data/social-history.json   ← published posts (dedup)
bgm-ops/data/social-metrics.json   ← rotation indices, counters
bgm-ops/data/social-cards/         ← generated PNG images
    ↓ reads
bgm-ops/social-publish.ts
    ↓ posts via API
X (twitter-api-v2) + Instagram (Meta Graph API) + Bluesky (AT Protocol)
```

## Post Types

### 1. Radar signal (priority 1)

**Source:** `radar.json` entries with `status: "active"` and `date` = today or yesterday.

**Template (FR):**
```
{domain tag} | Signal {date}
{descriptions.fr}
→ governance.brussels/fr/domaines/{targetSlug}
#BruxellesGouvernance #{domainHashtag}
```

**Example:**
```
Mobilite | Signal 25 mars
Le pass annuel LEZ a 350 EUR est confirme en principe, mais l'arrete
n'est pas vote. Echeance : 1er avril.
→ governance.brussels/fr/domaines/mobilite
#BruxellesGouvernance #LEZ
```

### 2. Commitment movement (priority 1)

**Source:** `commitments.json` — new `statusHistory` entry detected (diff vs social-history.json).

**Template (FR):**
```
Engagement DPR | {target.fr}
Statut : {previousStatus} → {newStatus}
{statusHistory[-1].source}
→ governance.brussels/fr/engagements
#DPR2026 #{domainHashtag}
```

### 3. Dossier fact (priority 2)

**Source:** `changelog.json` entries with `section: "dossiers"` and `date` = today.

**Template (FR):**
```
{dossier name} | Mise a jour {date}
{descriptions.fr}
→ governance.brussels/fr/dossiers/{targetSlug}
#BruxellesGouvernance
```

### 4. Day counter (priority 3 — daily fallback)

**Source:** Computed from government start date (2026-02-14).

**Template (FR):**
```
Jour {N} du gouvernement Dillies.
{X}/16 engagements en cours de legislation.
{Y} signaux radar actifs.
→ governance.brussels
#BruxellesGouvernance #Jour{N}
```

### 5. DPR rotation (priority 4 — gap filler)

**Source:** `commitments.json`, rotating through all 16 commitments.

**Template (FR):**
```
Engagement #{index} — {target.fr}
Objectif : {indicator.fr}
Statut actuel : {currentStatus}
Echeance : {deadline}
→ governance.brussels/fr/engagements
#DPR2026
```

**Rotation index** stored in `social-metrics.json`. Increments daily when used.

### 6. "Le saviez-vous" metric (priority 4 — gap filler)

**Source:** Curated list of ~50 metrics from domain card frontmatter.

**Template (FR):**
```
Le saviez-vous ?
{metric.value} {metric.unit}
Source : {metric.source} ({metric.date})
→ governance.brussels/fr/domaines/{domain}
#BruxellesGouvernance
```

**Rotation index** stored in `social-metrics.json`.

### 7. Weekly recap (Sunday only)

**Source:** Aggregation of the week's changelog + radar + commitments activity.

**Template (FR):**
```
Semaine {weekNumber} sur le Brussels Governance Monitor :
- {N} mises a jour
- {M} signaux radar
- {P} engagement(s) mis a jour
Domaines les plus actifs : {top 2-3 domains}
→ governance.brussels/fr/mises-a-jour
#BruxellesGouvernance #RecapSemaine
```

## Scheduling Logic

### Priority queue

```typescript
// Priority: lower number = higher priority
type PostPriority = 1 | 2 | 3 | 4;

interface QueueItem {
  id: string;
  type: 'radar' | 'commitment' | 'dossier' | 'counter' | 'dpr-rotation' | 'metric' | 'recap';
  priority: PostPriority;
  text: { fr: string; nl: string };
  cardImage: { landscape: string; square: string }; // paths to PNGs
  targetUrl: { fr: string; nl: string };
  scheduledAt: string; // ISO datetime for FR post
  publishedAt: string | null;
  platforms: { x: boolean; instagram: boolean; bluesky: boolean };
}
```

### Slot allocation

Available slots per day: `08:00, 10:30, 13:00, 15:30, 18:00, 20:30` (6 slots).

**Rules:**
1. Fill slots with priority 1 items first, then 2, then 3
2. Max 4 items/day (leaves 2 empty slots — breathing room)
3. If fewer than 2 items from veille: add 1 day counter (priority 3)
4. If 0 items from veille: add 1 DPR rotation + 1 metric (priority 4)
5. Sunday last slot: always weekly recap
6. NL version of each item: same slot + 30 minutes

**Dedup:** `social-history.json` stores posted item IDs. A radar signal posted on day 1 is not reposted on day 2 (even if still active). Commitment movements are unique by `{commitmentId}-{date}-{status}`.

### Weekend mode

Saturday/Sunday: veille doesn't run (typically). Queue falls back to:
- Saturday: day counter + 1 DPR rotation + 1 metric
- Sunday: day counter + 1 DPR rotation + weekly recap

## Card Image Generation

### Satori setup

Using `@vercel/og` (which wraps Satori + resvg-js) to render JSX → SVG → PNG.

**Two formats:**
- Landscape: 1200×630 (X, Bluesky, Open Graph)
- Square: 1080×1080 (Instagram)

### Visual template

```
┌─────────────────────────────────────┐
│  ▪ BRUSSELS GOVERNANCE MONITOR      │  slate-900 background
│                                     │
│  ┌──────────┐                       │
│  │ MOBILITE │                       │  blue-800 tag pill
│  └──────────┘                       │
│                                     │
│  Le pass annuel LEZ à 350 EUR est   │  white text, 24px
│  confirmé en principe, mais         │
│  l'arrêté n'est pas voté.           │
│                                     │
│  Échéance : 1er avril 2026          │  amber-500, 20px
│                                     │
│  ─────────────────────────────────  │
│  governance.brussels                │  slate-400, 14px
│  Signal · 25 mars 2026             │
└─────────────────────────────────────┘
```

**Palette:** slate-900 (bg), blue-800 (domain tag), white (text), amber-500 (metric/highlight), slate-400 (footer). No red, no green (Belgian political connotation rule).

**Font:** Inter (available in Satori, neutral, institutional).

### Image variants by post type

| Type | Tag color | Highlight | Footer label |
|------|-----------|-----------|-------------|
| Radar signal | blue-800 | amber-500 (key metric) | "Signal · {date}" |
| Commitment | blue-800 | amber-500 (status arrow) | "Engagement DPR · {date}" |
| Dossier fact | blue-800 | — | "Mise à jour · {date}" |
| Day counter | slate-700 | amber-500 (day number) | "Gouvernement Dilliès" |
| DPR rotation | blue-800 | amber-500 (status) | "Engagement #{n} · DPR 2026" |
| Metric | slate-700 | amber-500 (value) | "Le saviez-vous ?" |
| Weekly recap | blue-900 | — | "Semaine {n} · Récap" |

## Platform Integration

### X (Twitter)

**API:** X API v2, Free tier (1,500 posts/month — more than enough for ~240/month).
**Library:** `twitter-api-v2`
**Auth:** OAuth 1.0a (app + user tokens), stored in GitHub Actions secrets.
**Post format:** Text (280 chars max) + media upload (card image).
**Hashtags:** 2-3 per post, appended to text.

### Instagram

**API:** Meta Graph API (requires Facebook Page linked to Instagram Professional account).
**Library:** Direct HTTPS calls (simple REST API, no SDK needed).
**Auth:** Long-lived access token (60 days, auto-refreshed via cron).
**Post format:** Image (square 1080×1080) + caption (2,200 chars max).
**Constraints:**
- No clickable links in captions → URL visible on card image + in bio
- Link in bio: governance.brussels (consider linktr.ee if multiple links needed)
- Hashtags: 5-8 per post, appended to caption

### Bluesky

**API:** AT Protocol (free, no rate limit for this volume).
**Library:** `@atproto/api`
**Auth:** App password, stored in GitHub Actions secrets.
**Post format:** Text (300 chars max) + embedded image + link facet (clickable URL).
**Advantage:** Most permissive platform — links work, no algorithm suppression of external links.

## Telegram Kill Switch

### Bot setup

A Telegram bot sends queue previews and receives kill commands.

**Morning notification (after social-generate.ts):**
```
📋 Queue du 25 mars (6 items):
1. 🔴 08:00 — LEZ : flou juridique [radar]
2. 🟡 10:30 — Zuidpaleis basket [dossier]
3. 🟡 13:00 — Correction militaires [dossier]
4. 🟢 15:30 — Jour 40 [compteur]
5. 🟢 18:00 — Engagement #7 LEZ [DPR]
6. 🟢 20:30 — 56% sans voiture [metrique]

Commandes: skip 1, stop, go
```

**Pre-post notification (30 min before, Phase 1 only):**
```
⏳ Dans 30 min — LEZ : flou juridique
[image preview]
Répondre "skip" pour annuler
```

**Commands:**
- `skip {n}` — skip item n from today's queue
- `stop` — pause all publishing until `go`
- `go` — resume publishing

### Phase transition

Phase 1 (weeks 1-3): pre-post notifications active.
Phase 2: pre-post notifications disabled, only morning queue preview remains. Kill switch (`stop`/`skip`) always active.

Transition: manual toggle in `social-config.json` (`"prePostNotifications": false`).

## File Structure

```
bgm-ops/
├── src/
│   ├── social/
│   │   ├── generate.ts          ← main: reads BGM data, builds queue
│   │   ├── publish.ts           ← cron: dequeues and posts
│   │   ├── queue.ts             ← priority sorting, slot allocation, dedup
│   │   ├── card-render.ts       ← Satori JSX → PNG
│   │   ├── templates/
│   │   │   ├── signal.tsx       ← radar signal card template
│   │   │   ├── commitment.tsx   ← commitment movement card template
│   │   │   ├── dossier.tsx      ← dossier update card template
│   │   │   ├── counter.tsx      ← day counter card template
│   │   │   ├── rotation.tsx     ← DPR rotation card template
│   │   │   ├── metric.tsx       ← "le saviez-vous" card template
│   │   │   └── recap.tsx        ← weekly recap card template
│   │   ├── platforms/
│   │   │   ├── x.ts             ← X API v2 client
│   │   │   ├── instagram.ts     ← Meta Graph API client
│   │   │   └── bluesky.ts       ← AT Protocol client
│   │   ├── telegram.ts          ← kill switch bot
│   │   └── text-format.ts       ← text truncation, hashtags, per-platform
│   └── veille/ (existing)
├── data/
│   ├── social-queue.json        ← today's publishing queue
│   ├── social-history.json      ← all published posts (id + date + platforms)
│   ├── social-metrics.json      ← rotation indices, fallback counters
│   └── social-cards/            ← generated PNG images (gitignored)
└── social-config.json           ← platform toggles, phase settings
```

## GitHub Actions

### Generate (runs after veille)

```yaml
social-generate:
  needs: veille
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: npm ci
    - run: npx tsx src/social/generate.ts
    - run: git add data/social-*.json && git commit -m "social: queue $(date +%Y-%m-%d)" && git push
```

### Publish (runs every 2h, 08:00-22:00 CET)

```yaml
social-publish:
  schedule:
    - cron: '0 7,9,11,13,15,17,19,21 * * *'  # UTC = CET-1
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: npm ci
    - run: npx tsx src/social/publish.ts
    - run: git add data/social-*.json && git commit -m "social: published $(date +%H:%M)" && git push
```

## Costs

| Item | Cost |
|------|------|
| X API Free tier | 0 EUR |
| Instagram Graph API | 0 EUR |
| Bluesky AT Protocol | 0 EUR |
| GitHub Actions (~10 min/day) | 0 EUR (within free tier) |
| Telegram Bot API | 0 EUR |
| Satori/resvg-js | 0 EUR (MIT license) |
| **Total** | **0 EUR/month** |

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| X API Free tier revoked/changed | Bluesky + Instagram remain. X is replaceable. |
| Instagram token expiry | Auto-refresh cron (every 50 days). Alert on failure. |
| Template produces bad text | Kill switch + social-history.json for rollback tracking |
| Political misinterpretation | Editorial light tone, factual only, no questions, no opinions |
| NL translation quality | Translations come from radar.json (already human-reviewed at veille) |
| Queue empty (no veille) | 4 fallback content types ensure min 2 posts/day |
| API rate limits | Well under all limits (8 posts/day vs 1500/month on X) |

## Out of Scope

- Community management (replies, mentions, DMs)
- Social analytics dashboard (use native platform analytics)
- Instagram Stories/Reels
- Paid promotion/boosting
- EN/DE language posts (FR+NL only at launch)
- Cross-posting to LinkedIn or Facebook Page
