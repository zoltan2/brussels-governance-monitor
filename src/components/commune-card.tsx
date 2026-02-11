import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { CommuneCard as CommuneCardType } from '@/lib/content';
import { TransparencyScoreBadge } from '@/components/transparency-grid';

interface CommuneCardProps {
  card: CommuneCardType;
}

export function CommuneCard({ card }: CommuneCardProps) {
  const t = useTranslations('communes');

  const activeAlerts = card.alerts.filter((a) => a.severity !== 'info').length;

  return (
    <Link
      href={{ pathname: '/communes/[slug]', params: { slug: card.slug } }}
      className="flex flex-col rounded-lg border border-neutral-200 bg-white p-5 transition-shadow hover:shadow-md"
    >
      <h2 className="mb-2 text-base font-semibold text-neutral-900">{card.title}</h2>

      <div className="mb-3 text-xs text-neutral-500">
        <span>{card.mayor} ({card.mayorParty})</span>
        <span className="mx-1.5">·</span>
        <span>{card.coalition.join(', ')}</span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
        <span>{card.population.toLocaleString('fr-BE')} {t('population').toLowerCase()}</span>
        <span>·</span>
        <span>{card.councilSeats} {t('councilSeats').toLowerCase()}</span>
      </div>

      <div className="mt-auto flex items-center justify-between pt-2">
        <TransparencyScoreBadge score={card.transparencyScore} total={card.transparencyTotal} />
        {activeAlerts > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-status-delayed">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {activeAlerts}
          </span>
        )}
      </div>
    </Link>
  );
}
