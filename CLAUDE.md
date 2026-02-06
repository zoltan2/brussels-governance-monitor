# Brussels Governance Monitor (BGM)

## Project

- **Public name:** Brussels Governance Monitor
- **Internal code name:** BTR
- **Entity:** Advice That SRL (Belgium)
- **License:** AGPL v3 (open source)
- **Status:** MVP in development (S1)

## Stack

- Next.js 15 (App Router) + TypeScript (strict)
- Velite (Zod + MDX) for content collections
- Tailwind CSS (mobile-first)
- next-intl for i18n (FR/NL/EN/DE)
- Resend + React Email for notifications (S2+)
- Plausible for analytics (S3+)
- Vercel for hosting

## Commands

```bash
npm run dev        # Start dev server
npm run build      # Production build (Velite validates Zod schemas)
npm run start      # Serve production build
npm run lint       # ESLint check
npm run lint:fix   # ESLint auto-fix
npm run typecheck  # TypeScript type check
npm run format     # Prettier format
```

## Code Conventions

- TypeScript strict mode, no `any`
- Server Components by default. Only add `"use client"` when strictly necessary (interactivity, hooks)
- Conventional Commits: `feat:`, `fix:`, `docs:`, `content:`, `chore:`, `refactor:`, `style:`
- File naming: kebab-case for all files (`crisis-counter.tsx`, not `CrisisCounter.tsx`)
- Component naming: PascalCase for exports (`export function CrisisCounter()`)
- Imports: use `@/*` alias for `src/` directory

## Content Structure

```
content/
├── domain-cards/       ← {slug}.{locale}.mdx
├── solution-cards/     ← {slug}.{locale}.mdx
├── sector-cards/       ← {slug}.{locale}.mdx  (V1)
└── comparison-cards/   ← {slug}.{locale}.mdx  (V1)
```

- Each card = 1 MDX file per language
- Frontmatter validated by Zod at build time
- Adding a card = adding a file, zero code changes
- Locales: `fr`, `nl`, `en`, `de`

## Languages

- **FR** = source language (all content written in FR first)
- **NL** = human translation (mandatory for Brussels credibility)
- **EN/DE** = AI-assisted + human review
- **UI translations** in `messages/{locale}.json`
- **Backend/admin** = FR only

## Editorial Rules (NON-NEGOTIABLE)

1. **NO politician names** in domain/sector cards. Use institutional roles: "le gouvernement sortant", "le formateur", "le Parlement bruxellois"
2. **Every fact must have a source** with URL and access date
3. **No editorializing**: no "à cause de", "par la faute de", "malgré les promesses de"
4. **Confidence levels**: `official` (institutional source), `estimated` (our calculation with methodology), `unconfirmed` (press only)
5. **No red/green colors** (political connotation in Belgium). Use neutral palette: slate, blue-dark, white, amber for warnings
6. **Tone**: sober, institutional, data-driven. Not "startup cool", not "activist NGO"

## Design Palette

- Primary: `slate-900` (text), `blue-900` / `blue-800` (accent)
- Background: `white`, `slate-50` (sections)
- Warning/attention: `amber-500`
- Status blocked: `slate-700` with icon
- Status delayed: `amber-600`
- Status ongoing: `blue-600`
- Status resolved: `teal-600` (NOT green-500)
- **NEVER use**: red-*, green-* (Belgian political party colors)

## Security

- No secrets in code. Use `.env.local` (gitignored) for API keys
- `.env.example` committed with empty values as template
- MDX compiled at build time (no dynamic execution)
- Validate all user inputs server-side (Zod)
- Security headers configured in `next.config.ts`
- No `dangerouslySetInnerHTML`
- No external scripts unless strictly necessary

## Project Structure

```
src/
├── app/[locale]/           ← Pages (App Router)
├── components/             ← Reusable React components
│   └── layout/             ← Header, footer, locale switcher
├── i18n/                   ← next-intl config
├── lib/                    ← Utilities, content helpers
└── proxy.ts               ← next-intl locale proxy (Next.js 16 convention, replaces middleware.ts)
```
