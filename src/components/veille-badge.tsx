import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { getLastVeille } from '@/lib/radar';
import { formatDate } from '@/lib/utils';

export function VeilleBadge() {
  const t = useTranslations('veille');
  const locale = useLocale();
  const lastVeille = getLastVeille();

  return (
    <div className="border-b border-neutral-100 bg-neutral-50">
      <div className="mx-auto max-w-5xl px-4 py-1.5">
        <Link
          href="/data"
          className="text-xs text-neutral-500 hover:text-neutral-700"
        >
          {t('lastVeille')} : {formatDate(lastVeille, locale)}
        </Link>
      </div>
    </div>
  );
}
