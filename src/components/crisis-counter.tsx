import { useTranslations } from 'next-intl';
import { FormationPhase } from '@/components/formation-phase';

export function CrisisCounter({ currentPhase }: { currentPhase: string }) {
  const t = useTranslations('counter');

  return (
    <section className="bg-gradient-to-b from-slate-800 to-slate-700 py-16 text-white">
      <div className="mx-auto max-w-5xl px-4 text-center">
        <p className="text-sm text-white/50">
          <span className="tabular-nums font-semibold">613</span> {t('archived')}
        </p>
        <p className="mt-1 text-sm font-medium text-white/70">{t('closed')}</p>

        <h1 className="mt-8 text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
          {t('pivot')}
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-white/70">
          {t('explanation')}
        </p>

        <p className="mt-4 text-sm font-medium tracking-wide text-white/90">
          {t('valueProp')}
        </p>

        <div className="mx-auto mt-8 max-w-md">
          <FormationPhase currentPhase={currentPhase} theme="dark" />
        </div>
      </div>
    </section>
  );
}
