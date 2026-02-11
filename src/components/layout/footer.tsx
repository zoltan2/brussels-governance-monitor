import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export function Footer() {
  const t = useTranslations('footer');

  return (
    <footer className="border-t border-neutral-200 bg-neutral-50">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          {/* Column 1: Content */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
              {t('contentTitle')}
            </p>
            <nav aria-label={t('contentTitle')} className="flex flex-col gap-2 text-xs text-neutral-500">
              <Link href="/timeline" className="hover:text-neutral-700">
                {t('timeline')}
              </Link>
              <Link href="/glossary" className="hover:text-neutral-700">
                {t('glossary')}
              </Link>
              <Link href="/faq" className="hover:text-neutral-700">
                {t('faq')}
              </Link>
              <Link href="/data" className="hover:text-neutral-700">
                {t('data')}
              </Link>
              <Link href="/comparisons" className="hover:text-neutral-700">
                {t('comparisons')}
              </Link>
            </nav>
          </div>

          {/* Column 2: About */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
              {t('aboutTitle')}
            </p>
            <nav aria-label={t('aboutTitle')} className="flex flex-col gap-2 text-xs text-neutral-500">
              <Link href="/editorial" className="hover:text-neutral-700">
                {t('editorial')}
              </Link>
              <Link href="/methodology" className="hover:text-neutral-700">
                {t('methodology')}
              </Link>
              <Link href="/how-to-read" className="hover:text-neutral-700">
                {t('howToRead')}
              </Link>
              <Link href="/privacy" className="hover:text-neutral-700">
                {t('privacy')}
              </Link>
              <Link href="/legal" className="hover:text-neutral-700">
                {t('legal')}
              </Link>
              <a
                href="https://github.com/zoltan2/brussels-governance-monitor"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-neutral-700"
              >
                {t('license')}
              </a>
            </nav>
          </div>
        </div>

        <div className="mt-8 border-t border-neutral-200 pt-6 text-center">
          <p className="text-sm font-medium text-neutral-600">{t('project')}</p>
          <p className="mt-1 text-xs text-neutral-400">{t('identity')}</p>
          <p className="mt-1 text-xs text-neutral-400">{t('disclaimer')}</p>
        </div>
      </div>
    </footer>
  );
}
