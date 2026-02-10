import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { formatDate } from '@/lib/utils';
import type { FormationEvent } from '@/lib/content';

export function LatestEvent({
  event,
  locale,
}: {
  event: FormationEvent;
  locale: string;
}) {
  const t = useTranslations('home');
  const tt = useTranslations('timeline');

  return (
    <section className="border-y border-neutral-200 bg-neutral-50/50 py-6">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-brand-700">
              {t('latestEvent')} — <time dateTime={event.date}>{formatDate(event.date, locale)}</time>
            </p>
            <p className="text-sm text-neutral-700">{event.summary}</p>
            <span className="mt-1 inline-block rounded-sm bg-neutral-200 px-2 py-0.5 text-xs text-neutral-600">
              {tt(`eventTypes.${event.eventType}`)}
            </span>
          </div>
          <Link
            href="/timeline"
            className="mt-2 shrink-0 text-sm font-medium text-brand-700 underline underline-offset-2 hover:text-brand-900 sm:mt-0"
          >
            {t('viewTimeline')}
          </Link>
        </div>
      </div>
    </section>
  );
}
