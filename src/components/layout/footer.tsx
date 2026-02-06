import { useTranslations } from 'next-intl';

export function Footer() {
  const t = useTranslations('footer');

  return (
    <footer className="border-t border-neutral-200 bg-neutral-50">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm font-medium text-neutral-600">{t('project')}</p>
          <p className="text-xs text-neutral-400">{t('disclaimer')}</p>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-neutral-500">
            <a
              href="https://github.com/zoltan2/brussels-governance-monitor"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-neutral-700"
            >
              {t('license')}
            </a>
            <span className="text-neutral-300" aria-hidden="true">|</span>
            <span className="text-neutral-400">{t('editorial')}</span>
            <span className="text-neutral-300" aria-hidden="true">|</span>
            <span className="text-neutral-400">{t('privacy')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
