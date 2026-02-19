import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Shield, ArrowRight } from 'lucide-react';

export function CrisisCounter() {
  const t = useTranslations('counter');
  const th = useTranslations('home');

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

        {/* Identity callout */}
        <div className="mx-auto mt-8 max-w-lg rounded-lg border border-white/10 bg-white/5 px-5 py-4 text-left">
          <div className="flex items-start gap-3">
            <Shield size={18} className="mt-0.5 shrink-0 text-white/50" aria-hidden={true} />
            <div>
              <p className="text-sm font-medium text-white/90">{th('identity')}</p>
              <p className="mt-0.5 text-xs text-white/60">{th('identityDetail')}</p>
              <Link
                href="/about"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-white/80 underline underline-offset-2 hover:text-white"
              >
                {th('identityLink')}
                <ArrowRight size={12} className="text-white/60" aria-hidden={true} />
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-6 text-sm font-medium tracking-wide text-white/90">
          {t('valueProp')}
        </p>
      </div>
    </section>
  );
}
