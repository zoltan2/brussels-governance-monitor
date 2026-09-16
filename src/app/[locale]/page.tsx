// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

// PROTOTYPE LOCAL (branche proto/accueil-refonte, jamais poussée).
// Issu de la revue design team du 2026-09-14. Textes FR en dur : ne pas
// fusionner en l'état, l'i18n et la revue éditoriale restent à faire.

import type { ComponentProps, ReactNode } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { DM_Serif_Display } from 'next/font/google';
import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { SubscribeForm } from '@/components/subscribe-form';
import { LatestUpdateBar } from '@/components/latest-update-bar';
import { GovernmentTable } from '@/components/government-table';
import { statusStyles as domainStatusStyles } from '@/components/domain-card';
import { getLinkHref } from '@/components/latest-update-bar';
import {
  getDomainCards,
  getSectorCards,
  getDossierCards,
  getAllDossierTopicOptions,
  getRecentDigestLangs,
  getDigestEntry,
} from '@/lib/content';
import { getActiveSignals, getEditorialSourceCount } from '@/lib/radar';
import { getChangelog, getLatestUpdate, isFilterableSection, resolveCardTitle } from '@/lib/changelog';
import { formatDate } from '@/lib/utils';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import type { DossierCard as DossierCardType, SectorCard as SectorCardType } from '@/lib/content';
import type { LocalizedRadarEntry } from '@/lib/radar';
import { buildMetadata } from '@/lib/metadata';
import { getHomepageCta, type HomepageCta } from '@/lib/homepage-cta';
import { GovernmentDayCounter } from '@/components/government-day-counter';
import governmentData from '../../../data/government.json';
import { CommitmentsBarometer } from '@/components/commitments-barometer';
import commitmentsData from '../../../data/commitments.json';
import {
  ArrowRight,
  ChevronRight,
  Shield,
  Eye,
  Map,
  Building,
  Users,
  Scale,
  FolderOpen,
  LayoutGrid,
  Building2,
  BookOpen,
  Lightbulb,
  type LucideIcon,
} from 'lucide-react';

// Le Stuut et le magazine portent la même serif que leurs propres sites.
const dmSerif = DM_Serif_Display({ weight: '400', subsets: ['latin'], display: 'swap' });

const titles: Record<string, string> = {
  fr: 'Gouvernance bruxelloise — Suivi citoyen et factuel',
  nl: 'Brussels bestuur — Onafhankelijke burgeropvolging',
  en: 'Brussels Governance — Independent Citizen Monitoring',
  de: 'Brüsseler Regierungsführung — Unabhängige Bürgerüberwachung',
};

const descriptions: Record<string, string> = {
  fr: 'Moniteur indépendant de la gouvernance à Bruxelles. Engagements de la DPR, dossiers clés, composition du gouvernement et données ouvertes.',
  nl: 'Onafhankelijke monitor van het Brusselse bestuur. DPR-engagementen, sleuteldossiers, regeringssamenstelling en open data.',
  en: 'Independent Brussels governance monitor. DPR commitments, key dossiers, government composition and open data.',
  de: 'Unabhängiger Monitor der Brüsseler Regierungsführung. DPR-Verpflichtungen, Schlüsseldossiers, Regierungszusammensetzung und offene Daten.',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const title = titles[locale] || titles.fr;
  const description = descriptions[locale] || descriptions.fr;

  return buildMetadata({
    locale,
    title,
    description,
    ogParams: `title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent('governance.brussels')}`,
  });
}

// Max width of the homepage radar blurb, see veille-workflow.md (~150 chars/locale).
const HOMEPAGE_SIGNAL_MAX_CHARS = 180;

function getHomepageBlurb(summary: string | undefined, description: string): string {
  if (summary) return summary;
  const firstSentenceMatch = description.match(/^[^.!?]+[.!?]/);
  const firstSentence = firstSentenceMatch ? firstSentenceMatch[0] : description;
  if (firstSentence.length <= HOMEPAGE_SIGNAL_MAX_CHARS) return firstSentence;
  return firstSentence.slice(0, HOMEPAGE_SIGNAL_MAX_CHARS).trimEnd() + '…';
}

const SECTION_LABELS: Record<string, string> = {
  domains: 'Domaine',
  dossiers: 'Dossier',
  sectors: 'Secteur',
  communes: 'Commune',
  comparisons: 'Comparaison',
  solutions: 'Solution',
};

// Dans « ce qui a changé », l'icône remplace l'étiquette en majuscules, qui coûtait
// 80 px par ligne et se lisait moins vite. Même vocabulaire que les en-têtes de
// section plus bas. Le libellé reste lu par les lecteurs d'écran et s'affiche au survol.
const SECTION_ICONS: Record<string, LucideIcon> = {
  domains: LayoutGrid,
  dossiers: FolderOpen,
  sectors: Building2,
  communes: Map,
  comparisons: Scale,
  solutions: Lightbulb,
};


type LinkHref = ComponentProps<typeof Link>['href'];

const linkClass =
  'inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-900 hover:underline';

const cardClass =
  'group flex h-full flex-col rounded-lg border border-neutral-200 bg-neutral-50 p-4 transition-colors hover:border-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = locale as Locale;

  const domainCards = getDomainCards(loc);
  const sectorCards = getSectorCards(loc);
  const dossierCards = getDossierCards(loc);
  const veilleSourceCount = getEditorialSourceCount();

  const byLastModified = <T extends { lastModified: string }>(cards: T[]) =>
    [...cards].sort((a, b) => b.lastModified.localeCompare(a.lastModified));

  // Une règle par zone de veille, pour qu'un même sujet n'apparaisse jamais deux fois :
  //   barre d'info   = le fait du jour (entrée la plus récente du changelog) ;
  //   mises à jour   = les fiches modifiées ensuite ;
  //   radar          = ce qui n'est pas encore confirmé, hors fiches déjà citées ;
  //   dossiers       = les dossiers suivis, hors ceux que la liste vient de citer.
  const latestUpdate = getLatestUpdate(loc);
  const recentRaw = getChangelog(loc)
    .slice(1)
    .filter((e) => isFilterableSection(e.section) && e.targetSlug)
    // Trois, pas quatre : `shown` se construit sur cette liste déjà découpée, donc la
    // quatrième fiche n'est pas perdue, elle redevient éligible dans les inventaires
    // du dessous et réapparaît en carte.
    .slice(0, 3);

  const recentChanges: RecentChange[] = recentRaw.map((e) => ({
    key: `${e.date}-${e.section}-${e.targetSlug}`,
    date: e.date,
    section: e.section,
    text: e.summary || e.description,
    title:
      isFilterableSection(e.section) && e.targetSlug
        ? resolveCardTitle(e.section, e.targetSlug, loc)
        : null,
    href: getLinkHref(e.section, e.targetSlug, e.anchor),
  }));

  // Les signaux radar portent les slugs des fiches concernées (`cards`) : le
  // dédoublonnage s'appuie dessus, jamais sur une comparaison de titres.
  // Deux index. Le radar ne connaît que des slugs nus (champ `cards`), tandis que les
  // inventaires comparent section ET slug : un même slug existe dans deux familles
  // (« education » est à la fois un domaine et un secteur), le comparer nu masquerait
  // une carte à tort.
  const shown = [
    { section: latestUpdate.section, slug: latestUpdate.targetSlug },
    ...recentRaw.map((e) => ({ section: e.section, slug: e.targetSlug })),
  ].filter((e): e is { section: string; slug: string } => Boolean(e.slug));
  const shownSlugs = new Set(shown.map((e) => e.slug));
  const shownKeys = new Set(shown.map((e) => `${e.section}:${e.slug}`));
  const allSignals = getActiveSignals(loc);
  // La liste doit tenir la promesse du compteur : uniquement des signaux encore actifs.
  // getActiveSignals renvoie aussi les confirmés, qui ne sont plus sous surveillance.
  const radarSignals = allSignals
    .filter((signal) => signal.status === 'active')
    .filter((signal) => !signal.cards.some((card) => shownSlugs.has(card)))
    // Deux signaux sur trois lignes valent mieux que trois amputés à une ligne : les
    // résumés font 150 caractères en médiane. Le troisième reste compté par
    // `totalSignals` et consultable sur le Radar.
    .slice(0, 2);
  const homeDossiers = byLastModified(dossierCards)
    .filter((card) => !shownKeys.has(`dossiers:${card.slug}`))
    .slice(0, 4);
  const homeDomains = byLastModified(domainCards)
    .filter((card) => !shownKeys.has(`domains:${card.slug}`))
    .slice(0, 4);
  const homeSectors = byLastModified(sectorCards)
    .filter((card) => !shownKeys.has(`sectors:${card.slug}`))
    .slice(0, 6);

  // Formats: same data sources as the former PublicationsBand.
  const { langs, latestCompleteWeek } = getRecentDigestLangs(2);
  const weekNum = latestCompleteWeek?.split('-w')[1] ?? null;
  const digestLang =
    latestCompleteWeek && getDigestEntry(latestCompleteWeek, locale)?.isFallback === false ? locale : 'fr';
  const digestHref = latestCompleteWeek
    ? `/digest/${digestLang}/${latestCompleteWeek.replace('-w', '/w')}`
    : null;
  const mag =
    latestCompleteWeek && locale === 'fr' ? getDigestEntry(latestCompleteWeek, 'fr')?.entry?.magazine : null;
  const magazine =
    mag?.tagline && weekNum
      ? { tagline: mag.tagline, href: `https://magazine.governance.brussels/s${weekNum}/` }
      : null;
  return (
    <>
      <Hero cta={getHomepageCta(locale)} />

      <LatestUpdateBar
        date={latestUpdate.date}
        description={latestUpdate.description}
        summary={latestUpdate.summary}
        section={latestUpdate.section}
        targetSlug={latestUpdate.targetSlug}
        anchor={latestUpdate.anchor}
        locale={locale}
      />

      <section className="py-8">
        <div className="mx-auto grid max-w-5xl gap-y-6 px-4 lg:grid-cols-[2fr_1fr] lg:gap-x-0">
          <WhatChanged entries={recentChanges} locale={locale} />
          <WhatWeWatch signals={radarSignals} locale={locale} sourceCount={veilleSourceCount} />
        </div>
      </section>

      {/* Les rendez-vous juste après les faits du jour : c'est là qu'on donne suite à
          ce qu'on vient de lire, avant de dérouler les inventaires. */}
      <FormatsSection
        digest={digestHref && weekNum ? { href: digestHref, weekNum, langs } : null}
        magazine={magazine}
        weekNum={weekNum}
      />

      <DossiersPreview
        cards={homeDossiers}
        locale={locale}
        totalCount={dossierCards.length}
      />

      <DomainsPreview
        cards={homeDomains}
        locale={locale}
        totalCount={domainCards.length}
      />

      <SectorsPreview
        cards={homeSectors}
        locale={locale}
        totalCount={sectorCards.length}
      />

      <FirstSteps locale={locale} />

      <section id="subscribe" className="bg-neutral-50 py-12">
        <div className="mx-auto max-w-5xl px-4">
          <SubscribeForm
            dossierOptions={getAllDossierTopicOptions(loc).map((d) => ({ id: d.topicId, label: d.label }))}
          />
        </div>
      </section>
    </>
  );
}

// ──────────────────────────────────────────────
// Shared bits
// ──────────────────────────────────────────────

function SectionHeader({
  id,
  title,
  subtitle,
  link,
  icon: Icon,
}: {
  id: string;
  title: string;
  subtitle?: string;
  link?: ReactNode;
  /** Icône de section, vocabulaire lucide déjà employé par le site. */
  icon?: LucideIcon;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div>
        <h2 id={id} className="flex items-center gap-2 text-xl font-semibold text-neutral-900">
          {Icon && <Icon size={18} className="shrink-0 text-neutral-500" aria-hidden={true} />}
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-neutral-600">{subtitle}</p>}
      </div>
      {link}
    </div>
  );
}

function MoreLink({ href, children }: { href: LinkHref; children: ReactNode }) {
  return (
    <Link href={href} className={linkClass}>
      {children}
      <ArrowRight size={14} aria-hidden={true} />
    </Link>
  );
}

// ──────────────────────────────────────────────
// 1. Hero: what the site does + two actions
// ──────────────────────────────────────────────

function Hero({ cta }: { cta: HomepageCta }) {
  const t = useTranslations('home');

  return (
    <section className="bg-gradient-to-b from-slate-800 to-slate-700 text-white">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:py-14 lg:grid-cols-[1fr_20rem] lg:items-center">
        <div>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/80">
          <Shield size={14} className="shrink-0" aria-hidden={true} />
          <span>
            {t('identity')} {t('identityDetail')}
          </span>
          <Link href="/about" className="font-medium text-white underline underline-offset-2 hover:text-white/90">
            {t('identityLink')}
          </Link>
        </p>

        {/* Accroche éditoriale. Le verdict chiffré vit dans le panneau, à droite. */}
        <h1 className="mt-4 max-w-3xl text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
          La Région bruxelloise, revue et corrigée
        </h1>

        <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/85">
          Bienvenue sur Brussels Governance Monitor : on fait le tri entre ce qui est promis, ce qui
          est annoncé et ce qui est fait, sources à l’appui.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dossiers"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-slate-900 transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800"
          >
            Explorer les dossiers
            <ArrowRight size={14} aria-hidden={true} />
          </Link>
          {/* Second bouton : libellé et destination viennent de data/homepage-cta.json. */}
          <a
            href={cta.href}
            className="inline-flex items-center rounded-lg border border-white/70 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800"
          >
            {cta.label}
          </a>
        </div>

        </div>

        <div className="rounded-lg border border-white/15 bg-white/5 p-5">
          <GovernmentDayCounter
            oathDate={governmentData.oathDate}
            oathLabel={formatDate(governmentData.oathDate, 'fr')}
          />
          <CommitmentsBarometer commitments={commitmentsData.commitments} />
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────
// 2. Recent changes (changelog, all card types)
// ──────────────────────────────────────────────

interface RecentChange {
  key: string;
  date: string;
  section: string;
  text: string;
  title: string | null;
  href: ReturnType<typeof getLinkHref>;
}

// Deux statuts, deux blocs, deux registres. À gauche, ce qui est vérifié et sourcé :
// des titres de fiches, courts, datés une fois par journée. À droite, ce qu'on
// surveille : des phrases entières, en annotation de marge, sans date ni cadre.
// Les deux listes ne fusionnent pas, une mise à jour et un signal n'ont pas le même
// statut. Pas d'ambre ici : dans le baromètre, cette couleur veut déjà dire « Retardé ».

function SectionTitle({ id, children, link }: { id: string; children: ReactNode; link?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4 border-b border-neutral-300 pb-2">
      <h2 id={id} className="text-lg font-semibold text-neutral-900">
        {children}
      </h2>
      {link}
    </div>
  );
}

function WhatChanged({ entries, locale }: { entries: RecentChange[]; locale: string }) {
  const dayLabel = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    });

  // Le changelog publie par lots (médiane de 9 entrées par journée publiée, sur
  // 112 journées) : les entrées affichées partagent presque toujours la même date.
  // On la sort donc des lignes, où elle se répétait, pour la poser en intertitre.
  // Les journées maigres produisent deux ou trois intertitres, sans cas particulier.
  const jours: { date: string; items: RecentChange[] }[] = [];
  for (const entry of entries) {
    const dernier = jours[jours.length - 1];
    if (dernier && dernier.date === entry.date) dernier.items.push(entry);
    else jours.push({ date: entry.date, items: [entry] });
  }

  return (
    <div aria-labelledby="changed-title" className="min-w-0">
      <SectionTitle id="changed-title" link={<MoreLink href="/changelog">Tout l’historique</MoreLink>}>
        Ce qui a changé
      </SectionTitle>

      {jours.map((jour) => (
        <div key={jour.date} className="mt-3 first:mt-0">
          <time dateTime={jour.date} className="text-xs text-neutral-600">
            {dayLabel(jour.date)}
          </time>

          <ul className="mt-1 divide-y divide-neutral-200">
            {jour.items.map((entry) => {
              const Icon = SECTION_ICONS[entry.section] ?? FolderOpen;
              const label = SECTION_LABELS[entry.section] ?? entry.section;
              const titre = entry.title ?? entry.text;
              return (
                <li key={entry.key} className="flex items-baseline gap-2.5 py-2 text-sm">
                  {/* L'icône est décorative : le type est donné au lecteur d'écran par
                      le texte masqué, et à la souris par l'infobulle. */}
                  <span title={label} className="shrink-0 translate-y-0.5">
                    <Icon size={14} aria-hidden={true} className="text-neutral-600" />
                  </span>
                  <span className="sr-only">{label} : </span>
                  {entry.href ? (
                    <Link
                      href={entry.href}
                      className="min-w-0 font-medium text-neutral-900 hover:text-brand-700 hover:underline"
                    >
                      {titre}
                    </Link>
                  ) : (
                    <span className="min-w-0 font-medium text-neutral-900">{titre}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function WhatWeWatch({
  signals,
  locale,
  sourceCount,
}: {
  signals: LocalizedRadarEntry[];
  locale: string;
  sourceCount: number;
}) {
  const t = useTranslations('home');
  const tr = useTranslations('radar');

  // Bloc restitué à l'identique de la page d'accueil en production (FollowColumn) :
  // encadré, en-tête de veille avec « Notre méthode », séparateur, titre des signaux,
  // puis date et phrase entière, « Voir tout le radar » et le garde-fou éditorial.
  //
  // La ligne de veille revient ICI et a été retirée du héros, où le prototype l'avait
  // déplacée : la garder aux deux endroits la dirait deux fois. Seul le chiffre change
  // par rapport au live, 248 sources suivies et non 325 consultées, parce que 325
  // comptait aussi les sources scannées au mois.
  //
  // Les résumés sont des PHRASES de 150 caractères en médiane (q90 : 201), bornées à
  // 180 côté serveur par getHomepageBlurb : elles s'enroulent, aucune coupe CSS.
  return (
    // lg:pl-6 n'est pas décoratif : la grille parente est en lg:gap-x-0, donc c'est
    // cette marge qui fait la gouttière. Sans elle, les deux colonnes se touchent et
    // ce titre vient percuter « Tout l'historique » de la colonne de gauche.
    <div aria-labelledby="watch-title" className="min-w-0 lg:pl-6">
      <h2
        id="watch-title"
        className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500"
      >
        Ce qu’on surveille
      </h2>

      <div className="rounded-lg border border-neutral-200 bg-neutral-50">
        <div className="px-4 pb-3 pt-4">
          <div className="flex items-center gap-2 text-xs text-neutral-700">
            <Eye size={14} className="shrink-0 text-neutral-500" aria-hidden={true} />
            <span className="font-medium">Veille active : {sourceCount} sources suivies</span>
          </div>
          <Link
            href="/methodology"
            className="mt-1.5 inline-flex items-center gap-1 pl-[22px] text-xs font-medium text-brand-700 hover:text-brand-900"
          >
            {t('veilleMethod')}
            <ArrowRight size={12} aria-hidden={true} />
          </Link>
        </div>

        <div className="border-t border-neutral-100" />

        <h3 className="px-4 pb-2 pt-3 text-sm font-medium text-neutral-500">
          {t('signalsTitle')}
        </h3>

        {signals.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-neutral-500">{tr('noActiveSignals')}</p>
        ) : (
          <div className="space-y-3 px-4">
            {signals.map((signal) => (
              <div key={signal.id} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3 lg:flex-col lg:gap-1">
                <time dateTime={signal.date} className="shrink-0 text-xs tabular-nums text-neutral-500">
                  {formatDate(signal.date, locale)}
                </time>
                <p className="flex-1 text-sm leading-snug text-neutral-700">
                  {getHomepageBlurb(signal.summary, signal.description)}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 border-t border-neutral-100 px-4 py-3">
          <Link
            href="/radar"
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-900"
          >
            {tr('seeAll')}
            <ArrowRight size={12} aria-hidden={true} />
          </Link>
        </div>

        <div className="border-t border-neutral-100 px-4 py-3">
          <div className="border-l-2 border-brand-700/30 pl-3">
            <p className="text-xs text-neutral-500">{t('shieldFootnote')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Deux portes sous le haut de page : le digest (lundi 8h, cf. bgm-cron-digest.timer)
// et le Stuut. Le turquoise reprend le `--teal-deep` du jeu, assez foncé pour le texte.
// ──────────────────────────────────────────────
// 9. First steps: explainers + government, at the bottom
// ──────────────────────────────────────────────

function FirstSteps({ locale }: { locale: string }) {
  const t = useTranslations('home');

  const explainers = [
    { href: '/how-to-read' as const, label: t('explainerMap'), Icon: Map },
    { href: '/explainers/brussels-overview' as const, label: t('explainerBuilding'), Icon: Building },
    { href: '/explainers/levels-of-power' as const, label: t('explainerUsers'), Icon: Users },
    { href: '/explainers/brussels-paradox' as const, label: t('explainerScale'), Icon: Scale },
  ];

  return (
    <section aria-labelledby="start-title" className="border-t border-neutral-200 py-10">
      <div className="mx-auto max-w-5xl px-4">
        <SectionHeader
          id="start-title"
          icon={BookOpen}
          title={t('newHere')}
          subtitle="Qui décide quoi à Bruxelles, qui gouverne la Région, et comment lire ce site."
          link={<MoreLink href="/understand">{t('allExplainers')}</MoreLink>}
        />
        <div className="grid gap-6 md:grid-cols-2">
          <ul className="space-y-1 rounded-lg border border-neutral-200 bg-neutral-50 p-2">
            {explainers.map((exp) => (
              <li key={exp.href}>
                <Link
                  href={exp.href}
                  className="flex items-center gap-2.5 rounded-md px-2 py-2.5 text-sm text-neutral-800 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                >
                  <exp.Icon size={16} className="shrink-0 text-neutral-500" aria-hidden={true} />
                  <span className="flex-1">{exp.label}</span>
                  <ChevronRight size={14} className="text-neutral-500" aria-hidden={true} />
                </Link>
              </li>
            ))}
          </ul>
          <div>
            <GovernmentTable locale={locale} inline />
          </div>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────
// 4. Dossiers (compact cards)
// ──────────────────────────────────────────────

const phaseStyles: Record<string, string> = {
  announced: 'border-neutral-400 text-neutral-600',
  planned: 'border-brand-600 text-brand-700',
  'in-progress': 'border-status-ongoing text-status-ongoing',
  stalled: 'border-status-blocked text-status-blocked',
  completed: 'border-status-resolved text-status-resolved',
  cancelled: 'border-neutral-400 text-neutral-500',
};

function KeyFigure({
  value,
  unit,
  label,
  source,
}: {
  value: string;
  unit?: string;
  label?: string;
  /** « vérifié source par source » : la source du chiffre s'affiche sous le chiffre.
   *  En texte et non en lien : la carte entière est déjà un lien, on n'en imbrique pas. */
  source?: string;
}) {
  // Short units read with the number ("62 200 SPA"); long ones are sentences and go below.
  const inlineUnit = unit && unit.length <= 24 ? unit : undefined;
  const detail = [inlineUnit ? undefined : unit, label].filter(Boolean).join(' · ');
  return (
    <div className="mt-3">
      <p className="line-clamp-2 text-lg font-bold leading-tight text-brand-900">
        {value}
        {inlineUnit && <span className="ml-1 text-sm font-medium text-neutral-700">{inlineUnit}</span>}
      </p>
      {detail && <p className="mt-1 line-clamp-2 text-xs leading-snug text-neutral-600">{detail}</p>}
      {source && <p className="mt-1 line-clamp-1 text-xs text-neutral-500">Source : {source}</p>}
    </div>
  );
}

function CardFooter({ children }: { children: ReactNode }) {
  return (
    <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-xs text-neutral-600">
      <span>{children}</span>
      <ChevronRight size={16} className="shrink-0 text-neutral-500 group-hover:text-neutral-900" aria-hidden={true} />
    </div>
  );
}

function DossiersPreview({
  cards,
  locale,
  totalCount,
}: {
  cards: DossierCardType[];
  locale: string;
  totalCount: number;
}) {
  const t = useTranslations('home');
  const td = useTranslations('dossiers');

  return (
    <section aria-labelledby="dossiers-title" className="py-8">
      <div className="mx-auto max-w-5xl px-4">
        <SectionHeader
          id="dossiers-title"
          icon={FolderOpen}
          title={t('dossiersHomeTitle')}
          subtitle="Les grands dossiers bruxellois, du plus récemment mis à jour au plus ancien."
          link={<MoreLink href="/dossiers">{t('viewAllDossiers', { count: totalCount })}</MoreLink>}
        />
        <div className="grid gap-3 md:grid-cols-2">
          {cards.map((card) => {
            const m = card.metrics[0];
            return (
              <Link
                key={card.slug}
                href={{ pathname: '/dossiers/[slug]', params: { slug: card.slug } }}
                className={cardClass}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold text-neutral-900">{card.title}</h3>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${phaseStyles[card.phase]}`}
                  >
                    {td(`phase.${card.phase}`)}
                  </span>
                </div>
                {m && <KeyFigure value={m.value} unit={m.unit} label={m.label} source={m.source} />}
                <CardFooter>{td('lastModified', { date: formatDate(card.lastModified, locale) })}</CardFooter>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────
// 5. Domains (compact cards, full summary stays on the page)
// ──────────────────────────────────────────────

function DomainsPreview({
  cards,
  locale,
  totalCount,
}: {
  cards: ReturnType<typeof getDomainCards>;
  locale: string;
  totalCount: number;
}) {
  const t = useTranslations('home');
  const tdo = useTranslations('domains');

  return (
    <section aria-labelledby="domains-title" className="py-8">
      <div className="mx-auto max-w-5xl px-4">
        <SectionHeader
          id="domains-title"
          icon={LayoutGrid}
          title="Domaines"
          subtitle={t('domainsHomeSubtitle')}
          link={<MoreLink href="/domains">{t('viewAllDomains', { count: totalCount })}</MoreLink>}
        />
        <div className="grid gap-3 md:grid-cols-2">
          {cards.map((card) => {
            const m = card.metrics[0];
            return (
              <Link
                key={card.slug}
                href={{ pathname: '/domains/[slug]', params: { slug: card.slug } }}
                className={cardClass}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold text-neutral-900">{card.title}</h3>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${domainStatusStyles[card.status]}`}
                  >
                    {tdo(`status.${card.status}`)}
                  </span>
                </div>
                {m && <KeyFigure value={m.value} unit={m.unit} label={m.label} source={m.source} />}
                <CardFooter>{tdo('lastModified', { date: formatDate(card.lastModified, locale) })}</CardFooter>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────
// 6. Sectors (first impact indicator instead of a mechanism count)
// ──────────────────────────────────────────────

function SectorsPreview({
  cards,
  locale,
  totalCount,
}: {
  cards: SectorCardType[];
  locale: string;
  totalCount: number;
}) {
  const t = useTranslations('home');

  return (
    <section aria-labelledby="sectors-title" className="py-8">
      <div className="mx-auto max-w-5xl px-4">
        <SectionHeader
          id="sectors-title"
          icon={Building2}
          title="Secteurs"
          subtitle={t('sectorsHomeSubtitle')}
          link={<MoreLink href="/sectors">{t('viewAllSectorsCount', { count: totalCount })}</MoreLink>}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => {
            const indicator = card.impactIndicators[0];
            return (
              <Link
                key={card.slug}
                href={{ pathname: '/sectors/[slug]', params: { slug: card.slug } }}
                className={cardClass}
              >
                <h3 className="text-sm font-semibold text-neutral-900">{card.title}</h3>
                {indicator && <KeyFigure value={indicator.value} label={indicator.label} source={indicator.source} />}
                <CardFooter>Mis à jour le {formatDate(card.lastModified, locale)}</CardFooter>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────
// 7. Formats: Stuut featured, then digest, magazine, newsletter, quiz
// ──────────────────────────────────────────────

// Lien étiré : toute la carte est cliquable, mais il n'y a qu'un seul arrêt de tabulation.
const stretchedLink = `${linkClass} after:absolute after:inset-0 after:content-['']`;

function RowLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-600">{children}</h3>
  );
}

function FormatCard({
  title,
  visual,
  children,
  link,
}: {
  title: string;
  /** Décoratif : le titre et le texte portent le sens. */
  visual: ReactNode;
  children: ReactNode;
  link: ReactNode;
}) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 transition-colors hover:border-neutral-400">
      <div className="h-16 overflow-hidden border-b border-neutral-200" aria-hidden="true">
        {visual}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h4 className="text-sm font-semibold text-neutral-900">{title}</h4>
        <p className="mt-1 line-clamp-3 text-xs leading-snug text-neutral-700">{children}</p>
        <div className="mt-auto pt-2">{link}</div>
      </div>
    </div>
  );
}

function FormatsSection({
  digest,
  magazine,
  weekNum,
}: {
  digest: { href: string; weekNum: string; langs: string[] } | null;
  magazine: { tagline: string; href: string } | null;
  weekNum: string | null;
}) {
  return (
    <section aria-labelledby="formats-title" className="py-8">
      <div className="mx-auto max-w-5xl px-4">
        <SectionHeader id="formats-title" title="Restez au courant" />

        <RowLabel>
          <span className="mt-4 block">Chaque semaine</span>
        </RowLabel>
        {/* Deux colonnes dès 390 px : trois cartes empilées coûtaient 630 px sur mobile. */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <FormatCard
            title="Le digest"
            visual={
              <div className="flex h-full flex-wrap content-center gap-1 bg-neutral-100 px-3 py-2">
                {(digest?.langs ?? ['fr', 'nl', 'en', 'de']).map((lang) => (
                  <span
                    key={lang}
                    className="rounded-full border border-neutral-400 px-1.5 text-[11px] font-semibold uppercase leading-4 text-neutral-700"
                  >
                    {lang}
                  </span>
                ))}
              </div>
            }
            link={
              digest ? (
                <a href={digest.href} className={stretchedLink}>
                  Lire le digest de la semaine {digest.weekNum}
                  <ArrowRight size={14} aria-hidden={true} />
                </a>
              ) : (
                <a href="#subscribe" className={stretchedLink}>
                  S’abonner au digest
                </a>
              )
            }
          >
            L’essentiel de la semaine par email
            {digest ? `, en ${digest.langs.length} langues.` : '.'}
          </FormatCard>

          <FormatCard
            title="Le magazine"
            visual={
              <div className="flex h-full flex-col justify-center bg-neutral-100 px-3 py-2">
                <p className={`${dmSerif.className} text-xl leading-none text-neutral-900`}>Magazine</p>
                {weekNum && (
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-neutral-600 lining-nums">
                    Semaine {weekNum}
                  </p>
                )}
              </div>
            }
            link={
              <a href={magazine?.href ?? 'https://magazine.governance.brussels/'} className={stretchedLink}>
                {magazine && weekNum ? `Lire le magazine, numéro ${weekNum}` : 'Lire le magazine'}
                <ArrowRight size={14} aria-hidden={true} />
              </a>
            }
          >
            {magazine ? `« ${magazine.tagline} »` : 'Bruxelles relue et vérifiée.'}
          </FormatCard>

          <FormatCard
            title="Le Signal"
            visual={
              <Image
                src="/merci-cafe/signal-bgm.webp"
                alt=""
                width={800}
                height={450}
                className="h-full w-full object-cover"
              />
            }
            link={
              <Link href="/signal" className={stretchedLink}>
                Découvrir la newsletter
                <ArrowRight size={14} aria-hidden={true} />
              </Link>
            }
          >
            La newsletter LinkedIn du lundi : la gouvernance bruxelloise en deux minutes.
          </FormatCard>
        </div>
      </div>
    </section>
  );
}
