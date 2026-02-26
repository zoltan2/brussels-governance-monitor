import { Link } from '@/i18n/navigation';

const labels: Record<string, { title: string; cta: string }> = {
  fr: { title: 'Contexte hérité (juin 2024 \u2013 février 2026)', cta: 'Lire le contexte complet' },
  nl: { title: 'Geërfde context (juni 2024 \u2013 februari 2026)', cta: 'Lees de volledige context' },
  en: { title: 'Inherited context (June 2024 \u2013 February 2026)', cta: 'Read full context' },
  de: { title: 'Geerbter Kontext (Juni 2024 \u2013 Februar 2026)', cta: 'Vollständigen Kontext lesen' },
};

const heritageSummaries: Record<string, Record<string, string>> = {
  fr: {
    budget: 'Durant 20 mois d\u2019affaires courantes, la Région a fonctionné en douzièmes provisoires. La dette a triplé (passant de 3,7 à 11,5 milliards EUR), les investissements ont été gelés et les communes ont accumulé des déficits.',
    mobility: 'Good Move, le Métro 3, la LEZ et les contrats de gestion de la STIB étaient bloqués ou en contentieux. Les infrastructures cyclables et les plans de circulation ont été suspendus.',
    employment: 'La Région a fait face à une double crise : un chômage structurel élevé (15,4 %) et l\u2019annonce de la réforme fédérale du chômage menaçant 42 000 Bruxellois d\u2019exclusion. Le dialogue social était au point mort.',
    housing: 'La liste d\u2019attente pour un logement social a dépassé 62 000 ménages. Le Fonds du Logement a été mis à l\u2019arrêt, les services de crédit suspendus, le marché locatif s\u2019est grippé et les prix à l\u2019achat ont continué d\u2019augmenter.',
    climate: 'Les primes Renolution ont été ralenties, le Plan Air-Climat-Énergie (PACE) était à l\u2019arrêt et la trajectoire vers les objectifs 2030 s\u2019est dégradée. 20 mois de retard ont été accumulés.',
    social: 'Les CPAS étaient sous pression croissante, les investissements COCOM gelés, les allocations familiales sous tension et la politique sans-abri à l\u2019arrêt. 9 777 sans-abri ont été dénombrés dont 1 678 mineurs.',
    security: 'Le rapport safe.brussels 2024 a documenté l\u2019état de la criminalité : vols avec violence en hausse, problématique drogue persistante dans les gares, pression sur les zones de police.',
    economy: 'Le secteur de la construction a perdu 1 822 entreprises en un an, les faillites ont augmenté et la confiance des investisseurs s\u2019est dégradée durant l\u2019absence de gouvernement de plein exercice.',
    cleanliness: 'Les dépôts clandestins ont alimenté un \u00ab tourisme des déchets \u00bb entre communes, et la collecte de protoxyde d\u2019azote est devenue un défi opérationnel nouveau.',
    institutional: 'Pas de contenu hérité significatif \u2014 ce domaine concerne principalement les réformes institutionnelles en cours.',
    'urban-planning': 'Les organismes clés (urban.brussels, BMA, Perspective, CRMS) ont continué de fonctionner en mode courant, mais sans nouvelles orientations politiques.',
    digital: 'Les organismes clés (Paradigm/CIRB, Easy Brussels, Hub.Brussels) ont fonctionné en mode courant, sans impulsion politique nouvelle.',
    education: 'La gouvernance de l\u2019enseignement à Bruxelles, éclatée entre Communautés et commissions communautaires (Cocof, VGC), est restée sans coordination régionale nouvelle.',
  },
  nl: {
    budget: 'Gedurende 20 maanden lopende zaken functioneerde het Gewest met voorlopige twaalfden. De schuld is verdrievoudigd (van 3,7 naar 11,5 miljard EUR), investeringen werden bevroren en gemeenten stapelden tekorten op.',
    mobility: 'Good Move, Metro 3, de LEZ en de beheerscontracten van de MIVB waren geblokkeerd of in geschil. Fietsinfrastructuur en circulatieplannen werden opgeschort.',
    employment: 'Het Gewest werd geconfronteerd met een dubbele crisis: hoge structurele werkloosheid (15,4%) en de aangekondigde federale hervorming die 42.000 Brusselaars met uitsluiting bedreigt. Het sociaal overleg lag stil.',
    housing: 'De wachtlijst voor sociale huisvesting overschreed 62.000 gezinnen. Het Woningfonds werd stopgezet, kredietdiensten opgeschort, de huurmarkt verkrampte en de aankoopprijzen bleven stijgen.',
    climate: 'De Renolution-premies werden vertraagd, het Lucht-Klimaat-Energieplan (LKEP) lag stil en het traject naar de 2030-doelstellingen verslechterde. 20 maanden vertraging werden opgestapeld.',
    social: 'De OCMW\u2019s stonden onder toenemende druk, GGC-investeringen waren bevroren, kinderbijslag onder spanning en het daklozenbeleid lag stil. 9.777 daklozen werden geteld, waaronder 1.678 minderjarigen.',
    security: 'Het safe.brussels-rapport 2024 documenteerde de criminaliteitssituatie: gewelddadige diefstallen in stijging, aanhoudende drugsproblematiek in stations, druk op politiezones.',
    economy: 'De bouwsector verloor 1.822 ondernemingen in een jaar, faillissementen namen toe en het investeerdersvertrouwen verslechterde tijdens de afwezigheid van een volwaardige regering.',
    cleanliness: 'Sluikstorten voedden een \u00ab afvaltoerisme \u00bb tussen gemeenten, en de inzameling van lachgas werd een nieuwe operationele uitdaging.',
    institutional: 'Geen significant geërfde context \u2014 dit domein betreft voornamelijk lopende institutionele hervormingen.',
    'urban-planning': 'De belangrijkste organisaties (urban.brussels, BMA, Perspective, KCML) bleven functioneren in lopende modus, maar zonder nieuwe politieke oriëntaties.',
    digital: 'De belangrijkste organisaties (Paradigm/CIBG, Easy Brussels, Hub.Brussels) functioneerden in lopende modus, zonder nieuwe politieke impuls.',
    education: 'Het onderwijsbestuur in Brussel, verdeeld tussen Gemeenschappen en gemeenschapscommissies (Cocof, VGC), bleef zonder nieuwe regionale coördinatie.',
  },
  en: {
    budget: 'During 20 months of caretaker government, the Region operated on provisional twelfths. Debt tripled (from 3.7 to 11.5 billion EUR), investments were frozen and municipalities accumulated deficits.',
    mobility: 'Good Move, Metro 3, the LEZ and STIB management contracts were blocked or in litigation. Cycling infrastructure and traffic plans were suspended.',
    employment: 'The Region faced a double crisis: high structural unemployment (15.4%) and the announced federal reform threatening 42,000 Brussels residents with exclusion. Social dialogue was at a standstill.',
    housing: 'The social housing waiting list exceeded 62,000 households. The Housing Fund was halted, credit services suspended, the rental market seized up and purchase prices continued to rise.',
    climate: 'Renolution premiums were slowed, the Air-Climate-Energy Plan (PACE) was stalled and the trajectory toward 2030 targets deteriorated. 20 months of delay accumulated.',
    social: 'CPAS/OCMW centres were under growing pressure, COCOM investments frozen, family allowances under strain and homelessness policy stalled. 9,777 homeless people were counted including 1,678 minors.',
    security: 'The safe.brussels 2024 report documented the crime situation: violent thefts rising, persistent drug issues at stations, pressure on police zones.',
    economy: 'The construction sector lost 1,822 companies in one year, bankruptcies increased and investor confidence deteriorated during the absence of a full government.',
    cleanliness: 'Illegal dumps fuelled "waste tourism" between municipalities, and nitrous oxide collection became a new operational challenge.',
    institutional: 'No significant inherited context \u2014 this domain mainly concerns ongoing institutional reforms.',
    'urban-planning': 'Key bodies (urban.brussels, BMA, Perspective, CRMS) continued operating in caretaker mode, but without new policy direction.',
    digital: 'Key bodies (Paradigm/CIRB, Easy Brussels, Hub.Brussels) operated in caretaker mode, without new policy impetus.',
    education: 'Education governance in Brussels, split between Communities and community commissions (Cocof, VGC), remained without new regional coordination.',
  },
  de: {
    budget: 'Während 20 Monaten geschäftsführender Regierung arbeitete die Region mit vorläufigen Zwölfteln. Die Schulden verdreifachten sich (von 3,7 auf 11,5 Milliarden EUR), Investitionen wurden eingefroren und Gemeinden häuften Defizite an.',
    mobility: 'Good Move, Metro 3, die LEZ und die STIB-Verwaltungsverträge waren blockiert oder strittig. Fahrradinfrastruktur und Verkehrspläne wurden ausgesetzt.',
    employment: 'Die Region sah sich einer Doppelkrise gegenüber: hohe strukturelle Arbeitslosigkeit (15,4 %) und die angekündigte Bundesreform, die 42.000 Brüsseler mit Ausschluss bedroht. Der soziale Dialog stand still.',
    housing: 'Die Warteliste für Sozialwohnungen überschritt 62.000 Haushalte. Der Wohnungsfonds wurde gestoppt, Kreditdienste ausgesetzt, der Mietmarkt verkrampfte und die Kaufpreise stiegen weiter.',
    climate: 'Die Renolution-Prämien wurden verlangsamt, der Luft-Klima-Energieplan (PACE) stand still und der Kurs zu den 2030-Zielen verschlechterte sich. 20 Monate Rückstand wurden angehäuft.',
    social: 'Die ÖSHZ standen unter wachsendem Druck, GGK-Investitionen waren eingefroren, Familienbeihilfen unter Spannung und die Obdachlosenpolitik stand still. 9.777 Obdachlose wurden gezählt, darunter 1.678 Minderjährige.',
    security: 'Der safe.brussels-Bericht 2024 dokumentierte die Kriminalitätslage: Gewaltdiebstähle zunehmend, anhaltende Drogenproblematik an Bahnhöfen, Druck auf Polizeizonen.',
    economy: 'Der Bausektor verlor 1.822 Unternehmen in einem Jahr, Insolvenzen nahmen zu und das Investorenvertrauen verschlechterte sich während der Abwesenheit einer Vollregierung.',
    cleanliness: 'Illegale Ablagerungen nährten einen \u00ab Mülltourismus \u00bb zwischen Gemeinden, und die Sammlung von Lachgas wurde eine neue operative Herausforderung.',
    institutional: 'Kein signifikanter geerbter Kontext \u2014 dieser Bereich betrifft hauptsächlich laufende institutionelle Reformen.',
    'urban-planning': 'Die wichtigsten Stellen (urban.brussels, BMA, Perspective, KCML) arbeiteten im laufenden Modus weiter, jedoch ohne neue politische Ausrichtung.',
    digital: 'Die wichtigsten Stellen (Paradigm/CIRB, Easy Brussels, Hub.Brussels) arbeiteten im laufenden Modus, ohne neuen politischen Impuls.',
    education: 'Die Bildungsverwaltung in Brüssel, aufgeteilt zwischen Gemeinschaften und Gemeinschaftskommissionen (Cocof, VGC), blieb ohne neue regionale Koordination.',
  },
};

export function HeritageCallout({ domain, locale }: { domain: string; locale: string }) {
  const l = labels[locale] ?? labels.fr;
  const summaries = heritageSummaries[locale] ?? heritageSummaries.fr;
  const summary = summaries[domain];

  if (!summary) return null;

  return (
    <div className="my-8 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <div className="mb-2 flex items-center gap-2">
        <svg className="h-4 w-4 shrink-0 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{l.title}</span>
      </div>
      <p className="text-xs leading-relaxed text-neutral-600">{summary}</p>
      <Link
        href={{ pathname: '/archives/[slug]', params: { slug: 'heritage-gouvernemental' } }}
        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-900"
      >
        {l.cta}
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
}
