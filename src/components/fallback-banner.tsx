import { useTranslations } from 'next-intl';

interface FallbackBannerProps {
  targetLocale: string;
}

export function FallbackBanner({ targetLocale }: FallbackBannerProps) {
  const t = useTranslations('fallback');

  const localeNames: Record<string, string> = {
    nl: 'Nederlandse',
    en: 'English',
    de: 'Deutsche',
  };

  return (
    <div className="rounded-md border border-status-delayed/30 bg-status-delayed/10 px-4 py-2 text-sm text-status-delayed">
      {t('banner', { locale: localeNames[targetLocale] || targetLocale })}
    </div>
  );
}
