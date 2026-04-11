'use client'

/**
 * Quiz interactif QCM — lit public/quiz-data-{locale}.json (pool ~50 questions).
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

// ─── Social share SVG icons ────────────────────────────────────────────────
function LinkedInIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
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
  }, [t, pickSession, locale])

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

  // ─── Share URLs ───────────────────────────────────────────────────────────
  const quizUrl = `https://governance.brussels/${locale}/quiz`
  const shareText = t('shareText', { score: String(score), total: String(total) })
  const encodedText = encodeURIComponent(shareText)
  const encodedUrl = encodeURIComponent(quizUrl)

  const shareLinks = {
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
    x: `https://x.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
  }

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(`${shareText}\n\n${quizUrl}`).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
    track('quiz-share', { platform: 'copy', score, total })
  }, [shareText, quizUrl, score, total])

  const handleShareClick = useCallback((platform: string) => {
    track('quiz-share', { platform, score, total })
  }, [score, total])

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

  // ─── Loading / error ──────────────────────────────────────────────────────
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

  // ─── Result ───────────────────────────────────────────────────────────────
  if (phase === 'result') {
    return (
      <div ref={topRef} className="scroll-mt-24 mx-auto max-w-xl py-6">
        <div className="mb-6 text-center">
          <div className="mb-1 text-xs uppercase tracking-widest text-neutral-400">{t('yourScore')}</div>
          <div className="text-5xl font-medium tabular-nums text-neutral-900">
            {score}/{total}
          </div>
          <div className="mt-1 text-sm font-medium text-status-resolved">
            {scoreLabel(score / total, t)}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-neutral-500">
            {t('resultDescription')}
          </p>
        </div>

        <hr className="my-6 border-neutral-100" />

        {/* Share buttons */}
        <div className="mb-6">
          <div className="mb-3 text-xs uppercase tracking-widest text-neutral-400">
            {t('shareTitle')}
          </div>
          <div className="flex gap-2">
            <a
              href={shareLinks.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleShareClick('linkedin')}
              className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
            >
              <LinkedInIcon />
              {t('shareLinkedIn')}
            </a>
            <a
              href={shareLinks.facebook}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleShareClick('facebook')}
              className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
            >
              <FacebookIcon />
              {t('shareFacebook')}
            </a>
            <a
              href={shareLinks.x}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleShareClick('x')}
              className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
            >
              <XIcon />
              {t('shareX')}
            </a>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
            >
              <LinkIcon />
              {copied ? t('shareCopied') : t('shareCopy')}
            </button>
          </div>
        </div>

        {/* CTAs */}
        <div className="grid grid-cols-2 gap-3">
          {/* Le Signal — FR only */}
          {locale === 'fr' && (
            <a
              href={`/${locale}/signal`}
              className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 transition hover:bg-neutral-100"
            >
              <div className="text-sm font-medium text-neutral-900">{t('signalTitle')}</div>
              <div className="mt-0.5 text-xs text-neutral-400">{t('signalDesc')}</div>
            </a>
          )}

          {/* Podcast — FR + NL */}
          {(locale === 'fr' || locale === 'nl') && (
            <a
              href={locale === 'fr'
                ? 'https://podcast.governance.brussels/@lebriefingbgm'
                : 'https://podcast.governance.brussels/@debriefingbgm'}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 transition hover:bg-neutral-100"
            >
              <div className="text-sm font-medium text-neutral-900">{t('podcastTitle')}</div>
              <div className="mt-0.5 text-xs text-neutral-400">{t('podcastDesc')}</div>
            </a>
          )}

          {/* Digest email — all locales */}
          <a
            href={`/${locale}/subscribe`}
            className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 transition hover:bg-neutral-100"
          >
            <div className="text-sm font-medium text-neutral-900">{t('digestTitle')}</div>
            <div className="mt-0.5 text-xs text-neutral-400">{t('digestDesc')}</div>
          </a>

          {/* Explorer les domaines — all locales */}
          <a
            href={`/${locale}/domaines`}
            className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 transition hover:bg-neutral-100"
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
                  className="shrink-0 text-xs text-status-resolved hover:underline"
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

  // ─── Quiz ─────────────────────────────────────────────────────────────────
  const progress = ((current + 1) / total) * 100
  const sourceLabel = q.source === 'domain' ? t('sourceDomain') : t('sourceDossier')

  return (
    <div ref={topRef} className="scroll-mt-24 mx-auto max-w-xl py-6">
      {/* Progress */}
      <div className="mb-5 h-px bg-neutral-100">
        <div
          className="h-px bg-brand-800 transition-all duration-300"
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
              ? 'bg-neutral-100 text-brand-800'
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
          let circleVariant = 'border-neutral-300 text-neutral-500'

          if (answered !== null) {
            if (idx === q.correct) {
              variant = 'border-status-resolved bg-neutral-50 ring-1 ring-status-resolved'
              circleVariant = 'border-status-resolved bg-status-resolved text-white'
            } else if (idx === answered && answered !== q.correct) {
              variant = 'border-status-delayed bg-neutral-50 ring-1 ring-status-delayed'
              circleVariant = 'border-status-delayed bg-status-delayed text-white'
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
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium ${circleVariant}`}
              >
                {LETTERS[idx]}
              </span>
              <span className="text-neutral-800">{opt}</span>
            </button>
          )
        })}
      </div>

      {/* Feedback after answer */}
      {answered !== null && (
        <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
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
              className="inline-flex items-center gap-1 text-xs text-status-resolved hover:underline"
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
          className="mt-4 w-full rounded-lg border border-brand-800 py-3 text-sm font-medium text-brand-800 transition hover:bg-neutral-100"
        >
          {current + 1 < total ? t('nextQuestion') : t('showResult')}
        </button>
      )}
    </div>
  )
}
