import { useTranslations } from 'next-intl';
import { daysSinceElections } from '@/lib/utils';

export function CrisisCounter() {
  const t = useTranslations('counter');
  const days = daysSinceElections();

  return (
    <section className="bg-brand-900 py-16 text-white">
      <div className="mx-auto max-w-5xl px-4 text-center">
        <h1 className="mb-2 text-lg font-medium tracking-wide uppercase text-white/70">
          {t('title')}
        </h1>

        <div className="my-6">
          <span className="text-7xl font-bold tabular-nums tracking-tighter md:text-9xl">
            {days}
          </span>
          <p className="mt-2 text-xl text-white/80">
            {t('days', { count: days })}
          </p>
        </div>

        <p className="text-sm text-white/60">{t('since')}</p>

        <p className="mx-auto mt-8 max-w-2xl text-sm leading-relaxed text-white/70">
          {t('explanation')}
        </p>
      </div>
    </section>
  );
}
