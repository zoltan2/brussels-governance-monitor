/**
 * scripts/quiz-backfill-provenance.ts
 *
 * Estampille rétroactivement le pool existant, généré le 12 avril 2026 sans
 * provenance. Sans cette passe, la fraîcheur du pool hérité est incalculable
 * et la régénération reste tout ou rien.
 *
 * Le hash de source est reconstruit depuis git, à partir du contenu des fiches
 * tel qu'il était au moment de la génération. C'est une reconstitution
 * honnête : si une fiche n'existait pas encore à cette date, la question est
 * laissée sans provenance et sera régénérée à la prochaine passe.
 *
 * Usage :
 *   npx tsx scripts/quiz-backfill-provenance.ts [--dry-run]
 *
 * À usage unique. Une fois le pool estampillé, c'est generate-quiz.ts qui
 * maintient la provenance.
 */

import fs from 'fs'
import { execFileSync } from 'child_process'
import { matter } from '../src/lib/frontmatter'
import {
  LOCALES,
  PROMPT_VERSION,
  hashBody,
  poolPath,
  readPool,
  unitKeyOf,
  type Locale,
  type QuizQuestion,
} from './quiz-provenance'

/** Dernier commit avant le premier appel de génération (2026-04-12T09:49Z). */
const GENERATION_COMMIT = '58f6e2505ca7771277643580fecdf1e06b7c3859'
const GENERATION_MODEL = 'claude-haiku-4-5-20251001'

const DRY_RUN = process.argv.includes('--dry-run')

function readAtCommit(filePath: string): string | null {
  try {
    return execFileSync('git', ['show', `${GENERATION_COMMIT}:${filePath}`], {
      encoding: 'utf-8',
      maxBuffer: 20 * 1024 * 1024,
    })
  } catch {
    return null
  }
}

function unitFilePath(unitKey: string, locale: Locale): string {
  const type = unitKey.startsWith('domain-') ? 'domain-cards' : 'dossiers'
  const slug = unitKey.replace(/^(domain|dossier)-/, '')
  return `content/${type}/${slug}.${locale}.mdx`
}

let stamped = 0
let skipped = 0

for (const locale of LOCALES) {
  const pool = readPool(locale)
  if (!pool) {
    console.log(`${locale}: pool absent, ignoré`)
    continue
  }

  const cache = new Map<string, { hash: string; lastModified: string } | null>()
  let localeStamped = 0
  let localeSkipped = 0

  const questions: QuizQuestion[] = pool.questions.map((q) => {
    if (q.provenance) return q

    const unitKey = unitKeyOf(q)
    if (!cache.has(unitKey)) {
      const raw = readAtCommit(unitFilePath(unitKey, locale))
      if (raw === null) {
        cache.set(unitKey, null)
      } else {
        const { data, content } = matter(raw)
        cache.set(unitKey, {
          hash: hashBody(content),
          lastModified: String((data as Record<string, unknown>).lastModified ?? ''),
        })
      }
    }

    const src = cache.get(unitKey)
    if (!src) {
      localeSkipped++
      return q
    }

    localeStamped++
    return {
      ...q,
      provenance: {
        sourceLastModified: src.lastModified,
        sourceContentHash: src.hash,
        generatedAt: pool.generatedAt,
        model: GENERATION_MODEL,
        promptVersion: PROMPT_VERSION,
      },
    }
  })

  console.log(
    `${locale}: ${localeStamped} estampillées, ${localeSkipped} laissées sans provenance` +
      (localeSkipped ? ' (fiche absente au commit de génération)' : '')
  )
  stamped += localeStamped
  skipped += localeSkipped

  if (!DRY_RUN) {
    fs.writeFileSync(poolPath(locale), JSON.stringify({ ...pool, questions }, null, 2) + '\n')
  }
}

console.log(
  `\n${stamped} questions estampillées, ${skipped} sans provenance.` +
    (DRY_RUN ? ' (dry-run, rien écrit)' : '')
)
