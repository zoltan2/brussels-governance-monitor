/**
 * scripts/quiz-status.ts
 *
 * Rapport de fraîcheur et de relecture du pool de quiz. Aucun appel au modèle,
 * aucun coût : lit le pool, lit le corpus, compare.
 *
 * Usage :
 *   npm run quiz:status
 *   npx tsx scripts/quiz-status.ts --json     # sortie machine
 *
 * Sort en code 1 si des questions sont périmées, ce qui permet de brancher le
 * script sur une alerte planifiée plus tard.
 */

import {
  LOCALES,
  assessPool,
  isReviewed,
  readPool,
  readReviewState,
  readUnits,
  unitsToRegenerate,
  type Locale,
} from './quiz-provenance'

const AS_JSON = process.argv.includes('--json')

interface LocaleReport {
  locale: Locale
  total: number
  fresh: number
  stale: number
  orphan: number
  unstamped: number
  reviewed: number
  unitsToRegenerate: number
  uncoveredUnits: string[]
}

const reports: LocaleReport[] = []
const reviewState = readReviewState()

for (const locale of LOCALES) {
  const pool = readPool(locale)
  if (!pool) continue

  const units = readUnits(locale)
  const statuses = assessPool(pool, units)
  const toRegen = unitsToRegenerate(statuses, units)
  const covered = new Set(statuses.map((s) => s.unitKey))

  reports.push({
    locale,
    total: pool.questions.length,
    fresh: statuses.filter((s) => s.freshness === 'fresh').length,
    stale: statuses.filter((s) => s.freshness === 'stale').length,
    orphan: statuses.filter((s) => s.freshness === 'orphan').length,
    unstamped: statuses.filter((s) => s.freshness === 'unstamped').length,
    reviewed: pool.questions.filter((q) => isReviewed(q, reviewState, locale)).length,
    unitsToRegenerate: toRegen.size,
    uncoveredUnits: [...units.keys()].filter((k) => !covered.has(k)),
  })
}

if (AS_JSON) {
  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), reports }, null, 2))
} else {
  console.log('\nÉtat du pool de quiz\n' + '─'.repeat(72))
  console.log(
    'locale   total   à jour   périmées   orphelines   non estampillées   relues   unités à régénérer'
  )
  for (const r of reports) {
    console.log(
      `${r.locale.padEnd(9)}${String(r.total).padEnd(8)}${String(r.fresh).padEnd(9)}` +
        `${String(r.stale).padEnd(11)}${String(r.orphan).padEnd(13)}${String(r.unstamped).padEnd(19)}` +
        `${String(r.reviewed).padEnd(9)}${r.unitsToRegenerate}`
    )
  }

  const totals = reports.reduce(
    (a, r) => ({
      total: a.total + r.total,
      stale: a.stale + r.stale,
      orphan: a.orphan + r.orphan,
      reviewed: a.reviewed + r.reviewed,
    }),
    { total: 0, stale: 0, orphan: 0, reviewed: 0 }
  )

  const pct = (n: number) => (totals.total ? Math.round((100 * n) / totals.total) : 0)
  console.log('─'.repeat(72))
  console.log(
    `total ${totals.total} questions · ${totals.stale} périmées (${pct(totals.stale)} %) · ` +
      `${totals.orphan} orphelines · ${totals.reviewed} relues (${pct(totals.reviewed)} %)`
  )

  const uncovered = reports.flatMap((r) => r.uncoveredUnits.map((u) => `${r.locale}:${u}`))
  if (uncovered.length) {
    console.log(`\nFiches sans aucune question (${uncovered.length}) :`)
    for (const u of uncovered.slice(0, 15)) console.log(`  ${u}`)
    if (uncovered.length > 15) console.log(`  … et ${uncovered.length - 15} autres`)
  }
  console.log()
}

const anyStale = reports.some((r) => r.stale > 0 || r.orphan > 0)
process.exit(anyStale ? 1 : 0)
