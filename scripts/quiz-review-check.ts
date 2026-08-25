/**
 * scripts/quiz-review-check.ts
 *
 * Recalcule `reviewedCount` et `poolSize` des quatre pools depuis
 * `data/quiz-review-state.json` et échoue sur écart.
 *
 * Sans lui, rien ne vérifie le seul chiffre qui décide de l'affichage de la
 * mention de l'article 50 : `quiz-lint.ts` n'ouvre pas l'état de relecture.
 *
 * Usage : npm run quiz:review:check
 */

import fs from 'fs'
import path from 'path'
import { findCountDivergences } from '../src/lib/quiz-review-check'
import { LOCALES, type ReviewState } from '../src/lib/quiz-review'
import type { PoolsByLocale } from '../src/lib/quiz-review-apply'

const root = process.cwd()
const state = JSON.parse(
  fs.readFileSync(path.join(root, 'data/quiz-review-state.json'), 'utf-8'),
) as ReviewState
const pools = Object.fromEntries(
  LOCALES.map((l) => [
    l,
    JSON.parse(fs.readFileSync(path.join(root, `public/quiz-data-${l}.json`), 'utf-8')),
  ]),
) as PoolsByLocale

const divergences = findCountDivergences(pools, state)

if (divergences.length === 0) {
  console.log('quiz-review-check : compteurs conformes à l\'état de relecture.')
  process.exit(0)
}

console.error('quiz-review-check : écart entre les pools et l\'état de relecture.\n')
for (const d of divergences) {
  console.error(
    `  [${d.locale}] ${d.reason} déclaré ${d.declared ?? 'absent'}, calculé ${d.actual}`,
  )
}
console.error('\nCorriger avec `npm run quiz:sync-notice`, puis committer les pools.')
process.exit(1)
