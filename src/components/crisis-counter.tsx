import { useTranslations } from 'next-intl';
import { daysSinceElections } from '@/lib/utils';
import { FormationPhase } from '@/components/formation-phase';

export function CrisisCounter({ currentPhase }: { currentPhase: string }) {
  const t = useTranslations('counter');
  const days = daysSinceElections();

  return (
    <section className="bg-gradient-to-b from-brand-900 to-brand-800 py-20 text-white">
      <div className="mx-auto max-w-5xl px-4 text-center">
        <h1 className="mb-4 text-sm font-semibold tracking-widest uppercase text-white/80">
          {t('title')}
        </h1>

        <div className="my-8">
          <span className="text-7xl font-extrabold tabular-nums tracking-tighter sm:text-8xl md:text-9xl">
            {days}
          </span>
          <p className="mt-3 text-xl font-medium text-white/80">
            {t('days', { count: days })}
          </p>
        </div>

        <p className="text-sm font-medium text-white/80">{t('since')}</p>

        <p className="mx-auto mt-10 max-w-2xl text-sm leading-relaxed text-white/80">
          {t('explanation')}
        </p>

        <div className="mx-auto mt-6 max-w-md">
          <FormationPhase currentPhase={currentPhase} variant="bar" theme="dark" />
        </div>
      </div>
    </section>
  );
}
