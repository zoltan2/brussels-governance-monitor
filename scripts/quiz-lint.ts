/**
 * scripts/quiz-lint.ts
 *
 * Contrôle éditorial des pools de quiz.
 *
 * Le pool de quiz vit dans `public/`, hors du périmètre du content lint qui ne
 * couvre que `content/`. Il échappait donc à toutes les règles éditoriales du
 * site alors que c'est la seule surface où une affirmation est présentée comme
 * LA bonne réponse. Ce script ferme ce trou en réutilisant la même liste de
 * phrases interdites que la CI de contenu.
 *
 * Usage :
 *   npm run quiz:lint
 *
 * Sort en code 1 si au moins une violation est trouvée.
 */

import fs from 'fs'
import path from 'path'
import { LOCALES, readPool, type QuizQuestion } from './quiz-provenance'

const PATTERNS_FILE = path.join(process.cwd(), 'scripts/content-lint/temporal-patterns.txt')

interface Violation {
  locale: string
  id: string
  rule: string
  detail: string
  /** `error` fait échouer le lint, `warn` est signalé sans bloquer. */
  severity: 'error' | 'warn'
}

/** La détection de fuite de réponse est une heuristique : elle demande un
 *  jugement humain et ne doit pas bloquer une intégration. La structure et les
 *  phrases temporelles, elles, sont des règles fermes. */
const LEAK_SEVERITY: 'warn' = 'warn'

/** Écart absolu minimal avant de signaler une option « trop longue ». Sans ce
 *  plancher, une bonne réponse de 6 signes contre 3 en médiane déclenche une
 *  alerte qui n'a aucun sens. */
const LEAK_MIN_DELTA = 25

function loadTemporalPatterns(): RegExp[] {
  if (!fs.existsSync(PATTERNS_FILE)) {
    console.error(`Liste de motifs introuvable : ${PATTERNS_FILE}`)
    process.exit(1)
  }
  return fs
    .readFileSync(PATTERNS_FILE, 'utf-8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((p) => new RegExp(p, 'i'))
}

/** Tous les textes visibles d'une question. */
function texts(q: QuizQuestion): { field: string; value: string }[] {
  return [
    { field: 'question', value: q.question },
    { field: 'explanation', value: q.explanation },
    ...q.options.map((o, i) => ({ field: `options[${i}]`, value: o })),
  ]
}

const patterns = loadTemporalPatterns()
const violations: Violation[] = []

for (const locale of LOCALES) {
  const pool = readPool(locale)
  if (!pool) continue

  const seen = new Set<string>()

  for (const q of pool.questions) {
    // ── Structure ──
    if (q.options.length !== 4) {
      violations.push({ locale, id: q.id, rule: 'structure', severity: 'error', detail: `${q.options.length} options au lieu de 4` })
    }
    if (q.correct < 0 || q.correct >= q.options.length) {
      violations.push({ locale, id: q.id, rule: 'structure', severity: 'error', detail: `index correct hors bornes (${q.correct})` })
    }
    if (new Set(q.options.map((o) => o.trim().toLowerCase())).size !== q.options.length) {
      violations.push({ locale, id: q.id, rule: 'structure', severity: 'error', detail: 'options en double' })
    }
    for (const { field, value } of texts(q)) {
      if (!value || !value.trim()) {
        violations.push({ locale, id: q.id, rule: 'structure', severity: 'error', detail: `${field} vide` })
      }
    }
    if (seen.has(q.id)) {
      violations.push({ locale, id: q.id, rule: 'structure', severity: 'error', detail: 'identifiant en double' })
    }
    seen.add(q.id)

    // ── Phrases temporelles relatives, mêmes motifs que le content lint ──
    for (const { field, value } of texts(q)) {
      for (const re of patterns) {
        if (re.test(value)) {
          violations.push({
            locale,
            id: q.id,
            rule: 'phrase temporelle',
            severity: 'error',
            detail: `${field} : « ${value.slice(0, 90)} » (motif ${re.source})`,
          })
          break
        }
      }
    }

    // ── Fuite de réponse ──
    const good = q.options[q.correct] ?? ''
    const others = q.options.filter((_, i) => i !== q.correct)

    // la bonne option nettement plus longue que les autres
    const median = [...others.map((o) => o.length)].sort((a, b) => a - b)[
      Math.floor(others.length / 2)
    ] ?? 0
    if (median > 0 && good.length > median * 1.8 && good.length - median >= LEAK_MIN_DELTA) {
      violations.push({
        locale,
        id: q.id,
        rule: 'fuite de réponse',
        severity: LEAK_SEVERITY,
        detail: `bonne option ${good.length} signes contre ${median} en médiane`,
      })
    }

    // la bonne option est la seule à contenir un chiffre
    const hasDigit = (s: string) => /\d/.test(s)
    if (hasDigit(good) && others.every((o) => !hasDigit(o))) {
      violations.push({
        locale,
        id: q.id,
        rule: 'fuite de réponse',
        severity: LEAK_SEVERITY,
        detail: 'seule la bonne option contient un chiffre',
      })
    }
  }
}

const errors = violations.filter((v) => v.severity === 'error')
const warns = violations.filter((v) => v.severity === 'warn')

if (violations.length === 0) {
  console.log('quiz-lint : OK, aucune violation sur les 4 pools.')
  process.exit(0)
}

const byRule = new Map<string, Violation[]>()
for (const v of violations) {
  if (!byRule.has(v.rule)) byRule.set(v.rule, [])
  byRule.get(v.rule)!.push(v)
}

console.log(`quiz-lint : ${errors.length} erreur(s), ${warns.length} avertissement(s)\n`)
for (const [rule, list] of byRule) {
  const blocking = list[0]!.severity === 'error'
  console.log(`── ${rule} (${list.length}) ${blocking ? '[bloquant]' : '[avertissement]'} ──`)
  for (const v of list) console.log(`  [${v.locale}] ${v.id} — ${v.detail}`)
  console.log()
}

if (errors.length === 0) {
  console.log('Aucune erreur bloquante. Les avertissements demandent un jugement humain.')
}
process.exit(errors.length > 0 ? 1 : 0)
