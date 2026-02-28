// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { Link } from '@/i18n/navigation';
import type { SectorCard, DossierCard, ComparisonCard, GlossaryTerm } from '@/lib/content';

const hubLabels: Record<string, Record<string, string>> = {
  fr: { sectors: 'Secteurs liés', dossiers: 'Dossiers actifs', comparisons: 'Comparaisons internationales', glossary: 'Glossaire lié' },
  nl: { sectors: 'Gerelateerde sectoren', dossiers: 'Actieve dossiers', comparisons: 'Internationale vergelijkingen', glossary: 'Gerelateerd glossarium' },
  en: { sectors: 'Related sectors', dossiers: 'Active dossiers', comparisons: 'International comparisons', glossary: 'Related glossary' },
  de: { sectors: 'Verwandte Sektoren', dossiers: 'Aktive Dossiers', comparisons: 'Internationale Vergleiche', glossary: 'Zugehöriges Glossar' },
};

const phaseStyles: Record<string, string> = {
  announced: 'bg-neutral-100 text-neutral-600',
  planned: 'bg-brand-50 text-brand-700',
  'in-progress': 'bg-blue-50 text-status-ongoing',
  stalled: 'bg-amber-50 text-status-blocked',
  completed: 'bg-teal-50 text-status-resolved',
  cancelled: 'bg-neutral-50 text-neutral-500',
};

const phaseLabels: Record<string, Record<string, string>> = {
  fr: { announced: 'Annoncé', planned: 'Planifié', 'in-progress': 'En cours', stalled: 'Bloqué', completed: 'Terminé', cancelled: 'Annulé' },
  nl: { announced: 'Aangekondigd', planned: 'Gepland', 'in-progress': 'Lopend', stalled: 'Geblokkeerd', completed: 'Afgerond', cancelled: 'Geannuleerd' },
  en: { announced: 'Announced', planned: 'Planned', 'in-progress': 'In progress', stalled: 'Stalled', completed: 'Completed', cancelled: 'Cancelled' },
  de: { announced: 'Angekündigt', planned: 'Geplant', 'in-progress': 'Laufend', stalled: 'Blockiert', completed: 'Abgeschlossen', cancelled: 'Abgebrochen' },
};

interface DomainHubNavProps {
  locale: string;
  sectors: SectorCard[];
  dossiers: DossierCard[];
  comparisons: ComparisonCard[];
  glossaryTerms: GlossaryTerm[];
}

export function DomainHubNav({ locale, sectors, dossiers, comparisons, glossaryTerms }: DomainHubNavProps) {
  const hasContent = sectors.length > 0 || dossiers.length > 0 || comparisons.length > 0 || glossaryTerms.length > 0;
  if (!hasContent) return null;

  const l = hubLabels[locale] ?? hubLabels.fr;
  const pl = phaseLabels[locale] ?? phaseLabels.fr;

  return (
    <nav aria-label="Hub navigation" className="mb-8 rounded-xl border border-neutral-200 bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Sectors */}
        {sectors.map((s) => (
          <Link
            key={s.slug}
            href={{ pathname: '/sectors/[slug]', params: { slug: s.slug } }}
            className="group rounded-lg border border-neutral-150 bg-neutral-50 p-4 transition-all hover:border-brand-300 hover:shadow-sm"
          >
            <div className="mb-1 flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{l.sectors}</span>
            </div>
            <p className="text-sm font-semibold text-brand-800 group-hover:text-brand-900">{s.title}</p>
            {s.humanImpact && (
              <p className="mt-1.5 text-xs leading-relaxed text-neutral-500 line-clamp-2">{s.humanImpact}</p>
            )}
            <div className="mt-2 flex gap-3 text-[10px] text-neutral-400">
              {s.frozenMechanisms.length > 0 && (
                <span>{s.frozenMechanisms.length} {locale === 'fr' ? 'dispositifs suspendus' : locale === 'nl' ? 'opgeschorte regelingen' : locale === 'de' ? 'ausgesetzte Maßnahmen' : 'suspended measures'}</span>
              )}
              {s.activeMechanisms.length > 0 && (
                <span>{s.activeMechanisms.length} {locale === 'fr' ? 'dispositifs actifs' : locale === 'nl' ? 'actieve regelingen' : locale === 'de' ? 'aktive Maßnahmen' : 'active measures'}</span>
              )}
            </div>
          </Link>
        ))}

        {/* Dossiers */}
        {dossiers.map((d) => (
          <Link
            key={d.slug}
            href={{ pathname: '/dossiers/[slug]', params: { slug: d.slug } }}
            className="group rounded-lg border border-neutral-150 bg-neutral-50 p-4 transition-all hover:border-brand-300 hover:shadow-sm"
          >
            <div className="mb-1 flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{l.dossiers}</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${phaseStyles[d.phase]}`}>
                {pl[d.phase]}
              </span>
            </div>
            <p className="text-sm font-semibold text-brand-800 group-hover:text-brand-900">{d.title}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-neutral-500 line-clamp-2">{d.summary}</p>
            {d.estimatedBudget && (
              <p className="mt-2 text-[10px] font-medium text-neutral-400">{d.estimatedBudget}</p>
            )}
          </Link>
        ))}

        {/* Comparisons */}
        {comparisons.map((c) => (
          <Link
            key={c.slug}
            href={{ pathname: '/comparisons/[slug]', params: { slug: c.slug } }}
            className="group rounded-lg border border-neutral-150 bg-neutral-50 p-4 transition-all hover:border-brand-300 hover:shadow-sm"
          >
            <div className="mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{l.comparisons}</span>
            </div>
            <p className="text-sm font-semibold text-brand-800 group-hover:text-brand-900">{c.title}</p>
            {c.dataPoints.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {c.dataPoints.slice(0, 3).map((dp) => (
                  <span key={dp.entity} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-neutral-600">
                    {dp.entity}: {dp.value}
                  </span>
                ))}
              </div>
            )}
          </Link>
        ))}
      </div>

      {/* Glossary pills */}
      {glossaryTerms.length > 0 && (
        <div className="mt-4 border-t border-neutral-100 pt-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{l.glossary}</span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {glossaryTerms.map((g) => (
              <Link
                key={g.slug}
                href={{ pathname: '/glossary' }}
                className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs text-neutral-600 transition-colors hover:border-brand-300 hover:text-brand-700"
              >
                {g.term}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
