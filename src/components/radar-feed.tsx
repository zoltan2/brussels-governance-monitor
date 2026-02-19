import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { formatDate } from '@/lib/utils';
import type { LocalizedRadarEntry } from '@/lib/radar';

const CONFIDENCE_STYLES: Record<string, string> = {
  official: 'bg-blue-50 text-blue-700 border-blue-200',
  estimated: 'bg-amber-50 text-amber-700 border-amber-200',
  unconfirmed: 'bg-neutral-100 text-neutral-500 border-neutral-200',
};

export function RadarFeed({
  signals,
  locale,
}: {
  signals: LocalizedRadarEntry[];
  locale: string;
}) {
  const t = useTranslations('radar');

  return (
    <div className="py-6">
      <div className="mx-auto max-w-3xl px-4">
        <div className="rounded-lg border border-neutral-200 bg-white py-5">
          {/* Shield callout */}
          <div className="mx-5 mb-5 rounded-md border-l-4 border-blue-300 bg-blue-50/50 px-3 py-2.5">
            <p className="text-xs leading-relaxed text-neutral-600">
              {t('shieldText')}
            </p>
          </div>

          {/* Title */}
          <h2 className="mb-4 px-5 text-sm font-semibold uppercase tracking-wider text-neutral-900">
            {t('homepageTitle')}
          </h2>

          {/* Signals */}
          {signals.length === 0 ? (
            <p className="px-5 text-sm text-neutral-500">{t('noActiveSignals')}</p>
          ) : (
            <div className="space-y-3 px-5">
              {signals.map((signal) => (
                <div
                  key={signal.id}
                  className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3"
                >
                  <time
                    dateTime={signal.date}
                    className="shrink-0 text-xs tabular-nums text-neutral-400"
                  >
                    {formatDate(signal.date, locale)}
                  </time>
                  <p className="flex-1 text-sm leading-snug text-neutral-700">
                    {signal.description}
                  </p>
                  <span
                    className={`inline-flex shrink-0 self-start rounded-full border px-2 py-0.5 text-xs font-medium ${CONFIDENCE_STYLES[signal.confidence] ?? CONFIDENCE_STYLES.unconfirmed}`}
                  >
                    {t(`confidence.${signal.confidence}`)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Link to full radar */}
          <div className="mt-5 border-t border-neutral-100 px-5 pt-4">
            <Link
              href="/radar"
              className="text-xs font-medium text-brand-700 underline underline-offset-2 hover:text-brand-900"
            >
              {t('seeAll')} &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
