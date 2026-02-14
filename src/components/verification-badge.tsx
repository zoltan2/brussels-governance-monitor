import { useTranslations } from 'next-intl';
import type { Verification } from '@/lib/content';

interface VerificationBadgeProps {
  verification: Verification;
  locale: string;
}

const resultStyles: Record<Verification['result'], string> = {
  'no-change': 'bg-teal-50 text-teal-700 border-teal-200',
  'change-detected': 'bg-amber-50 text-amber-700 border-amber-200',
  uncertainty: 'bg-neutral-100 text-neutral-600 border-neutral-300',
  suspended: 'bg-neutral-50 text-neutral-500 border-neutral-200',
};

const resultIcons: Record<Verification['result'], string> = {
  'no-change': 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  'change-detected': 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z',
  uncertainty: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01',
  suspended: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
};

function formatLocalDate(dateStr: string, locale: string): string {
  return new Date(dateStr).toLocaleDateString(
    locale === 'fr' ? 'fr-BE' : locale === 'nl' ? 'nl-BE' : locale === 'de' ? 'de-DE' : 'en-GB',
    { day: 'numeric', month: 'short', year: 'numeric' },
  );
}

export function VerificationBadge({ verification, locale }: VerificationBadgeProps) {
  const t = useTranslations('verification');

  return (
    <div
      className={`rounded-lg border p-4 ${resultStyles[verification.result]}`}
    >
      <div className="flex items-start gap-3">
        <svg className="mt-0.5 h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={resultIcons[verification.result]}
          />
        </svg>
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {t(`result.${verification.result}`)}
          </p>
          <p className="mt-0.5 text-xs opacity-75">
            {t('date', { date: formatLocalDate(verification.date, locale) })}
          </p>
          <p className="mt-1 text-xs leading-relaxed">{verification.summary}</p>
          {verification.nextVerification && (
            <p className="mt-1 text-xs opacity-60">
              {t('nextDate', { date: formatLocalDate(verification.nextVerification, locale) })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
