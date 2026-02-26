import { Link } from '@/i18n/navigation';

const labels: Record<string, { title: string; cta: string }> = {
  fr: { title: 'Contexte hérité (juin 2024 \u2013 février 2026)', cta: 'Lire le contexte complet' },
  nl: { title: 'Geërfde context (juni 2024 \u2013 februari 2026)', cta: 'Lees de volledige context' },
  en: { title: 'Inherited context (June 2024 \u2013 February 2026)', cta: 'Read full context' },
  de: { title: 'Geerbter Kontext (Juni 2024 \u2013 Februar 2026)', cta: 'Vollständigen Kontext lesen' },
};

/* ── Domain summaries (6 + 7 minor) ── */
const domainSummaries: Record<string, Record<string, string>> = {
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

/* ── Sector summaries (11 sectors) ── */
const sectorSummaries: Record<string, Record<string, string>> = {
  fr: {
    nonprofit: 'Les conventions pluriannuelles expirées n\u2019ont pu être renouvelées, les agréments gelés et les subventions facultatives suspendues. Plus de 5 000 associations et 105 000 travailleurs non marchands ont été affectés.',
    construction: 'Les PAD (Plans d\u2019Aménagement Directeur) étaient gelés, bloquant Neo, Gare du Midi, Delta et Casernes. Le secteur a perdu 1 402 entreprises en 2024, et 800 logements restaient bloqués par le moratoire sur les friches.',
    'health-social': 'Les agréments Iriscare étaient gelés, les conventions non renouvelées et le plan sans-abri à l\u2019arrêt. Zéro nouvel agrément entre juin 2024 et février 2026, avec des listes d\u2019attente de plusieurs mois en santé mentale.',
    horeca: 'Les subventions saisonnières, permis de terrasse et la politique touristique étaient gelés. Le secteur (9 000 établissements, 35 000 emplois) a subi 17 % des faillites régionales en 2025, aggravé par le doublement de la TVA hôtelière fédérale.',
    culture: 'Les subventions culturelles régionales, le cofinancement des festivals et les budgets des centres culturels étaient gelés. Environ 300 institutions subsidiées et 15 000 emplois culturels affectés, avec des coupes de la FWB (\u22129,12M EUR).',
    transport: 'Le plan d\u2019investissement STIB, les arbitrages régionaux du Métro 3 et les nouvelles lignes étaient bloqués. Le Métro 3 a été abandonné dans sa forme actuelle (coût : 4,76 Mrd EUR, dépassement de +477 %).',
    education: 'Les nouveaux programmes de Bruxelles Formation, les rénovations d\u2019infrastructure scolaire et les projets bilingues pilotes étaient gelés. 28 % de chômage chez les jeunes, 10 000 places de crèche manquantes.',
    digital: 'La stratégie Smart City, les subsides d\u2019inclusion numérique et les incitants startups étaient gelés. 40 % de vulnérabilité numérique (~300 000 Bruxellois), sans nouvelle impulsion politique.',
    environment: 'Les primes Renolution chauffage, le Blue Deal et le plan biodiversité étaient gelés. 75 % des bâtiments bruxellois classés PEB D ou inférieur, 15 000 demandes Renolution en attente.',
    commerce: 'Les programmes de revitalisation commerciale, les subsides et la stratégie économie de nuit étaient gelés. 13,5 % de cellules commerciales vides, 60 000 établissements sans soutien nouveau.',
    'housing-sector': 'Les nouveaux programmes de logement social, la mise à jour de la régulation locative et le plan d\u2019investissement SLRB étaient bloqués. La SLRB, endettée à 197M EUR, a dû vendre les sites Ariane et Palais.',
  },
  nl: {
    nonprofit: 'Verlopen meerjarige overeenkomsten konden niet worden vernieuwd, erkenningen werden bevroren en facultatieve subsidies opgeschort. Meer dan 5.000 verenigingen en 105.000 non-profitwerkers werden getroffen.',
    construction: 'De RPA\u2019s (Richtplannen van Aanleg) waren bevroren, waardoor Neo, Zuidstation, Delta en Kazernes geblokkeerd bleven. De sector verloor 1.402 ondernemingen in 2024, en 800 woningen bleven geblokkeerd door het moratorium op braakliggende terreinen.',
    'health-social': 'Iriscare-erkenningen waren bevroren, overeenkomsten niet vernieuwd en het daklozenplan stilgelegd. Nul nieuwe erkenningen tussen juni 2024 en februari 2026, met wachtlijsten van meerdere maanden in de geestelijke gezondheidszorg.',
    horeca: 'Seizoenssubsidies, terrasvergunningen en toerismebeleid waren bevroren. De sector (9.000 vestigingen, 35.000 banen) leed onder 17 % van de regionale faillissementen in 2025, verergerd door de verdubbeling van het federale hotel-btw-tarief.',
    culture: 'Regionale cultuursubsidies, festivalcofinanciering en budgetten van culturele centra waren bevroren. Circa 300 gesubsidieerde instellingen en 15.000 culturele banen getroffen, met bijkomende besparingen van de FWB (\u22129,12M EUR).',
    transport: 'Het MIVB-investeringsplan, de regionale arbitrages voor Metro 3 en nieuwe lijnen waren geblokkeerd. Metro 3 werd in zijn huidige vorm verlaten (kosten: 4,76 Mrd EUR, overschrijding van +477 %).',
    education: 'Nieuwe programma\u2019s van Bruxelles Formation, schoolinfrastructuurrenovaties en tweetalige pilootprojecten waren bevroren. 28 % jeugdwerkloosheid, 10.000 ontbrekende kinderopvangplaatsen.',
    digital: 'De Smart City-strategie, digitale inclusiesubsidies en startup-incentives waren bevroren. 40 % digitale kwetsbaarheid (~300.000 Brusselaars), zonder nieuwe politieke impuls.',
    environment: 'De Renolution-verwarmingspremies, het Blue Deal en het biodiversiteitsplan waren bevroren. 75 % van de Brusselse gebouwen is PEB D of lager geklasseerd, 15.000 Renolution-aanvragen in afwachting.',
    commerce: 'Programma\u2019s voor commerciële revitalisering, subsidies en de strategie voor de nachteconomie waren bevroren. 13,5 % leegstand in commerciële panden, 60.000 handelszaken zonder nieuwe steun.',
    'housing-sector': 'Nieuwe sociale huisvestingsprogramma\u2019s, de actualisering van de huurregulering en het BGHM-investeringsplan waren geblokkeerd. De BGHM, met een schuld van 197M EUR, moest de sites Ariane en Palais verkopen.',
  },
  en: {
    nonprofit: 'Expired multi-year conventions could not be renewed, approvals were frozen and optional subsidies suspended. Over 5,000 associations and 105,000 non-market workers were affected.',
    construction: 'Territorial Planning Documents (PAD) were frozen, blocking Neo, Gare du Midi, Delta and Casernes. The sector lost 1,402 companies in 2024, and 800 housing units remained blocked by the brownfield moratorium.',
    'health-social': 'Iriscare approvals were frozen, conventions not renewed and the homelessness plan stalled. Zero new approvals between June 2024 and February 2026, with waiting lists of several months for mental health care.',
    horeca: 'Seasonal subsidies, terrace permits and tourism policy were frozen. The sector (9,000 establishments, 35,000 jobs) suffered 17% of regional bankruptcies in 2025, worsened by the doubling of the federal hotel VAT rate.',
    culture: 'Regional cultural subsidies, festival co-financing and cultural centre budgets were frozen. Around 300 subsidised institutions and 15,000 cultural jobs affected, with additional FWB cuts (\u22129.12M EUR).',
    transport: 'The STIB investment plan, regional Metro 3 arbitrations and new lines were blocked. Metro 3 was abandoned in its current form (cost: 4.76 bn EUR, +477% overrun).',
    education: 'New Bruxelles Formation programmes, school infrastructure renovations and bilingual pilot projects were frozen. 28% youth unemployment, 10,000 missing childcare places.',
    digital: 'The Smart City strategy, digital inclusion subsidies and startup incentives were frozen. 40% digital vulnerability (~300,000 Brussels residents), without new policy impetus.',
    environment: 'Renolution heating premiums, the Blue Deal and the biodiversity plan were frozen. 75% of Brussels buildings rated PEB D or lower, 15,000 Renolution applications pending.',
    commerce: 'Commercial revitalisation programmes, subsidies and the night economy strategy were frozen. 13.5% empty retail units, 60,000 commercial establishments without new support.',
    'housing-sector': 'New social housing programmes, rental regulation updates and the SLRB investment plan were blocked. The SLRB, indebted at 197M EUR, had to sell the Ariane and Palais sites.',
  },
  de: {
    nonprofit: 'Abgelaufene Mehrjahresvereinbarungen konnten nicht erneuert werden, Genehmigungen wurden eingefroren und fakultative Zuschüsse ausgesetzt. Über 5.000 Vereine und 105.000 Non-Profit-Beschäftigte waren betroffen.',
    construction: 'Die Richtpläne (PAD) waren eingefroren, wodurch Neo, Südbahnhof, Delta und Kasernen blockiert blieben. Der Sektor verlor 1.402 Unternehmen 2024, und 800 Wohnungen blieben durch das Brachflächen-Moratorium blockiert.',
    'health-social': 'Iriscare-Genehmigungen waren eingefroren, Vereinbarungen nicht erneuert und der Obdachlosenplan gestoppt. Null neue Genehmigungen zwischen Juni 2024 und Februar 2026, mit mehrmonatigen Wartelisten für psychische Gesundheitsversorgung.',
    horeca: 'Saisonsubventionen, Terrassengenehmigungen und Tourismuspolitik waren eingefroren. Der Sektor (9.000 Betriebe, 35.000 Arbeitsplätze) erlitt 17 % der regionalen Insolvenzen 2025, verschärft durch die Verdopplung des föderalen Hotel-MwSt-Satzes.',
    culture: 'Regionale Kultursubventionen, Festivalkofinanzierung und Budgets der Kulturzentren waren eingefroren. Rund 300 subventionierte Einrichtungen und 15.000 Kulturarbeitsplätze betroffen, mit zusätzlichen FWB-Kürzungen (\u22129,12 Mio. EUR).',
    transport: 'Der STIB-Investitionsplan, die regionalen Metro-3-Schiedsverfahren und neue Linien waren blockiert. Metro 3 wurde in seiner aktuellen Form aufgegeben (Kosten: 4,76 Mrd. EUR, +477 % Überschreitung).',
    education: 'Neue Programme von Bruxelles Formation, Schulinfrastrukturrenovierungen und zweisprachige Pilotprojekte waren eingefroren. 28 % Jugendarbeitslosigkeit, 10.000 fehlende Kinderbetreuungsplätze.',
    digital: 'Die Smart-City-Strategie, Zuschüsse für digitale Inklusion und Startup-Anreize waren eingefroren. 40 % digitale Verwundbarkeit (~300.000 Brüsseler), ohne neuen politischen Impuls.',
    environment: 'Die Renolution-Heizungsprämien, der Blue Deal und der Biodiversitätsplan waren eingefroren. 75 % der Brüsseler Gebäude mit PEB D oder niedriger bewertet, 15.000 Renolution-Anträge ausstehend.',
    commerce: 'Programme zur Handelsrevitalisierung, Subventionen und die Nachtökonomie-Strategie waren eingefroren. 13,5 % Leerstand bei Geschäftsflächen, 60.000 Handelsbetriebe ohne neue Unterstützung.',
    'housing-sector': 'Neue Sozialwohnungsprogramme, Aktualisierungen der Mietregulierung und der SLRB-Investitionsplan waren blockiert. Die SLRB, mit 197 Mio. EUR verschuldet, musste die Standorte Ariane und Palais verkaufen.',
  },
};

const archiveSlugs: Record<string, string> = {
  domain: 'heritage-gouvernemental',
  sector: 'heritage-sectoriel',
};

export function HeritageCallout({ slug, locale, type = 'domain' }: { slug: string; locale: string; type?: 'domain' | 'sector' }) {
  const l = labels[locale] ?? labels.fr;
  const summaries = type === 'sector'
    ? (sectorSummaries[locale] ?? sectorSummaries.fr)
    : (domainSummaries[locale] ?? domainSummaries.fr);
  const summary = summaries[slug];

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
        href={{ pathname: '/archives/[slug]', params: { slug: archiveSlugs[type] } }}
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
