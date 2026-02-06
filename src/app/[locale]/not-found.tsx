import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function NotFound() {
  const t = useTranslations('notFound');

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-4 text-6xl font-bold text-neutral-200">404</h1>
      <h2 className="mb-2 text-xl font-semibold text-neutral-900">{t('title')}</h2>
      <p className="mb-8 text-sm text-neutral-500">{t('description')}</p>
      <Link
        href="/"
        className="rounded-md bg-brand-900 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
      >
        {t('backHome')}
      </Link>
    </div>
  );
}
