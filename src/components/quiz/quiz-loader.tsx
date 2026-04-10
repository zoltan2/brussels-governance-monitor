'use client'

import dynamic from 'next/dynamic'

const BGMQuiz = dynamic(() => import('@/components/quiz/bgm-quiz'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center gap-2 py-12 text-sm text-neutral-400">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      Chargement du quiz…
    </div>
  ),
})

export default function QuizLoader() {
  return <BGMQuiz />
}
