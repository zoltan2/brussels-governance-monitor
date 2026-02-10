import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { routing } from '@/i18n/routing';
import { buildMetadata } from '@/lib/metadata';
import { Link } from '@/i18n/navigation';
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
  const titles: Record<string, string> = { fr: 'Qui décide quoi à Bruxelles ?', nl: 'Wie beslist wat in Brussel?', en: 'Who decides what in Brussels?', de: 'Wer entscheidet was in Brüssel?' };
  const descriptions: Record<string, string> = {
    fr: 'Fédéral, régional, communautaire, communal : les niveaux de pouvoir à Bruxelles expliqués.',
    nl: 'Federaal, gewestelijk, gemeenschaps-, gemeentelijk: de machtsniveaus in Brussel uitgelegd.',
    en: 'Federal, regional, community, municipal: the levels of power in Brussels explained.',
    de: 'Bundes-, Regional-, Gemeinschafts-, Gemeindeebene: die Machtebenen in Brüssel erklärt.',
  };
  return buildMetadata({ locale, title: titles[locale] || titles.en, description: descriptions[locale] || descriptions.en, path: '/explainers/levels-of-power' });
}

export default async function LevelsOfPowerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LevelsOfPowerView />;
}

function LevelsOfPowerView() {
  const t = useTranslations('explainers.levelsOfPower');
  const tb = useTranslations('breadcrumb');

  return (
    <section className="py-12">
      <div className="mx-auto max-w-3xl px-4">
        <Breadcrumb items={[
          { label: tb('home'), href: '/' },
          { label: tb('understand'), href: '/explainers/brussels-overview' },
          { label: t('title') },
        ]} />

        <h1 className="mb-4 text-2xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="mb-8 text-sm text-neutral-500">{t('subtitle')}</p>

        <div className="space-y-8 text-sm leading-relaxed text-neutral-700">
          {/* Introduction */}
          <p>{t('intro')}</p>

          {/* Overview table */}
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-3 py-2 font-semibold text-neutral-900">{t('table.level')}</th>
                  <th className="px-3 py-2 font-semibold text-neutral-900">{t('table.examples')}</th>
                  <th className="px-3 py-2 font-semibold text-neutral-900">{t('table.crisisStatus')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                <tr>
                  <td className="px-3 py-2 font-medium">{t('table.eu')}</td>
                  <td className="px-3 py-2">{t('table.euExamples')}</td>
                  <td className="px-3 py-2 text-status-ongoing">{t('table.euStatus')}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">{t('table.federal')}</td>
                  <td className="px-3 py-2">{t('table.federalExamples')}</td>
                  <td className="px-3 py-2 text-status-ongoing">{t('table.federalStatus')}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">{t('table.region')}</td>
                  <td className="px-3 py-2">{t('table.regionExamples')}</td>
                  <td className="px-3 py-2 font-semibold text-status-blocked">{t('table.regionStatus')}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">{t('table.communities')}</td>
                  <td className="px-3 py-2">{t('table.communitiesExamples')}</td>
                  <td className="px-3 py-2 text-status-delayed">{t('table.communitiesStatus')}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">{t('table.communes')}</td>
                  <td className="px-3 py-2">{t('table.communesExamples')}</td>
                  <td className="px-3 py-2 text-status-ongoing">{t('table.communesStatus')}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">{t('table.pararegional')}</td>
                  <td className="px-3 py-2">{t('table.pararegionalExamples')}</td>
                  <td className="px-3 py-2 text-status-delayed">{t('table.pararegionalStatus')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* EU */}
          <h2 className="text-lg font-semibold text-neutral-900">{t('eu.title')}</h2>
          <p>{t('eu.role')}</p>
          <p>{t('eu.impact')}</p>

          {/* Federal */}
          <h2 className="text-lg font-semibold text-neutral-900">{t('federal.title')}</h2>
          <p>{t('federal.competences')}</p>
          <p>{t('federal.asymmetry')}</p>

          {/* Regions */}
          <h2 className="text-lg font-semibold text-neutral-900">{t('regions.title')}</h2>
          <p>{t('regions.comparison')}</p>
          <p>{t('regions.consequences')}</p>

          {/* Communities */}
          <h2 className="text-lg font-semibold text-neutral-900">{t('communities.title')}</h2>
          <p>{t('communities.cocom')}</p>
          <p>{t('communities.cocofVgc')}</p>

          {/* Communes */}
          <h2 className="text-lg font-semibold text-neutral-900">{t('communes.title')}</h2>
          <p>{t('communes.role')}</p>
          <p>{t('communes.disparities')}</p>

          {/* Provinces */}
          <h2 className="text-lg font-semibold text-neutral-900">{t('provinces.title')}</h2>
          <p>{t('provinces.exception')}</p>
          <p>{t('provinces.consequence')}</p>

          {/* Para-regional */}
          <h2 className="text-lg font-semibold text-neutral-900">{t('pararegional.title')}</h2>
          <p>{t('pararegional.organisms')}</p>
          <p>{t('pararegional.limits')}</p>

          {/* Police zones */}
          <h2 className="text-lg font-semibold text-neutral-900">{t('policeZones.title')}</h2>
          <p>{t('policeZones.description')}</p>

          {/* Who decides what */}
          <h2 className="text-lg font-semibold text-neutral-900">{t('whoDecidesWhat.title')}</h2>
          <p>{t('whoDecidesWhat.intro')}</p>
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-3 py-2 font-semibold text-neutral-900">{t('table.level')}</th>
                  <th className="px-3 py-2 font-semibold text-neutral-900">{t('table.examples')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                <tr>
                  <td className="px-3 py-2 font-medium">{t('whoDecidesWhat.budget')}</td>
                  <td className="px-3 py-2">{t('whoDecidesWhat.budgetWho')}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">{t('whoDecidesWhat.housing')}</td>
                  <td className="px-3 py-2">{t('whoDecidesWhat.housingWho')}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">{t('whoDecidesWhat.transport')}</td>
                  <td className="px-3 py-2">{t('whoDecidesWhat.transportWho')}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">{t('whoDecidesWhat.employment')}</td>
                  <td className="px-3 py-2">{t('whoDecidesWhat.employmentWho')}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">{t('whoDecidesWhat.health')}</td>
                  <td className="px-3 py-2">{t('whoDecidesWhat.healthWho')}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">{t('whoDecidesWhat.environment')}</td>
                  <td className="px-3 py-2">{t('whoDecidesWhat.environmentWho')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Where is the blockage */}
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
            <h2 className="mb-2 text-lg font-semibold text-neutral-900">{t('blockage.title')}</h2>
            <p>{t('blockage.description')}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
