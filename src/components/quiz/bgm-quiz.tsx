'use client'

/**
 * Quiz interactif QCM — lit public/quiz-data.json (généré manuellement).
 * Affiche : questions, feedback immédiat, score final, CTA newsletter + LinkedIn.
 * "Signaler une erreur" par question (mailto).
 */

import { useCallback, useEffect, useRef, useState } from 'react'

const LETTERS = ['A', 'B', 'C', 'D'] as const

type Phase = 'quiz' | 'result'

interface QuizQuestion {
  id: string
  source: 'domain' | 'dossier'
  domain: string
  question: string
  options: [string, string, string, string]
  correct: number
  explanation: string
  sourceSlug: string
  sourceTitle: string
}

interface QuizData {
  generatedAt: string
  questions: QuizQuestion[]
}

interface MissedItem {
  question: string
  sourceSlug: string
  sourceTitle: string
}

function scoreLabel(score: number, total: number): string {
  const pct = score / total
  if (pct < 0.3) return 'Citoyen curieux'
  if (pct < 0.5) return 'Observateur en formation'
  if (pct < 0.7) return 'Citoyen informé'
  if (pct < 0.9) return 'Analyste bruxellois'
  return 'Expert BGM'
}

function reportMailto(q: QuizQuestion): string {
  const subject = encodeURIComponent(`[Quiz BGM] Erreur — ${q.id}`)
  const body = encodeURIComponent(
    `Question : ${q.question}\n\nRéponse indiquée : ${q.options[q.correct]}\n\nErreur constatée :\n\n---\nID: ${q.id}\nSource: ${q.sourceSlug}`
  )
  return `mailto:hello@governance.brussels?subject=${subject}&body=${body}`
}

export default function BGMQuiz() {
  const [data, setData] = useState<QuizData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [current, setCurrent] = useState(0)
  const [phase, setPhase] = useState<Phase>('quiz')
  const [answered, setAnswered] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [missed, setMissed] = useState<MissedItem[]>([])
  const [copied, setCopied] = useState(false)
  const topRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/quiz-data.json', { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const ct = r.headers.get('content-type') ?? ''
        if (!ct.includes('json')) throw new Error(`Not JSON: ${ct}`)
        return r.json()
      })
      .then((d: QuizData) => {
        if (cancelled) return
        if (!d.questions || d.questions.length === 0) {
          setError('Le quiz n\u2019est pas encore disponible. Réessayez plus tard.')
          return
        }
        setData(d)
      })
      .catch(() => {
        if (!cancelled) setError('Impossible de charger le quiz.')
      })
    return () => { cancelled = true }
  }, [])

  const q: QuizQuestion | null = data ? data.questions[current] : null
  const total = data?.questions.length ?? 0

  const handleAnswer = useCallback(
    (idx: number) => {
      if (answered !== null || !q) return
      setAnswered(idx)
      if (idx === q.correct) {
        setScore((s) => s + 1)
      } else {
        setMissed((m) => [
          ...m,
          { question: q.question, sourceSlug: q.sourceSlug, sourceTitle: q.sourceTitle },
        ])
      }
    },
    [answered, q]
  )

  const handleNext = useCallback(() => {
    if (!data) return
    if (current + 1 < total) {
      setCurrent((c) => c + 1)
      setAnswered(null)
      topRef.current?.scrollIntoView({ behavior: 'smooth' })
    } else {
      setPhase('result')
      topRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [current, total, data])

  const restart = useCallback(() => {
    setCurrent(0)
    setScore(0)
    setMissed([])
    setAnswered(null)
    setPhase('quiz')
    topRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const copyLinkedIn = useCallback(() => {
    const text = `J'ai testé mes connaissances sur la gouvernance bruxelloise — ${score}/${total}.\n\nBruxelles : 19 communes, 6 niveaux de gouvernement, des centaines de décisions chaque semaine. Brussels Governance Monitor surveille tout ça en 4 langues.\n\nhttps://governance.brussels`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }, [score, total])

  // ─── Chargement / erreur ───────────────────────────────────────────────
  if (error) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        {error}
      </div>
    )
  }
  if (!data || !q) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-neutral-400">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        Chargement du quiz…
      </div>
    )
  }

  // ─── Résultat ──────────────────────────────────────────────────────────
  if (phase === 'result') {
    return (
      <div ref={topRef} className="mx-auto max-w-xl py-6">
        <div className="mb-6 text-center">
          <div className="mb-1 text-xs uppercase tracking-widest text-neutral-400">Votre score</div>
          <div className="text-5xl font-medium tabular-nums text-neutral-900">
            {score}/{total}
          </div>
          <div className="mt-1 text-sm font-medium text-teal-700">
            {scoreLabel(score, total)}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-neutral-500">
            Bruxelles a 19 communes, 6 gouvernements qui se superposent, et des centaines de
            décisions qui affectent votre quotidien. BGM surveille tout ça pour vous.
          </p>
        </div>

        <hr className="my-6 border-neutral-100" />

        <div className="grid grid-cols-2 gap-3">
          <a
            href="/fr/signal"
            className="col-span-1 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 transition hover:bg-neutral-50"
          >
            <div className="text-sm font-medium text-neutral-900">Le Signal</div>
            <div className="mt-0.5 text-xs text-neutral-400">Newsletter hebdo</div>
          </a>

          <button
            onClick={copyLinkedIn}
            className="col-span-1 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-left transition hover:bg-neutral-50"
          >
            <div className="text-sm font-medium text-neutral-900">Partager sur LinkedIn</div>
            <div className="mt-0.5 text-xs text-neutral-400">
              {copied ? 'Copié dans le presse-papiers' : 'Copier le texte de partage'}
            </div>
          </button>

          <a
            href="/fr/domaines"
            className="col-span-2 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 transition hover:bg-neutral-50"
          >
            <div className="text-sm font-medium text-neutral-900">Explorer les 13 domaines</div>
            <div className="mt-0.5 text-xs text-neutral-400">
              Mobilité, logement, budget, emploi, culture — governance.brussels
            </div>
          </a>
        </div>

        {missed.length > 0 && (
          <div className="mt-6">
            <div className="mb-3 text-xs uppercase tracking-widest text-neutral-400">
              À approfondir
            </div>
            {missed.map((m, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-t border-neutral-100 py-2.5"
              >
                <span className="max-w-[72%] text-sm leading-snug text-neutral-500">
                  {m.question.length > 65 ? m.question.slice(0, 65) + '\u2026' : m.question}
                </span>
                <a
                  href={m.sourceSlug}
                  className="shrink-0 text-xs text-teal-700 hover:underline"
                >
                  Lire →
                </a>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={restart}
          className="mt-6 w-full rounded-lg border border-neutral-200 bg-neutral-50 py-2.5 text-sm text-neutral-500 transition hover:bg-neutral-50"
        >
          Recommencer
        </button>
      </div>
    )
  }

  // ─── Quiz ──────────────────────────────────────────────────────────────
  const progress = ((current + 1) / total) * 100
  const sourceLabel = q.source === 'domain' ? 'Domaine' : 'Dossier'

  return (
    <div ref={topRef} className="mx-auto max-w-xl py-6">
      {/* Progress */}
      <div className="mb-5 h-px bg-neutral-100">
        <div
          className="h-px bg-blue-800 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Meta */}
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs uppercase tracking-widest text-neutral-400">
          Question {current + 1} / {total}
        </span>
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${
            q.source === 'domain'
              ? 'bg-blue-50 text-blue-800'
              : 'bg-neutral-100 text-neutral-600'
          }`}
        >
          {sourceLabel} — {q.domain}
        </span>
      </div>

      {/* Question */}
      <p className="mb-4 text-base font-medium leading-snug text-neutral-900 sm:text-lg">
        {q.question}
      </p>

      {/* Options */}
      <div className="flex flex-col gap-2.5">
        {q.options.map((opt, idx) => {
          let variant = 'border-neutral-200 bg-neutral-50 hover:border-neutral-300 hover:bg-neutral-50'
          if (answered !== null) {
            if (idx === q.correct) {
              variant = 'border-teal-500 bg-teal-50'
            } else if (idx === answered && answered !== q.correct) {
              variant = 'border-amber-400 bg-amber-50'
            } else {
              variant = 'border-neutral-100 bg-neutral-50 opacity-60'
            }
          }

          return (
            <button
              key={idx}
              onClick={() => handleAnswer(idx)}
              disabled={answered !== null}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition disabled:cursor-default ${variant}`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium ${
                  answered !== null && idx === q.correct
                    ? 'border-teal-500 bg-teal-500 text-white'
                    : answered !== null && idx === answered && answered !== q.correct
                      ? 'border-amber-400 bg-amber-400 text-white'
                      : 'border-neutral-300 text-neutral-500'
                }`}
              >
                {LETTERS[idx]}
              </span>
              <span className="text-neutral-900">{opt}</span>
            </button>
          )
        })}
      </div>

      {/* Feedback */}
      {answered !== null && (
        <div className="mt-4 rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-3">
          <p className="text-sm leading-relaxed text-neutral-600">
            <strong className="font-medium text-neutral-900">
              {answered === q.correct ? 'Correct. ' : 'Pas tout à fait. '}
            </strong>
            {q.explanation}
          </p>
          <div className="mt-2 flex items-center justify-between">
            <a
              href={q.sourceSlug}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-teal-700 hover:underline"
            >
              Lire sur governance.brussels — {q.sourceTitle}
            </a>
            <a
              href={reportMailto(q)}
              className="text-xs text-neutral-400 hover:text-neutral-600 hover:underline"
            >
              Signaler une erreur
            </a>
          </div>
        </div>
      )}

      {/* Suivant */}
      {answered !== null && (
        <button
          onClick={handleNext}
          className="mt-4 w-full rounded-lg border border-blue-800 py-3 text-sm font-medium text-blue-800 transition hover:bg-blue-50"
        >
          {current + 1 < total ? 'Question suivante' : 'Voir mon résultat'}
        </button>
      )}
    </div>
  )
}
