// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

type Locale = 'fr' | 'nl' | 'en' | 'de';

type Column = {
  title: string;
  subtitle?: string;
  items: string[];
};

type Labels = {
  caption: string;
  centerStatement: string;
  arrowLabel: string;
  columns: [Column, Column, Column];
};

const LABELS: Record<Locale, Labels> = {
  fr: {
    caption: 'Trois autorités, un opérateur — l’architecture institutionnelle des 19 CPAS bruxellois',
    centerStatement:
      '19 CPAS bruxellois · tutelle Cocom · gestion communale · financement fédéral',
    arrowLabel: 'flux d’autorité vers les 19 CPAS',
    columns: [
      {
        title: 'Fédéral',
        subtitle: 'SPP Intégration sociale',
        items: [
          'Loi organique CPAS du 8 juillet 1976',
          'Loi DIS du 26 mai 2002 (revenu d’intégration)',
          'Subventions : RIS, art. 60 §7, PAS (jusqu’en 2025), MediPrima',
          'Cadre de l’intégration sociale',
        ],
      },
      {
        title: 'Cocom',
        subtitle: 'Collège réuni · Vivalis · Iriscare',
        items: [
          'Tutelle organique sur les CPAS bruxellois',
          'Vivalis : administration de la Cocom',
          'Iriscare : OIP créé en 2017 (santé / aide aux personnes)',
        ],
      },
      {
        title: 'Région + Communes',
        subtitle: 'Bruxelles Pouvoirs locaux · 19 communes',
        items: [
          'Plan triennal et dotation générale aux communes (DGC)',
          'Cofinancement régional (variable)',
          'Communes : gestion opérationnelle et financement final',
        ],
      },
    ],
  },
  nl: {
    caption: 'Drie overheden, één operator — de institutionele architectuur van de 19 Brusselse OCMW’s',
    centerStatement:
      '19 Brusselse OCMW’s · GGC-toezicht · gemeentelijk beheer · federale financiering',
    arrowLabel: 'gezagsstroom naar de 19 OCMW’s',
    columns: [
      {
        title: 'Federaal',
        subtitle: 'POD Maatschappelijke Integratie',
        items: [
          'Organieke OCMW-wet van 8 juli 1976',
          'Wet betreffende het recht op maatschappelijke integratie van 26 mei 2002',
          'Subsidies: leefloon, art. 60 §7, PAS (tot 2025), MediPrima',
          'Kader maatschappelijke integratie',
        ],
      },
      {
        title: 'GGC',
        subtitle: 'Verenigd College · Vivalis · Iriscare',
        items: [
          'Organiek toezicht op de Brusselse OCMW’s',
          'Vivalis: administratie van de GGC',
          'Iriscare: OIP opgericht in 2017 (gezondheid / hulp aan personen)',
        ],
      },
      {
        title: 'Gewest + Gemeenten',
        subtitle: 'Brussel Plaatselijke besturen · 19 gemeenten',
        items: [
          'Driejarenplan en algemene gemeentedotatie (ADG)',
          'Gewestelijke cofinanciering (variabel)',
          'Gemeenten: operationeel beheer en eindfinanciering',
        ],
      },
    ],
  },
  en: {
    caption: 'Three authorities, one operator — institutional architecture of the 19 Brussels CPAS',
    centerStatement:
      '19 Brussels CPAS · COCOM oversight · communal management · federal funding',
    arrowLabel: 'authority flow towards the 19 CPAS',
    columns: [
      {
        title: 'Federal',
        subtitle: 'FPS Social Integration',
        items: [
          'Organic CPAS law of 8 July 1976',
          'DIS law of 26 May 2002 (social integration income)',
          'Subsidies: RIS, art. 60 §7, PAS (until 2025), MediPrima',
          'Social integration framework',
        ],
      },
      {
        title: 'COCOM',
        subtitle: 'United College · Vivalis · Iriscare',
        items: [
          'Organic oversight over Brussels CPAS',
          'Vivalis: COCOM administration',
          'Iriscare: public-interest body created in 2017 (health / personal assistance)',
        ],
      },
      {
        title: 'Region + Communes',
        subtitle: 'Brussels Local Authorities · 19 communes',
        items: [
          'Triennial plan and general municipal endowment (DGC)',
          'Regional co-financing (variable)',
          'Communes: operational management and final financing',
        ],
      },
    ],
  },
  de: {
    caption: 'Drei Behörden, ein Betreiber — institutionelle Architektur der 19 Brüsseler ÖSHZ',
    centerStatement:
      '19 Brüsseler ÖSHZ · GGK-Aufsicht · kommunale Verwaltung · föderale Finanzierung',
    arrowLabel: 'Autoritätsfluss zu den 19 ÖSHZ',
    columns: [
      {
        title: 'Föderal',
        subtitle: 'POD Soziale Integration',
        items: [
          'Organisches ÖSHZ-Gesetz vom 8. Juli 1976',
          'DIS-Gesetz vom 26. Mai 2002 (Eingliederungseinkommen)',
          'Zuschüsse: RIS, Art. 60 §7, PAS (bis 2025), MediPrima',
          'Rahmen der sozialen Eingliederung',
        ],
      },
      {
        title: 'GGK',
        subtitle: 'Vereinigtes Kollegium · Vivalis · Iriscare',
        items: [
          'Organische Aufsicht über die Brüsseler ÖSHZ',
          'Vivalis: Verwaltung der GGK',
          'Iriscare: 2017 gegründete Einrichtung öffentlichen Interesses (Gesundheit / Personenhilfe)',
        ],
      },
      {
        title: 'Region + Gemeinden',
        subtitle: 'Brüssel Lokale Behörden · 19 Gemeinden',
        items: [
          'Dreijahresplan und allgemeine Gemeindedotation (DGC)',
          'Regionale Kofinanzierung (variabel)',
          'Gemeinden: operative Verwaltung und endgültige Finanzierung',
        ],
      },
    ],
  },
};

export function CpasThreeAuthorities({ locale = 'fr' }: { locale?: Locale }) {
  const labels = LABELS[locale] ?? LABELS.fr;
  const captionId = `cpas-three-authorities-caption-${locale}`;

  return (
    <figure
      aria-labelledby={captionId}
      className="my-8 rounded-lg border border-neutral-200 bg-neutral-50 p-4 sm:p-6"
    >
      <figcaption
        id={captionId}
        className="mb-4 text-xs font-semibold uppercase tracking-wide text-neutral-500"
      >
        {labels.caption}
      </figcaption>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {labels.columns.map((column) => (
          <div
            key={column.title}
            className="rounded-md border border-neutral-200 bg-white p-3 sm:p-4"
          >
            <h3 className="text-sm font-semibold text-neutral-900">{column.title}</h3>
            {column.subtitle && (
              <p className="mt-1 text-xs text-neutral-500">{column.subtitle}</p>
            )}
            <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-neutral-700">
              {column.items.map((item) => (
                <li key={item} className="flex gap-1.5">
                  <span aria-hidden="true" className="mt-1 h-1 w-1 shrink-0 rounded-full bg-brand-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div
        aria-hidden="true"
        className="mx-auto my-3 hidden h-6 w-px bg-neutral-300 sm:block"
      />
      <span className="sr-only">{labels.arrowLabel}</span>

      <div className="mt-4 rounded-md border border-brand-700 bg-brand-900 p-3 text-center sm:mt-2 sm:p-4">
        <p className="text-sm font-semibold leading-snug text-white">
          {labels.centerStatement}
        </p>
      </div>
    </figure>
  );
}
