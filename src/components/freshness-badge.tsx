import { useTranslations } from 'next-intl';

interface FreshnessBadgeProps {
  lastModified: string;
  locale: string;
}

function daysSince(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

export function FreshnessBadge({ lastModified, locale }: FreshnessBadgeProps) {
  const t = useTranslations('freshness');
  const days = daysSince(lastModified);

  let colorClass: string;
  let label: string;

  if (days <= 7) {
    colorClass = 'bg-teal-50 text-teal-700 border-teal-200';
    label = t('recent');
  } else if (days <= 30) {
    colorClass = 'bg-blue-50 text-blue-700 border-blue-200';
    label = t('current');
  } else if (days <= 90) {
    colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
    label = t('aging');
  } else {
    colorClass = 'bg-neutral-50 text-neutral-500 border-neutral-200';
    label = t('stale');
  }

  const formattedDate = new Date(lastModified).toLocaleDateString(
    locale === 'fr' ? 'fr-BE' : locale === 'nl' ? 'nl-BE' : locale === 'de' ? 'de-DE' : 'en-GB',
    { day: 'numeric', month: 'short', year: 'numeric' },
  );

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${colorClass}`}
    >
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      {label} · {formattedDate}
    </div>
  );
}
