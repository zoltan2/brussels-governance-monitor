'use client'

import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import type { QuizSiteStats } from '@/components/quiz/bgm-quiz'

const BGMQuiz = dynamic(() => import('@/components/quiz/bgm-quiz'), {
  ssr: false,
  loading: () => <QuizLoadingFallback />,
})

function QuizLoadingFallback() {
  const t = useTranslations('quiz')
  return (
    <div className="flex items-center gap-2 py-12 text-sm text-neutral-500">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      {t('loading')}
    </div>
  )
}

export default function QuizLoader(stats: QuizSiteStats) {
  return <BGMQuiz {...stats} />
}
