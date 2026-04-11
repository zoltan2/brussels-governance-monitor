'use client'

/**
 * Quiz interactif QCM — lit public/quiz-data.json (pool ~50 questions).
 * Tire 10 questions aléatoires par session (Fisher-Yates).
 * Umami custom events : quiz-start, quiz-answer, quiz-complete.
 * Feedback via FeedbackButton (API Resend, shared with dossier/domain pages).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { FeedbackButton } from '@/components/feedback-button'

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
  poolSize: number
  questionsPerSession: number
  questions: QuizQuestion[]
}

/** Fisher-Yates shuffle — unbiased random */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface MissedItem {
  question: string
  sourceSlug: string
  sourceTitle: string
}

function scoreLabel(pct: number, t: (key: string) => string): string {
  if (pct < 0.3) return t('citizenCurious')
  if (pct < 0.5) return t('observerTraining')
  if (pct < 0.7) return t('citizenInformed')
  if (pct < 0.9) return t('brusselsAnalyst')
  return t('expertBGM')
}

/** Replace /fr/ prefix in sourceSlug with the current locale */
function localizeSlug(slug: string, locale: string): string {
  return slug.replace(/^\/fr\//, `/${locale}/`)
}

/** Send Umami custom event (no-op if Umami not loaded) */
function track(event: string, data?: Record<string, string | number>) {
  if (typeof window !== 'undefined' && typeof (window as Record<string, unknown>).umami !== 'undefined') {
    (window as Record<string, { track: (event: string, data?: Record<string, string | number>) => void }>).umami.track(event, data)
  }
}

export default function BGMQuiz() {
  const t = useTranslations('quiz')
  const tFeedback = useTranslations('feedback')
  const locale = useLocale()

  const [pool, setPool] = useState<QuizData | null>(null)
  const [session, setSession] = useState<QuizQuestion[]>([])
  const [error, setError] = useState<string | null>(null)
  const [current, setCurrent] = useState(0)
  const [phase, setPhase] = useState<Phase>('quiz')
  const [answered, setAnswered] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [missed, setMissed] = useState<MissedItem[]>([])
  const [copied, setCopied] = useState(false)
  const topRef = useRef<HTMLDivElement>(null)

  /** Pick N random questions from the pool */
  const pickSession = useCallback((data: QuizData): QuizQuestion[] => {
    const n = data.questionsPerSession ?? 10
    return shuffle(data.questions).slice(0, n)
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch(`/quiz-data-${locale}.json`, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const ct = r.headers.get('content-type') ?? ''
        if (!ct.includes('json')) throw new Error(`Not JSON: ${ct}`)
        return r.json()
      })
      .then((d: QuizData) => {
        if (cancelled) return
        if (!d.questions || d.questions.length === 0) {
          setError(t('errorUnavailable'))
          return
        }
        setPool(d)
        setSession(pickSession(d))
        track('quiz-start', { poolSize: d.poolSize })
      })
      .catch(() => {
        if (!cancelled) setError(t('errorLoad'))
      })
    return () => { cancelled = true }
  }, [t, pickSession])

  const q: QuizQuestion | null = session.length > 0 ? session[current] : null
  const total = session.length

  const handleAnswer = useCallback(
    (idx: number) => {
      if (answered !== null || !q) return
      setAnswered(idx)
      const isCorrect = idx === q.correct
      if (isCorrect) {
        setScore((s) => s + 1)
      } else {
        setMissed((m) => [
          ...m,
          { question: q.question, sourceSlug: q.sourceSlug, sourceTitle: q.sourceTitle },
        ])
      }
      track('quiz-answer', { questionId: q.id, correct: isCorrect ? 1 : 0 })
    },
    [answered, q]
  )

  const handleNext = useCallback(() => {
    if (session.length === 0) return
    if (current + 1 < total) {
      setCurrent((c) => c + 1)
      setAnswered(null)
      topRef.current?.scrollIntoView({ behavior: 'smooth' })
    } else {
      setPhase('result')
      topRef.current?.scrollIntoView({ behavior: 'smooth' })
      track('quiz-complete', { score, total })
    }
  }, [current, total, session, score])

  const restart = useCallback(() => {
    if (pool) setSession(pickSession(pool))
    setCurrent(0)
    setScore(0)
    setMissed([])
    setAnswered(null)
    setPhase('quiz')
    topRef.current?.scrollIntoView({ behavior: 'smooth' })
    track('quiz-start', { poolSize: pool?.poolSize ?? 0 })
  }, [pool, pickSession])

  const copyLinkedIn = useCallback(() => {
    const text = t('linkedInShareText', { score: String(score), total: String(total) })
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
    track('quiz-share', { platform: 'linkedin', score, total })
  }, [score, total, t])

  const feedbackLabels = {
    button: tFeedback('button'),
    title: tFeedback('title'),
    typeLabel: tFeedback('typeLabel'),
    types: {
      error: tFeedback('types.error'),
      correction: tFeedback('types.correction'),
      source: tFeedback('types.source'),
      other: tFeedback('types.other'),
    },
    messageLabel: tFeedback('messageLabel'),
    messagePlaceholder: tFeedback('messagePlaceholder'),
    emailLabel: tFeedback('emailLabel'),
    emailPlaceholder: tFeedback('emailPlaceholder'),
    submit: tFeedback('submit'),
    submitting: tFeedback('submitting'),
    success: tFeedback('success'),
    errorMessage: tFeedback('errorMessage'),
    cancel: tFeedback('cancel'),
  }

  // ─── Chargement / erreur ───────────────────────────────────────────────
  if (error) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        {error}
      </div>
    )
  }
  if (!pool || !q) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-neutral-400">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        {t('loading')}
      </div>
    )
  }

  // ─── Résultat ──────────────────────────────────────────────────────────
  if (phase === 'result') {
    return (
      <div ref={topRef} className="scroll-mt-24 mx-auto max-w-xl py-6">
        <div className="mb-6 text-center">
          <div className="mb-1 text-xs uppercase tracking-widest text-neutral-400">{t('yourScore')}</div>
          <div className="text-5xl font-medium tabular-nums text-neutral-900">
            {score}/{total}
          </div>
          <div className="mt-1 text-sm font-medium text-teal-700">
            {scoreLabel(score / total, t)}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-neutral-500">
            {t('resultDescription')}
          </p>
        </div>

        <hr className="my-6 border-neutral-100" />

        <div className="grid grid-cols-2 gap-3">
          <a
            href={`/${locale}/signal`}
            className="col-span-1 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 transition hover:bg-neutral-100"
          >
            <div className="text-sm font-medium text-neutral-900">{t('newsletter')}</div>
            <div className="mt-0.5 text-xs text-neutral-400">{t('newsletterDesc')}</div>
          </a>

          <button
            onClick={copyLinkedIn}
            className="col-span-1 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-left transition hover:bg-neutral-100"
          >
            <div className="text-sm font-medium text-neutral-900">{t('shareLinkedIn')}</div>
            <div className="mt-0.5 text-xs text-neutral-400">
              {copied ? t('copiedClipboard') : t('copyShareText')}
            </div>
          </button>

          <a
            href={`/${locale}/domaines`}
            className="col-span-2 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 transition hover:bg-neutral-100"
          >
            <div className="text-sm font-medium text-neutral-900">{t('explore13Domains')}</div>
            <div className="mt-0.5 text-xs text-neutral-400">
              {t('explore13DomainsDesc')}
            </div>
          </a>
        </div>

        {missed.length > 0 && (
          <div className="mt-6">
            <div className="mb-3 text-xs uppercase tracking-widest text-neutral-400">
              {t('toDeepen')}
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
                  href={localizeSlug(m.sourceSlug, locale)}
                  className="shrink-0 text-xs text-teal-700 hover:underline"
                >
                  {t('readLink')}
                </a>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={restart}
          className="mt-6 w-full rounded-lg border border-neutral-200 bg-neutral-50 py-2.5 text-sm text-neutral-500 transition hover:bg-neutral-100"
        >
          {t('restart')}
        </button>
      </div>
    )
  }

  // ─── Quiz ──────────────────────────────────────────────────────────────
  const progress = ((current + 1) / total) * 100
  const sourceLabel = q.source === 'domain' ? t('sourceDomain') : t('sourceDossier')

  return (
    <div ref={topRef} className="scroll-mt-24 mx-auto max-w-xl py-6">
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
          {t('questionOf', { current: String(current + 1), total: String(total) })}
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
          let variant = 'border-neutral-200 bg-neutral-50 hover:border-neutral-300 hover:bg-neutral-100'
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

      {/* Feedback after answer */}
      {answered !== null && (
        <div className="mt-4 rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-3">
          <p className="text-sm leading-relaxed text-neutral-600">
            <strong className="font-medium text-neutral-900">
              {answered === q.correct ? t('correct') + ' ' : t('incorrect') + ' '}
            </strong>
            {q.explanation}
          </p>
          <div className="mt-2 flex items-center justify-between">
            <a
              href={localizeSlug(q.sourceSlug, locale)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-teal-700 hover:underline"
            >
              {t('readOnBGM', { title: q.sourceTitle })}
            </a>
          </div>
          <div className="mt-3">
            <FeedbackButton
              cardTitle={q.question}
              cardType="quiz"
              cardSlug={q.id}
              context={[
                `Question: ${q.question}`,
                '',
                ...q.options.map((opt, i) => {
                  const markers = []
                  if (i === q.correct) markers.push('CORRECT')
                  if (i === answered) markers.push('CHOISI')
                  const suffix = markers.length > 0 ? ` ← ${markers.join(', ')}` : ''
                  return `  ${LETTERS[i]}) ${opt}${suffix}`
                }),
                '',
                `Explication affichée: ${q.explanation}`,
                `Source: ${q.sourceTitle} (${q.sourceSlug})`,
              ].join('\n')}
              labels={feedbackLabels}
            />
          </div>
        </div>
      )}

      {/* Next */}
      {answered !== null && (
        <button
          onClick={handleNext}
          className="mt-4 w-full rounded-lg border border-blue-800 py-3 text-sm font-medium text-blue-800 transition hover:bg-blue-50"
        >
          {current + 1 < total ? t('nextQuestion') : t('showResult')}
        </button>
      )}
    </div>
  )
}
