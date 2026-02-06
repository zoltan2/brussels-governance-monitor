import { useTranslations } from 'next-intl';

export function Footer() {
  const t = useTranslations('footer');

  return (
    <footer className="border-t border-neutral-200 bg-neutral-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-col items-center gap-4 text-center text-sm text-neutral-500">
          <p>{t('project')}</p>
          <p className="text-xs text-neutral-400">{t('disclaimer')}</p>
          <div className="flex gap-4 text-xs">
            <a
              href="https://github.com/advice-that/brussels-governance-monitor"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-neutral-700"
            >
              {t('license')}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
