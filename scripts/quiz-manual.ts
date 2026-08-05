/**
 * scripts/quiz-manual.ts
 *
 * Mode manuel de génération du quiz : même principe que la veille, l'analyse
 * est produite en session plutôt que par un appel API facturé.
 *
 *   npm run quiz:manual:dump   [--locale fr]   → prépare le travail à faire
 *   npm run quiz:manual:apply  [--locale fr]   → valide, estampille, fusionne
 *
 * Le dump écrit `.quiz-pending/units-{locale}.json` : la liste des unités à
 * régénérer, avec leur corps tronqué exactement comme il partirait au modèle,
 * et le hash de source à reporter. Les questions rédigées sont attendues dans
 * `.quiz-pending/questions-{locale}.json`.
 *
 * L'apply refuse tout ce qui ne passe pas : structure, phrases temporelles,
 * fuite de réponse, unité inconnue, quota dépassé. Rien n'entre dans le pool
 * sans avoir passé les mêmes contrôles que la génération automatique.
 */

import fs from 'fs'
import path from 'path'
import {
  LOCALES,
  MIN_BODY_CHARS,
  PROMPT_VERSION,
  assessPool,
  detectLeaks,
  poolPath,
  readPool,
  readUnits,
  truncate,
  unitKeyOf,
  unitsToRegenerate,
  type Locale,
  type Provenance,
  type QuizData,
  type QuizQuestion,
  type Unit,
} from './quiz-provenance'

const PENDING_DIR = path.join(process.cwd(), '.quiz-pending')

const QUESTIONS_PER_DOMAIN = 2
const QUESTIONS_PER_DOSSIER = 1
const RICH_DOSSIERS = new Set([
  'good-move', 'lez', 'metro-3', 'slrb', 'pfas', 'acs',
  'mobilite-partagee', 'data-centers-ia-energie', 'enseignement', 'petite-enfance',
])

const ROUTE_PREFIX: Record<Locale, { domain: string; dossier: string }> = {
  fr: { domain: '/fr/domaines', dossier: '/fr/dossiers' },
  nl: { domain: '/nl/domeinen', dossier: '/nl/dossiers' },
  en: { domain: '/en/domains', dossier: '/en/dossiers' },
  de: { domain: '/de/bereiche', dossier: '/de/dossiers' },
}

function quotaFor(unit: Unit): number {
  if (unit.type === 'domain') return QUESTIONS_PER_DOMAIN
  return RICH_DOSSIERS.has(unit.slug) ? 2 : QUESTIONS_PER_DOSSIER
}

function flag(name: string): string | null {
  const i = process.argv.indexOf(name)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1]! : null
}

function targetLocales(): Locale[] {
  const i = process.argv.indexOf('--locale')
  if (i !== -1 && process.argv[i + 1]) return [process.argv[i + 1] as Locale]
  return [...LOCALES]
}

// ─── DUMP ───────────────────────────────────────────────────────────────────

function dump(locale: Locale): void {
  const units = readUnits(locale)
  const pool = readPool(locale)

  let keys: string[]
  if (pool) {
    const statuses = assessPool(pool, units)
    keys = [...unitsToRegenerate(statuses, units)]
  } else {
    keys = [...units.keys()]
  }

  // Filtres de lot : le travail se fait par petits paquets, pour qu'une
  // session interrompue ne perde rien et que chaque lot soit committable.
  const typeFilter = flag('--type')
  const limit = flag('--limit')

  const payload = keys
    .sort()
    .filter((k) => !typeFilter || k.startsWith(`${typeFilter}-`))
    .slice(0, limit ? Number(limit) : undefined)
    .map((key) => {
      const unit = units.get(key)
      if (!unit) return null
      if (unit.body.trim().length < MIN_BODY_CHARS) return null
      return {
        unitKey: key,
        slug: unit.slug,
        type: unit.type,
        title: unit.title,
        quota: quotaFor(unit),
        sourceLastModified: unit.lastModified,
        sourceContentHash: unit.contentHash,
        sourceSlug: `${ROUTE_PREFIX[locale][unit.type]}/${unit.slug}`,
        body: truncate(unit.body),
      }
    })
    .filter(Boolean)

  fs.mkdirSync(PENDING_DIR, { recursive: true })
  const out = path.join(PENDING_DIR, `units-${locale}.json`)
  fs.writeFileSync(out, JSON.stringify({ locale, units: payload }, null, 2) + '\n')

  const total = payload.reduce((n, u) => n + (u as { quota: number }).quota, 0)
  console.log(
    `${locale} : ${payload.length} unité(s), ${total} question(s) attendues → ${out}` +
      (typeFilter || limit ? '  [lot filtré]' : '')
  )
  console.log(`  restant après ce lot : ${keys.length - payload.length} unité(s)`)
}

// ─── APPLY ──────────────────────────────────────────────────────────────────

interface DumpUnit {
  unitKey: string
  slug: string
  type: 'domain' | 'dossier'
  title: string
  quota: number
  sourceLastModified: string
  sourceContentHash: string
  sourceSlug: string
}

function apply(locale: Locale): boolean {
  const unitsFile = path.join(PENDING_DIR, `units-${locale}.json`)
  const questionsFile = path.join(PENDING_DIR, `questions-${locale}.json`)

  if (!fs.existsSync(unitsFile)) {
    console.error(`${locale} : ${unitsFile} absent, lancer le dump d'abord.`)
    return false
  }
  if (!fs.existsSync(questionsFile)) {
    console.error(`${locale} : ${questionsFile} absent, rien à appliquer.`)
    return false
  }

  const dumped = JSON.parse(fs.readFileSync(unitsFile, 'utf-8')) as {
    locale: Locale
    units: DumpUnit[]
  }
  const byKey = new Map(dumped.units.map((u) => [u.unitKey, u]))

  const written = JSON.parse(fs.readFileSync(questionsFile, 'utf-8')) as {
    unitKey: string
    question: string
    options: [string, string, string, string]
    correct: number
    explanation: string
    domain?: string
  }[]

  const errors: string[] = []
  const perUnit = new Map<string, typeof written>()

  for (const w of written) {
    const unit = byKey.get(w.unitKey)
    if (!unit) {
      errors.push(`unité inconnue : ${w.unitKey}`)
      continue
    }
    if (!perUnit.has(w.unitKey)) perUnit.set(w.unitKey, [])
    perUnit.get(w.unitKey)!.push(w)
  }

  const questions: QuizQuestion[] = []
  const now = new Date().toISOString()

  for (const [unitKey, list] of perUnit) {
    const unit = byKey.get(unitKey)!
    if (list.length !== unit.quota) {
      errors.push(`${unitKey} : ${list.length} question(s) pour un quota de ${unit.quota}`)
    }

    const provenance: Provenance = {
      sourceLastModified: unit.sourceLastModified,
      sourceContentHash: unit.sourceContentHash,
      generatedAt: now,
      model: 'claude-opus-5 (session Claude Code, sans appel API)',
      promptVersion: PROMPT_VERSION,
    }

    list.forEach((w, i) => {
      const q: QuizQuestion = {
        id: `${unit.type}-${unit.slug}-${i}`,
        source: unit.type,
        domain: w.domain ?? '',
        question: w.question,
        options: w.options,
        correct: w.correct,
        explanation: w.explanation,
        sourceSlug: unit.sourceSlug,
        sourceTitle: unit.title,
        provenance,
      }

      if (q.options.length !== 4) errors.push(`${q.id} : ${q.options.length} options`)
      if (q.correct < 0 || q.correct > 3) errors.push(`${q.id} : correct hors bornes`)
      if (new Set(q.options.map((o) => o.trim().toLowerCase())).size !== 4) {
        errors.push(`${q.id} : options en double`)
      }
      if (!q.question.trim() || !q.explanation.trim()) errors.push(`${q.id} : champ vide`)
      for (const leak of detectLeaks(q)) errors.push(`${q.id} : ${leak}`)

      questions.push(q)
    })
  }

  if (errors.length) {
    console.error(`\n${locale} : ${errors.length} problème(s), rien appliqué\n`)
    for (const e of errors) console.error(`  ${e}`)
    return false
  }

  // Fusion : les questions reprises gardent leur provenance, les nouvelles
  // remplacent celles de leur unité.
  const pool = readPool(locale)
  const kept = (pool?.questions ?? []).filter((q) => !perUnit.has(unitKeyOf(q)))
  const merged = [...kept, ...questions].sort((a, b) => a.id.localeCompare(b.id))

  const data: QuizData = {
    generatedAt: now,
    locale,
    poolSize: merged.length,
    questionsPerSession: pool?.questionsPerSession ?? 10,
    questions: merged,
  }

  const floor = pool ? Math.floor(pool.questions.length * 0.5) : 1
  if (merged.length < Math.max(floor, 1)) {
    console.error(`${locale} : pool effondré (${merged.length} contre ${pool?.questions.length}), non écrit`)
    return false
  }

  fs.writeFileSync(poolPath(locale), JSON.stringify(data, null, 2) + '\n')
  console.log(
    `${locale} : ${questions.length} question(s) appliquées sur ${perUnit.size} unité(s), ` +
      `pool à ${merged.length} → quiz-data-${locale}.json`
  )
  return true
}

// ─── Main ───────────────────────────────────────────────────────────────────

const mode = process.argv[2]
let ok = true

for (const locale of targetLocales()) {
  if (mode === 'dump') dump(locale)
  else if (mode === 'apply') ok = apply(locale) && ok
  else {
    console.error('Usage : quiz-manual.ts dump|apply [--locale fr]')
    process.exit(1)
  }
}

process.exit(ok ? 0 : 1)
