/**
 * scripts/quiz-provenance.ts
 *
 * Briques partagées pour la provenance et la fraîcheur du pool de quiz.
 *
 * L'invariant : une question connaît toujours l'unité dont elle est issue ET
 * la version exacte de cette unité (hash du corps tronqué tel qu'envoyé au
 * modèle). Sans ça, ni la fraîcheur ni la régénération ciblée ne sont
 * calculables, et régénérer devient une opération tout ou rien.
 *
 * Spec : bgm-ops/specs/2026-08-05-corpus-derived-items-mecanique.md
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { matter } from '../src/lib/frontmatter'
import {
  hashQuestionV1,
  isReviewed as isReviewedShared,
  isUnderQuota,
  type QuizQuestionLike,
  type ReviewEntry as ReviewEntryShared,
  type ReviewState as ReviewStateShared,
} from '../src/lib/quiz-review'

/** Primitives de relecture : une seule implémentation, dans `src/lib/quiz-review.ts`.
 *  Ré-exportées ici pour les six scripts qui les consomment déjà. */
export {
  LOCALES,
  reviewKey,
  hashQuestionV1,
  hashQuestionV2,
  hashForEntry,
  computeReviewedCount,
  quotaFor,
  isUnderQuota,
  CURRENT_HASH_VERSION,
} from '../src/lib/quiz-review'
export type {
  Locale,
  ReviewStatus,
  ReviewEntry,
  ReviewState,
  HashVersion,
  UnitRef,
} from '../src/lib/quiz-review'
import type { Locale, ReviewState, ReviewStatus } from '../src/lib/quiz-review'

/** Version du prompt. À incrémenter à CHAQUE modification d'un prompt de
 *  LOCALE_CONFIG : c'est un motif légitime de régénération, et sans ce champ
 *  on ne sait pas sous quelle règle une question a été produite. */
export const PROMPT_VERSION = 'v3'

/** Longueur de troncature du corps envoyé au modèle. Doit rester alignée sur
 *  truncate() dans generate-quiz.ts, sinon les hashes ne correspondent pas. */
export const TRUNCATE_AT = 4000

/** En dessous de ce volume de texte utile, une fiche ne produit rien. Une
 *  fiche trop mince donne des questions anecdotiques ou des doublons. */
export const MIN_BODY_CHARS = 600

export interface Provenance {
  sourceLastModified: string
  sourceContentHash: string
  generatedAt: string
  model: string
  promptVersion: string
}

export interface QuizQuestion {
  id: string
  source: 'domain' | 'dossier'
  domain: string
  question: string
  options: [string, string, string, string]
  correct: number
  explanation: string
  sourceSlug: string
  sourceTitle: string
  provenance?: Provenance
}

export interface QuizData {
  generatedAt: string
  locale: Locale
  poolSize: number
  questionsPerSession: number
  /**
   * Nombre de questions du pool relues par un humain, au sens de
   * `data/quiz-review-state.json`.
   *
   * Sert à l'affichage : tant que ce nombre est inférieur au NOMBRE DE
   * QUESTIONS du pool — et non à `poolSize`, qui est un champ distinct que
   * `bgm-quiz.tsx` n'ouvre jamais —, le
   * quiz porte une mention indiquant que des questions sont générées et non
   * encore relues (art. 50 du règlement (UE) 2024/1689). La mention disparaît
   * d'elle-même quand tout est validé, sans intervention dans le code.
   */
  reviewedCount?: number
  questions: QuizQuestion[]
}

export interface Unit {
  slug: string
  type: 'domain' | 'dossier'
  title: string
  body: string
  lastModified: string
  contentHash: string
}

const CONTENT_DIRS: Record<'domain' | 'dossier', string> = {
  domain: path.join(process.cwd(), 'content/domain-cards'),
  dossier: path.join(process.cwd(), 'content/dossiers'),
}

export function truncate(str: string, max = TRUNCATE_AT): string {
  return str.length > max ? str.slice(0, max) + '…' : str
}

/**
 * Hash du corps EXACTEMENT tel qu'il part au modèle : tronqué, puis normalisé
 * sur les fins de ligne et les espaces de fin. La normalisation évite qu'un
 * simple reformatage déclenche une régénération inutile.
 */
export function hashBody(body: string): string {
  const normalised = truncate(body)
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .trim()
  return 'sha256:' + crypto.createHash('sha256').update(normalised, 'utf-8').digest('hex').slice(0, 32)
}

/** Lit le corpus d'une locale et renvoie les unités, indexées par `type-slug`. */
export function readUnits(locale: Locale): Map<string, Unit> {
  const units = new Map<string, Unit>()

  for (const type of ['domain', 'dossier'] as const) {
    const dir = CONTENT_DIRS[type]
    if (!fs.existsSync(dir)) continue

    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(`.${locale}.mdx`))) {
      const raw = fs.readFileSync(path.join(dir, file), 'utf-8')
      const { data, content } = matter(raw)
      const slug = file.replace(`.${locale}.mdx`, '')
      const fm = data as Record<string, unknown>

      // Un brouillon ne doit pas alimenter le quiz : il n'est pas listé sur le
      // site, une question qui pointerait dessus enverrait vers un cul-de-sac.
      if (fm.draft === true) continue

      units.set(`${type}-${slug}`, {
        slug,
        type,
        title: String(fm.shortTitle ?? fm.title ?? slug),
        body: content,
        lastModified: String(fm.lastModified ?? ''),
        contentHash: hashBody(content),
      })
    }
  }

  return units
}

export function poolPath(locale: Locale): string {
  return path.join(process.cwd(), `public/quiz-data-${locale}.json`)
}

export function readPool(locale: Locale): QuizData | null {
  const p = poolPath(locale)
  if (!fs.existsSync(p)) return null
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as QuizData
}

/** Retrouve la clé d'unité d'une question, y compris pour les questions
 *  héritées qui n'ont pas de provenance : l'`id` porte déjà `type-slug-index`. */
export function unitKeyOf(q: QuizQuestion): string {
  const withoutIndex = q.id.replace(/-\d+$/, '')
  return withoutIndex
}

export type Freshness = 'fresh' | 'stale' | 'orphan' | 'unstamped'

export interface QuestionStatus {
  id: string
  unitKey: string
  freshness: Freshness
  sourceLastModified?: string
  currentLastModified?: string
}

/**
 * Statut de chaque question du pool face au corpus courant.
 *
 * - `fresh`     : le hash de la source n'a pas bougé depuis la génération
 * - `stale`     : la source a changé, ou le prompt a changé de version
 * - `orphan`    : la fiche source n'existe plus, ou est passée en brouillon
 * - `unstamped` : question héritée, sans provenance, donc non vérifiable
 */
export function assessPool(pool: QuizData, units: Map<string, Unit>): QuestionStatus[] {
  return pool.questions.map((q) => {
    const unitKey = unitKeyOf(q)
    const unit = units.get(unitKey)

    if (!unit) {
      return { id: q.id, unitKey, freshness: 'orphan' as const }
    }
    if (!q.provenance) {
      return {
        id: q.id,
        unitKey,
        freshness: 'unstamped' as const,
        currentLastModified: unit.lastModified,
      }
    }

    const changed =
      q.provenance.sourceContentHash !== unit.contentHash ||
      q.provenance.promptVersion !== PROMPT_VERSION

    return {
      id: q.id,
      unitKey,
      freshness: changed ? ('stale' as const) : ('fresh' as const),
      sourceLastModified: q.provenance.sourceLastModified,
      currentLastModified: unit.lastModified,
    }
  })
}

/**
 * Clés d'unités à régénérer.
 *
 * Quatre motifs, et le dernier est le moins évident : une unité qui compte
 * MOINS de questions que son quota. Sans lui, retirer une question du quiz —
 * ce que fait la page de relecture quand une question est jugée fausse —
 * ampute le pool de façon monotone et silencieuse, aucun régénérateur ne
 * reprenant l'unité amputée.
 */
export function unitsToRegenerate(
  statuses: QuestionStatus[],
  units: Map<string, Unit>
): Set<string> {
  const out = new Set<string>()
  for (const s of statuses) {
    if (s.freshness === 'stale' || s.freshness === 'unstamped') out.add(s.unitKey)
  }

  const counts = new Map<string, number>()
  for (const s of statuses) counts.set(s.unitKey, (counts.get(s.unitKey) ?? 0) + 1)

  for (const [key, unit] of units) {
    if (isUnderQuota({ type: unit.type, slug: unit.slug }, counts.get(key) ?? 0)) {
      out.add(key)
    }
  }
  return out
}

// ─── État de relecture ──────────────────────────────────────────────────────

export const REVIEW_STATE_PATH = path.join(process.cwd(), 'data/quiz-review-state.json')

/** Hash de relecture, version historique. Voir `src/lib/quiz-review.ts` :
 *  le séparateur y est un octet NUL écrit en séquence d'échappement, et un
 *  vecteur figé le verrouille. */
export function hashQuestion(q: QuizQuestion): string {
  return hashQuestionV1(q as QuizQuestionLike)
}

export function readReviewState(): ReviewState {
  if (!fs.existsSync(REVIEW_STATE_PATH)) {
    return { updatedAt: new Date().toISOString(), entries: {} }
  }
  return JSON.parse(fs.readFileSync(REVIEW_STATE_PATH, 'utf-8')) as ReviewState
}

export function writeReviewState(state: ReviewState): void {
  fs.mkdirSync(path.dirname(REVIEW_STATE_PATH), { recursive: true })
  fs.writeFileSync(REVIEW_STATE_PATH, JSON.stringify(state, null, 2) + '\n')
}

/** Une question est considérée relue si elle a une entrée `approved` ou
 *  `edited` dont le hash correspond encore au texte courant. */
/** Délègue au module partagé, qui sait comparer une entrée v1 comme une v2. */
export function isReviewed(q: QuizQuestion, state: ReviewState, locale: Locale): boolean {
  return isReviewedShared(q as QuizQuestionLike, state as ReviewStateShared, locale)
}

// ─── Détection de fuite de réponse ──────────────────────────────────────────

/** Écart absolu minimal avant de signaler une option « trop longue ». Sans ce
 *  plancher, une bonne réponse de 6 signes contre 3 en médiane déclenche une
 *  alerte qui n'a aucun sens. */
export const LEAK_MIN_DELTA = 25

/** Facteur de longueur au-delà duquel la bonne option se remarque. */
export const LEAK_LENGTH_RATIO = 1.8

/**
 * Indices qu'une question livre sa réponse par la forme plutôt que par le fond.
 *
 * Ce sont des heuristiques, pas des preuves : elles servent à relancer la
 * génération et à alerter un relecteur, jamais à bloquer une intégration.
 * Partagé entre le lint et le générateur pour que les deux jugent pareil.
 */
export function detectLeaks(q: QuizQuestion): string[] {
  const out: string[] = []
  const good = q.options[q.correct] ?? ''
  const others = q.options.filter((_, i) => i !== q.correct)
  if (others.length === 0) return out

  const lengths = others.map((o) => o.length).sort((a, b) => a - b)
  const median = lengths[Math.floor(lengths.length / 2)] ?? 0

  if (median > 0 && good.length > median * LEAK_LENGTH_RATIO && good.length - median >= LEAK_MIN_DELTA) {
    out.push(`bonne option ${good.length} signes contre ${median} en médiane`)
  }

  const hasDigit = (str: string) => /\d/.test(str)
  if (hasDigit(good) && others.every((o) => !hasDigit(o))) {
    out.push('seule la bonne option contient un chiffre')
  }

  return out
}
