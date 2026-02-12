'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

const PHASES = ['exploration', 'negotiation', 'agreement', 'government'] as const;

const PHASE_COLORS: Record<string, string> = {
  exploration: 'bg-amber-500',
  negotiation: 'bg-blue-400',
  agreement: 'bg-indigo-400',
  government: 'bg-white',
};

/**
 * Compact formation phase indicator.
 * Links to the full timeline page.
 */
export function FormationPhase({
  currentPhase,
  variant = 'bar',
  theme = 'light',
}: {
  currentPhase: string;
  variant?: 'bar' | 'dots';
  theme?: 'light' | 'dark';
}) {
  const t = useTranslations('timeline');
  const isDark = theme === 'dark';

  // variant === 'bar'
  return (
    <Link href="/timeline" className="group block">
      <div className="flex items-center gap-3">
        <span
          className={`shrink-0 text-[11px] font-medium uppercase tracking-wide ${
            isDark ? 'text-white/50' : 'text-neutral-400'
          }`}
        >
          {t('phaseTracker')}
        </span>
        <div className="flex flex-1 items-center gap-1">
          {PHASES.map((phase, i) => {
            const isActive = phase === currentPhase;
            const isPast = PHASES.indexOf(currentPhase as typeof phase) > i;
            return (
              <div key={phase} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={`h-1.5 w-full rounded-full ${
                    isActive
                      ? PHASE_COLORS[phase]
                      : isPast
                        ? isDark
                          ? 'bg-white/30'
                          : 'bg-neutral-400'
                        : isDark
                          ? 'bg-white/10'
                          : 'bg-neutral-200'
                  }`}
                />
                <span
                  className={`text-[10px] leading-none ${
                    isActive
                      ? isDark
                        ? 'font-semibold text-white'
                        : 'font-semibold text-neutral-800'
                      : isDark
                        ? 'text-white/40'
                        : 'text-neutral-400'
                  }`}
                >
                  {t(`phases.${phase}`)}
                </span>
              </div>
            );
          })}
        </div>
        <svg
          className={`h-3 w-3 shrink-0 transition-colors ${
            isDark
              ? 'text-white/30 group-hover:text-white/70'
              : 'text-neutral-300 group-hover:text-brand-600'
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}
