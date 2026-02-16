import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { routing } from '@/i18n/routing';
import { buildMetadata } from '@/lib/metadata';
import { Breadcrumb } from '@/components/breadcrumb';
import type { Metadata } from 'next';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const titles: Record<string, string> = { fr: 'Comment se forme un gouvernement bruxellois ?', nl: 'Hoe wordt een Brusselse regering gevormd?', en: 'How is a Brussels government formed?', de: 'Wie wird eine Brüsseler Regierung gebildet?' };
  const descriptions: Record<string, string> = {
    fr: 'Les étapes de la formation d\'un gouvernement bruxellois : informateur, formateur, accord, investiture.',
    nl: 'De stappen van de Brusselse regeringsvorming: informateur, formateur, akkoord, investituur.',
    en: 'The steps of forming a Brussels government: informateur, formateur, agreement, investiture.',
    de: 'Die Schritte der Brüsseler Regierungsbildung: Informateur, Formateur, Abkommen, Vereidigung.',
  };
  return buildMetadata({ locale, title: titles[locale] || titles.en, description: descriptions[locale] || descriptions.en, path: '/explainers/government-formation' });
}

export default async function GovernmentFormationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <GovernmentFormationView />;
}

function GovernmentFormationView() {
  const t = useTranslations('explainers.governmentFormation');
  const tb = useTranslations('breadcrumb');

  return (
    <section className="py-12">
      <div className="mx-auto max-w-5xl px-4">
        <Breadcrumb items={[
          { label: tb('home'), href: '/' },
          { label: tb('understand'), href: '/understand' },
          { label: t('title') },
        ]} />

        <h1 className="mb-4 text-2xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="mb-8 text-sm text-neutral-500">{t('subtitle')}</p>

        <div className="space-y-6 text-sm leading-relaxed text-neutral-700">
          <h2 className="text-lg font-semibold text-neutral-900">{t('steps.title')}</h2>
          <ol className="ml-4 list-decimal space-y-2">
            <li><strong>{t('steps.elections')}</strong> — {t('steps.electionsDesc')}</li>
            <li><strong>{t('steps.consultation')}</strong> — {t('steps.consultationDesc')}</li>
            <li><strong>{t('steps.formation')}</strong> — {t('steps.formationDesc')}</li>
            <li><strong>{t('steps.agreement')}</strong> — {t('steps.agreementDesc')}</li>
            <li><strong>{t('steps.government')}</strong> — {t('steps.governmentDesc')}</li>
          </ol>

          <h2 className="text-lg font-semibold text-neutral-900">{t('doubleMajority.title')}</h2>
          <p>{t('doubleMajority.description')}</p>

          {/* Election results 2024 */}
          <h2 className="text-lg font-semibold text-neutral-900">{t('elections2024.title')}</h2>
          <p>{t('elections2024.intro')}</p>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* FR group */}
            <div className="rounded-lg border border-neutral-200 p-4">
              <h3 className="mb-3 text-sm font-semibold text-neutral-900">{t('elections2024.frGroup')}</h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between"><span>MR</span><span className="font-medium">16</span></div>
                <div className="flex justify-between"><span>PS</span><span className="font-medium">14</span></div>
                <div className="flex justify-between"><span>Les Engagés</span><span className="font-medium">11</span></div>
                <div className="flex justify-between"><span>Ecolo</span><span className="font-medium">9</span></div>
                <div className="flex justify-between"><span>PTB-PVDA</span><span className="font-medium">8</span></div>
                <div className="flex justify-between"><span>DéFI</span><span className="font-medium">8</span></div>
                <div className="flex justify-between"><span>Team Ahidar</span><span className="font-medium">6</span></div>
              </div>
              <div className="mt-2 border-t border-neutral-100 pt-2 text-xs">
                <div className="flex justify-between font-semibold"><span>{t('elections2024.total')}</span><span>72</span></div>
                <div className="flex justify-between text-neutral-500"><span>{t('elections2024.majority')}</span><span>37</span></div>
              </div>
            </div>

            {/* NL group */}
            <div className="rounded-lg border border-neutral-200 p-4">
              <h3 className="mb-3 text-sm font-semibold text-neutral-900">{t('elections2024.nlGroup')}</h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between"><span>Groen</span><span className="font-medium">4</span></div>
                <div className="flex justify-between"><span>N-VA</span><span className="font-medium">4</span></div>
                <div className="flex justify-between"><span>Vooruit</span><span className="font-medium">3</span></div>
                <div className="flex justify-between"><span>Open VLD</span><span className="font-medium">3</span></div>
                <div className="flex justify-between"><span>CD&V</span><span className="font-medium">2</span></div>
                <div className="flex justify-between"><span>Vlaams Belang</span><span className="font-medium">1</span></div>
              </div>
              <div className="mt-2 border-t border-neutral-100 pt-2 text-xs">
                <div className="flex justify-between font-semibold"><span>{t('elections2024.total')}</span><span>17</span></div>
                <div className="flex justify-between text-neutral-500"><span>{t('elections2024.majority')}</span><span>9</span></div>
              </div>
            </div>
          </div>

          <p className="text-xs text-neutral-500">{t('elections2024.source')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('elections2024.arithmetic')}</h2>
          <p>{t('elections2024.arithmeticDesc')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('differenceFederal.title')}</h2>
          <p>{t('differenceFederal.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('currentCrisis.title')}</h2>
          <p>{t('currentCrisis.description')}</p>

          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
            <h2 className="mb-2 text-lg font-semibold text-neutral-900">{t('whyHarder.title')}</h2>
            <p>{t('whyHarder.description')}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
