/**
 * scripts/quiz-sync-notice.ts
 *
 * Reporte dans chaque pool le nombre de questions effectivement relues, lu
 * depuis `data/quiz-review-state.json`.
 *
 * Le pool est servi au navigateur, l'état de relecture non : sans ce report,
 * le composant ne peut pas savoir s'il doit afficher la mention « questions
 * générées, non encore relues ». À relancer après toute régénération et après
 * toute session de relecture.
 *
 *   npm run quiz:sync-notice
 */

import fs from 'fs'
import { LOCALES, isReviewed, poolPath, readPool, readReviewState } from './quiz-provenance'

const state = readReviewState()

for (const locale of LOCALES) {
  const pool = readPool(locale)
  if (!pool) continue

  const reviewedCount = pool.questions.filter((q) => isReviewed(q, state, locale)).length
  const updated = { ...pool, reviewedCount }
  fs.writeFileSync(poolPath(locale), JSON.stringify(updated, null, 2) + '\n')

  const pending = pool.questions.length - reviewedCount
  console.log(
    `${locale} : ${reviewedCount}/${pool.questions.length} relues` +
      (pending ? `, mention affichée pour ${pending} question(s) en attente` : ', aucune mention')
  )
}
