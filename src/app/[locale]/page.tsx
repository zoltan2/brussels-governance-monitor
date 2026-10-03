// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { ComponentProps, ReactNode } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { DM_Serif_Display } from 'next/font/google';
import { setRequestLocale } from 'next-intl/server';
import { useLocale, useTranslations } from 'next-intl';
import { SubscribeForm } from '@/components/subscribe-form';
import { WhatsappInvite } from '@/components/whatsapp-invite';
import { cleDeTheme } from '@/lib/theme-de-fiche';
import { LatestUpdateBar } from '@/components/latest-update-bar';
import { GovernmentTable } from '@/components/government-table';
import { SupportCtaHome } from '@/components/support-cta';
import { domainBadgeClass, dossierBadgeClass } from '@/lib/status-badge';
import {
  getDomainCards,
  getSectorCards,
  getDossierCards,
  getAllDossierTopicOptions,
  getRecentDigestLangs,
  getDigestEntry,
  getLocalizedSlug,
} from '@/lib/content';
import { getActiveSignals } from '@/lib/radar';
import { getHomepageBlurb, selectHomepageSignals } from '@/lib/homepage-signals';
import { getSiteStats } from '@/lib/site-stats';
import { getLatestUpdate } from '@/lib/changelog';
import { cn, formatDate } from '@/lib/utils';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import type { DossierCard as DossierCardType, SectorCard as SectorCardType } from '@/lib/content';
import type { LocalizedRadarEntry } from '@/lib/radar';
import { buildMetadata } from '@/lib/metadata';
import { getHomepageCta, type HomepageCta } from '@/lib/homepage-cta';
import { isNumericFigure } from '@/lib/key-figure';
import { CORE_DIGEST_LOCALES } from '@/lib/digest-langs';
// Table des noms natifs réutilisée, jamais recopiée : un doublon divergerait.
import { nativeName } from '@/components/publications-band';
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
  Radio,
  type LucideIcon,
} from 'lucide-react';
import { TrackedAnchor, TrackedLink } from '@/components/tracked-link';

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

// Only the four locales from generateStaticParams exist. Without this, a root probe
// such as /llms-full.txt or /ads.txt reaches this page as locale "llms-full.txt",
// renders at runtime and fails with a 500 ("static to dynamic") instead of a 404.
// Crawlers read repeated 5xx as a server in trouble and slow down.
export const dynamicParams = false;

// La page d'accueil n'avait AUCUNE revalidation : son HTML était figé jusqu'au
// déploiement suivant, servi avec `s-maxage=31536000` (un an), et le compteur de
// jours de gouvernement ne pouvait pas être rendu par le serveur sans dériver
// (constaté le 21/09/2026). Une heure borne cette dérive.
// Ce que `revalidate` NE change PAS : radar, changelog et fiches sont importés dans
// le bundle, ils ne bougent qu'au déploiement suivant (chaque veille en passe par
// un). Cloudflare ne met pas le HTML en cache (`cf-cache-status: DYNAMIC`).
export const revalidate = 3600;

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



type LinkHref = ComponentProps<typeof Link>['href'];

const linkClass =
  'inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-900 hover:underline';

// Marge intérieure de 12 px sous 768 px (16 au-delà) : 8 px de moins par carte, et
// quelques retours à la ligne en moins dans les titres.
const cardClass =
  'group flex h-full flex-col rounded-lg border border-neutral-200 bg-neutral-50 p-4 max-md:p-3 transition-colors hover:border-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700';

/**
 * Cartes par inventaire (dossiers, domaines, secteurs) tant que la grille n'a qu'une
 * colonne : sous 768 px pour les dossiers et les domaines, sous 640 px pour les
 * secteurs. À 390 px, l'accueil faisait 8 878 px (onze écrans), dont 3 800 pour ces
 * trois inventaires. Les cartes suivantes restent dans le HTML et réapparaissent dès
 * que la grille a deux colonnes ; sur mobile, le lien « Voir les N … » en tête de
 * chaque section mène à la liste complète.
 */
const MOBILE_CARDS = 3;

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
  // Un seul calcul pour « Ce qu'on surveille » et pour le bloc de soutien :
  // les deux affichent le même nombre de sources, par construction.
  const siteStats = getSiteStats();

  const byLastModified = <T extends { lastModified: string }>(cards: T[]) =>
    [...cards].sort((a, b) => b.lastModified.localeCompare(a.lastModified));

  // Une règle par zone de veille, pour qu'un même sujet n'apparaisse jamais deux fois :
  //   barre d'info   = le fait du jour (entrée la plus récente du changelog) ;
  //   radar          = ce qui n'est pas encore confirmé, hors fiche déjà citée ;
  //   dossiers       = les dossiers suivis, hors celui que la barre vient de citer.
  //
  // Depuis le retrait du bloc « ce qui a changé », la barre est le SEUL endroit qui
  // affiche une entrée du changelog : elle est donc la seule à devoir exclure une
  // fiche. Exclure les entrées suivantes les ferait disparaître de la page entière.
  const latestUpdate = getLatestUpdate(loc);

  // Les signaux radar portent les slugs des fiches concernées (`cards`) : le
  // dédoublonnage s'appuie dessus, jamais sur une comparaison de titres.
  // Deux index. Le radar ne connaît que des slugs nus (champ `cards`), tandis que les
  // inventaires comparent section ET slug : un même slug existe dans deux familles
  // (« education » est à la fois un domaine et un secteur), le comparer nu masquerait
  // une carte à tort.
  const shown = [
    { section: latestUpdate.section, slug: latestUpdate.targetSlug },
  ].filter((e): e is { section: string; slug: string } => Boolean(e.slug));
  const shownSlugs = new Set(shown.map((e) => e.slug));
  const shownKeys = new Set(shown.map((e) => `${e.section}:${e.slug}`));
  // Signaux actifs les plus récents, hors fiche déjà citée par la barre : logique et
  // invariants dans src/lib/homepage-signals.ts (testés, incident du 28/09/2026).
  const radarSignals = selectHomepageSignals(getActiveSignals(loc), shownSlugs);
  const homeDossiers = byLastModified(dossierCards)
    .filter((card) => !shownKeys.has(`dossiers:${card.slug}`))
    .slice(0, 4);
  const homeDomains = byLastModified(domainCards)
    .filter((card) => !shownKeys.has(`domains:${card.slug}`))
    .slice(0, 4);
  const homeSectors = byLastModified(sectorCards)
    .filter((card) => !shownKeys.has(`sectors:${card.slug}`))
    .slice(0, 6);

  // Formats : mêmes sources de données que l'ancien bandeau PublicationsBand, qui
  // n'est plus rendu nulle part (seul `nativeName` en est encore importé).
  // Deux chiffres, deux réalités : `langs` donne les langues des PAGES du digest
  // (onze au 17/09/2026), CORE_DIGEST_LOCALES celles de l'ENVOI par email (quatre,
  // la seule liste qu'accepte l'inscription). La carte doit dire les deux sans les
  // confondre : elle annonçait « par email, en 11 langues », ce qui était faux.
  const { langs, latestCompleteWeek } = getRecentDigestLangs(2);
  const weekNum = latestCompleteWeek?.split('-w')[1] ?? null;
  const digestLang =
    latestCompleteWeek && getDigestEntry(latestCompleteWeek, locale)?.isFallback === false ? locale : 'fr';
  // Règle du 29/06/2026 : toute langue réellement traduite doit être CLIQUABLE depuis
  // la page d'accueil. Une langue n'est cliquable que si elle a un digest RÉEL pour la
  // semaine visée : getDigestEntry retombe sur le français, donc on garde sur
  // `isFallback === false`, sinon on enverrait le lecteur sur une page française sous
  // une URL étrangère. Même calcul que l'ancien bandeau PublicationsBand.
  const linkableLangs = latestCompleteWeek
    ? langs.filter((l) => getDigestEntry(latestCompleteWeek, l)?.isFallback === false)
    : [];
  const weekPath = latestCompleteWeek ? latestCompleteWeek.replace('-w', '/w') : '';
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
      <Hero cta={getHomepageCta(locale)} locale={locale} />

      <LatestUpdateBar
        date={latestUpdate.date}
        headline={latestUpdate.headline}
        isCorrection={latestUpdate.isCorrection}
        cardTitle={latestUpdate.cardTitle}
        section={latestUpdate.section}
        targetSlug={latestUpdate.targetSlug}
        anchor={latestUpdate.anchor}
        locale={locale}
      />

      <section className="py-6 md:py-8">
        {/* La paire de l'accueil : surveiller à gauche,
            comprendre à droite. Le 3fr va à la surveillance, qui porte des phrases de
            150 caractères ; en 2fr son texte tombait à 224 px et se brisait en cinq
            lignes de trois mots. */}
        <div className="mx-auto grid max-w-5xl gap-y-8 px-4 lg:grid-cols-[3fr_2fr] lg:gap-x-8">
          <WhatWeWatch signals={radarSignals} locale={locale} sourceCount={siteStats.sourcesSuivies} />
          <UnderstandColumn locale={locale} />
        </div>
      </section>

      {/* Les rendez-vous juste après les faits du jour : c'est là qu'on donne suite à
          ce qu'on vient de lire, avant de dérouler les inventaires. */}
      <FormatsSection
        digest={
          digestHref && weekNum
            ? { href: digestHref, weekNum, langs, linkableLangs, weekPath }
            : null
        }
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

      {/* Dans cet ordre : le quiz, puis les chiffres et l'appel au soutien, juste
          avant « Restez informé ». */}
      <QuizPromo />

      <SupportCtaHome stats={siteStats} />

      <section id="subscribe" className="bg-neutral-50 py-8 md:py-12">
        <div className="mx-auto max-w-5xl px-4">
          <SubscribeForm
            dossierOptions={getAllDossierTopicOptions(loc).map((d) => ({ id: d.topicId, label: d.label }))}
            // Les thèmes des quatorze cartes de la page, proposés en tête du formulaire.
            sujetsDeLaPage={[
              ...homeDossiers.map((card) => cleDeTheme('dossier', card.slug)),
              ...homeDomains.map((card) => cleDeTheme('domain', card.slug)),
              ...homeSectors.map((card) => cleDeTheme('sector', card.slug)),
            ]}
          />
          {/* Chaîne WhatsApp : rien n'est rendu dans une langue où elle n'est pas proposée. */}
          <WhatsappInvite locale={loc} />
        </div>
      </section>
    </>
  );
}

// ──────────────────────────────────────────────
// Quiz
// ──────────────────────────────────────────────

/** Bloc quiz de l'accueil, clés `home.quiz*` traduites dans les quatre langues. */
function QuizPromo() {
  const t = useTranslations('home');

  return (
    <section className="py-6 md:py-8">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex flex-col items-center gap-4 rounded-lg border border-neutral-200 bg-neutral-50 px-6 py-8 text-center sm:flex-row sm:text-left">
          <div className="flex-1">
            <h2 className="text-base font-semibold text-neutral-900">
              {t('quizTitle')}
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              {t('quizSubtitle')}
            </p>
          </div>
          <TrackedLink
            href="/quiz"
            event="accueil-quiz"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-brand-700 px-5 py-2.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-700 hover:text-neutral-50"
          >
            {t('quizCta')}
            <ArrowRight size={14} aria-hidden={true} />
          </TrackedLink>
        </div>
      </div>
    </section>
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

// min-h-[24px] : WCAG 2.2 AA, critère 2.5.8 « Target Size (Minimum) ». Mesurés à
// 390 px, ces liens faisaient 20 px de haut. Ce sont les seules portes de sortie de
// chaque bloc, sur la largeur où l'on navigue au pouce, et l'exception prévue pour
// les liens en ligne dans un texte ne s'applique pas : ils sont autonomes.
// La hauteur est posée ici et non sur `linkClass`, partagé par d'autres appels.
function MoreLink({ href, children }: { href: LinkHref; children: ReactNode }) {
  return (
    <TrackedLink
      href={href}
      event="accueil-inventaire" eventData={{ cible: String(href) }}
      className={`${linkClass} min-h-[24px]`}
    >
      {children}
      <ArrowRight size={14} aria-hidden={true} />
    </TrackedLink>
  );
}

// ──────────────────────────────────────────────
// 1. Hero: what the site does + two actions
// ──────────────────────────────────────────────

function Hero({ cta, locale }: { cta: HomepageCta; locale: string }) {
  const t = useTranslations('home');

  return (
    <section className="bg-gradient-to-b from-slate-800 to-slate-700 text-white">
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 sm:gap-8 sm:py-14 lg:grid-cols-[1fr_20rem] lg:items-center">
        <div>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/80">
          <Shield size={14} className="shrink-0" aria-hidden={true} />
          <span>
            {t('identity')} {t('identityDetail')}
          </span>
          <TrackedLink
            href="/about"
            event="accueil-a-propos"
            className="font-medium text-white underline underline-offset-2 hover:text-white/90"
          >
            {t('identityLink')}
          </TrackedLink>
        </p>

        {/* Accroche éditoriale. Le verdict chiffré vit dans le panneau, à droite. */}
        <h1 className="mt-4 max-w-3xl text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
          {t('protoHeroTitle')}
        </h1>

        <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/85">
          {t('protoHeroSubtitle')}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <TrackedLink
            href="/dossiers"
            event="accueil-cta-dossiers"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-slate-900 transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800"
          >
            {t('protoCtaDossiers')}
            <ArrowRight size={14} aria-hidden={true} />
          </TrackedLink>
          {/* Second bouton : libellé et destination viennent de data/homepage-cta.json. */}
          <TrackedAnchor
            href={cta.href}
            event="accueil-cta-secondaire" eventData={{ cible: cta.href }}
            className="inline-flex items-center rounded-lg border border-white/70 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800"
          >
            {cta.label}
          </TrackedAnchor>
        </div>

        </div>

        <div className="rounded-lg border border-white/15 bg-white/5 p-5">
          <GovernmentDayCounter
            oathDate={governmentData.oathDate}
            // La locale, pas 'fr' en dur : la phrase était traduite mais la date
            // qu'elle contient restait française (« since the swearing-in of
            // 14 février 2026 »), ce qui est pire qu'un texte entièrement français.
            oathLabel={formatDate(governmentData.oathDate, locale)}
          />
          <CommitmentsBarometer commitments={commitmentsData.commitments} />
          {/* Daté : sans date, des statuts figés se présentaient comme actuels si la
              veille s'arrêtait (revue de l'accueil, 28/09/2026). */}
          <p className="mt-3 text-xs text-white/80">
            {t('barometerAsOf', { date: formatDate(commitmentsData.lastModified, locale) })}
          </p>
        </div>
      </div>
    </section>
  );
}

// Deux statuts, deux blocs, deux registres. À gauche, ce qui est vérifié et sourcé :
// des titres de fiches, courts, datés une fois par journée. À droite, ce qu'on
// surveille : des phrases entières, en annotation de marge, sans date ni cadre.
// Les deux listes ne fusionnent pas, une mise à jour et un signal n'ont pas le même
// statut. Pas d'ambre ici : dans le baromètre, cette couleur veut déjà dire « Retardé ».

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

  // Bloc de veille :
  // encadré, en-tête de veille avec « Notre méthode », séparateur, titre des signaux,
  // puis date et phrase entière, « Voir tout le radar » et le garde-fou éditorial.
  //
  // La ligne de veille revient ICI et a été retirée du héros, où le prototype l'avait
  // déplacée : la garder aux deux endroits la dirait deux fois. Seul le chiffre change
  // par rapport au live : les sources SUIVIES (veille éditoriale) et non les sources
  // consultées, qui comptaient aussi le scan mensuel. Les deux comptes se lisent à
  // l'exécution et bougent à chaque ajout : ne pas les recopier en dur.
  //
  // Les résumés sont des PHRASES, pas des titres : leur sens est à la fin, une coupe
  // à une ligne les décapitait. Une partie des signaux n'a pas de résumé et passe par
  // le repli sur la description. getHomepageBlurb les borne à 180 caractères, des
  // deux côtés, ce qui tient en quatre lignes ici :
  // aucune coupe CSS à ajouter.
  return (
    // La gouttière vient désormais du lg:gap-x-8 de la grille parente, plus d'une
    // marge intérieure : sans elle, les colonnes se touchaient et ce titre percutait
    // « Tout l'historique ».
    <div aria-labelledby="watch-title" className="min-w-0">
      {/* Titre de colonne avec son icône. Le libellé reste
          « Ce qu'on surveille » et non « Suivre » : titre choisi en cours de projet. */}
      <div className="mb-4 flex items-center gap-2">
        <Radio size={18} className="text-neutral-500" aria-hidden={true} />
        <h2
          id="watch-title"
          className="text-sm font-semibold uppercase tracking-wider text-neutral-500"
        >
          {t('protoWatchTitle')}
        </h2>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-neutral-50">
        <div className="px-4 pb-3 pt-4">
          <div className="flex items-center gap-2 text-xs text-neutral-700">
            <Eye size={14} className="shrink-0 text-neutral-500" aria-hidden={true} />
            <span className="font-medium">{t('protoVeilleActive', { count: sourceCount })}</span>
          </div>
          <TrackedLink
            href="/methodology"
            event="accueil-methode"
            className="mt-1.5 inline-flex min-h-[24px] items-center gap-1 pl-[22px] text-xs font-medium text-brand-700 hover:text-brand-900"
          >
            {t('veilleMethod')}
            <ArrowRight size={12} aria-hidden={true} />
          </TrackedLink>
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
              <div key={signal.id} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
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
          <TrackedLink
            href="/radar"
            event="accueil-radar"
            className="inline-flex min-h-[24px] items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-900"
          >
            {tr('seeAll')}
            <ArrowRight size={12} aria-hidden={true} />
          </TrackedLink>
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

// ──────────────────────────────────────────────
// Colonne « Comprendre », à droite de la surveillance en tête de page
// ──────────────────────────────────────────────
//
// Les deux lignes qui précédaient décrivaient « deux portes sous le haut de page,
// le digest et le Stuut », et un turquoise repris du jeu : ni les portes ni le
// turquoise n'existent encore. La numérotation des sections de ce fichier est par
// ailleurs devenue fausse (1, 9, 4, 5, 6, 7 dans cet ordre, 2, 3 et 8 supprimées) :
// elle n'est plus un guide de lecture, ces bandeaux nomment donc la section.

// Colonne « Comprendre » : les quatre
// explicateurs dans un encadré, puis la table du gouvernement. Elle était jusqu'ici
// une section pleine largeur reléguée en bas de page, sous le nom « Nouveau ici ? » ;
// elle remonte face à la surveillance, comme dans le live.
function UnderstandColumn({ locale }: { locale: string }) {
  const t = useTranslations('home');

  const explainers = [
    { href: '/how-to-read' as const, label: t('explainerMap'), Icon: Map },
    { href: '/explainers/brussels-overview' as const, label: t('explainerBuilding'), Icon: Building },
    { href: '/explainers/levels-of-power' as const, label: t('explainerUsers'), Icon: Users },
    { href: '/explainers/brussels-paradox' as const, label: t('explainerScale'), Icon: Scale },
  ];

  return (
    <div aria-labelledby="understand-title" className="min-w-0">
      <div className="mb-4 flex items-center gap-2">
        <BookOpen size={18} className="text-neutral-500" aria-hidden={true} />
        <h2
          id="understand-title"
          className="text-sm font-semibold uppercase tracking-wider text-neutral-500"
        >
          {t('columnUnderstand')}
        </h2>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
        <p className="mb-3 text-xs font-medium text-neutral-500">{t('newHere')}</p>
        <div className="space-y-1">
          {explainers.map((exp) => (
            <TrackedLink
              key={exp.href}
              href={exp.href}
              event="accueil-explicateur" eventData={{ fiche: exp.href }}
              className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm text-neutral-800 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            >
              <exp.Icon size={16} className="shrink-0 text-neutral-500" aria-hidden={true} />
              {exp.label}
            </TrackedLink>
          ))}
        </div>
        <div className="mt-3 border-t border-neutral-100 pt-3">
          <TrackedLink
            href="/understand"
            event="accueil-comprendre-tout"
            className="inline-flex min-h-[24px] items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-900"
          >
            {t('allExplainers')}
            <ArrowRight size={12} aria-hidden={true} />
          </TrackedLink>
        </div>
      </div>

      <div className="mt-4">
        <GovernmentTable locale={locale} inline />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// 4. Dossiers (compact cards)
// ──────────────────────────────────────────────

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
  const t = useTranslations('home');
  // Short units read with the number ("62 200 SPA"); long ones are sentences and go below.
  const inlineUnit = unit && unit.length <= 24 ? unit : undefined;
  const detail = [inlineUnit ? undefined : unit, label].filter(Boolean).join(' · ');
  // Seul un nombre passe au-dessus du titre de la carte ; une phrase ou une
  // date garde la taille du texte courant (voir src/lib/key-figure.ts).
  const valueClass = isNumericFigure(value)
    ? 'line-clamp-2 text-lg font-bold leading-tight text-brand-900'
    : 'line-clamp-2 text-sm font-semibold leading-snug text-brand-900';
  return (
    <div className="mt-3">
      <p className={valueClass}>
        {value}
        {inlineUnit && <span className="ml-1 text-sm font-medium text-neutral-700">{inlineUnit}</span>}
      </p>
      {detail && <p className="mt-1 line-clamp-2 text-xs leading-snug text-neutral-600">{detail}</p>}
      {/* Sous 768 px, la source n'est plus affichée mais reste lue par les lecteurs
          d'écran (sr-only), et la fiche la donne en entier : 20 px de moins par
          carte. */}
      {source && (
        <p className="mt-1 line-clamp-1 text-xs text-neutral-500 max-md:sr-only">
          {t('keyFigureSource', { source })}
        </p>
      )}
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
    <section aria-labelledby="dossiers-title" className="py-6 md:py-8">
      <div className="mx-auto max-w-5xl px-4">
        <SectionHeader
          id="dossiers-title"
          icon={FolderOpen}
          title={t('dossiersHomeTitle')}
          subtitle={t('dossiersHomeSubtitle')}
          link={<MoreLink href="/dossiers">{t('viewAllDossiers', { count: totalCount })}</MoreLink>}
        />
        <div className="grid gap-3 md:grid-cols-2">
          {cards.map((card, i) => {
            const m = card.metrics[0];
            return (
              <TrackedLink
                key={card.slug}
                href={{ pathname: '/dossiers/[slug]', params: { slug: getLocalizedSlug(card, locale as Locale) } }}
                // Un seul nom pour les treize cartes, le type et le slug en propriétés.
                event="accueil-fiche" eventData={{ type: "dossier", slug: card.slug }}
                className={cn(cardClass, i >= MOBILE_CARDS && 'max-md:hidden')}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold leading-snug text-neutral-900">{card.title}</h3>
                  <span
                    className={dossierBadgeClass(card.phase)}
                  >
                    {td(`phase.${card.phase}`)}
                  </span>
                </div>
                {m && <KeyFigure value={m.value} unit={m.unit} label={m.label} source={m.source} />}
                <CardFooter>{td('lastModified', { date: formatDate(card.lastModified, locale) })}</CardFooter>
              </TrackedLink>
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
    <section aria-labelledby="domains-title" className="py-6 md:py-8">
      <div className="mx-auto max-w-5xl px-4">
        <SectionHeader
          id="domains-title"
          icon={LayoutGrid}
          title={t('domainsHomeTitle')}
          subtitle={t('domainsHomeSubtitle')}
          link={<MoreLink href="/domains">{t('viewAllDomains', { count: totalCount })}</MoreLink>}
        />
        <div className="grid gap-3 md:grid-cols-2">
          {cards.map((card, i) => {
            const m = card.metrics[0];
            return (
              <TrackedLink
                key={card.slug}
                href={{ pathname: '/domains/[slug]', params: { slug: card.slug } }}
                event="accueil-fiche" eventData={{ type: "domaine", slug: card.slug }}
                className={cn(cardClass, i >= MOBILE_CARDS && 'max-md:hidden')}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold leading-snug text-neutral-900">{card.title}</h3>
                  <span
                    className={domainBadgeClass(card.status)}
                  >
                    {tdo(`status.${card.status}`)}
                  </span>
                </div>
                {/* Le chapeau du domaine, comme sur la fiche et comme en production.
                    Le rendu compact l'avait laissé tomber au profit du seul chiffre :
                    la section perdait 2 839 caractères indexables face au live, soit
                    la totalité de l'écart de texte entre le prototype et la prod.
                    Sur mobile, il est coupé à l'œil après deux lignes : les quatre
                    chapeaux (430 à 490 caractères) faisaient 2 092 px de section à
                    390 px. Le texte entier reste dans le DOM (indexable, lu par les
                    lecteurs d'écran) et la carte mène à la fiche. Desktop inchangé. */}
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-neutral-600 md:line-clamp-none">
                  {card.summary}
                </p>
                {m && <KeyFigure value={m.value} unit={m.unit} label={m.label} source={m.source} />}
                <CardFooter>{tdo('lastModified', { date: formatDate(card.lastModified, locale) })}</CardFooter>
              </TrackedLink>
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
  // Même libellé que les cartes de domaine : « Mis à jour le » était écrit en dur en français.
  const tdo = useTranslations('domains');

  return (
    <section aria-labelledby="sectors-title" className="py-6 md:py-8">
      <div className="mx-auto max-w-5xl px-4">
        <SectionHeader
          id="sectors-title"
          icon={Building2}
          title={t('sectorsHomeTitle')}
          subtitle={t('sectorsHomeSubtitle')}
          link={<MoreLink href="/sectors">{t('viewAllSectorsCount', { count: totalCount })}</MoreLink>}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, i) => {
            const indicator = card.impactIndicators[0];
            return (
              <TrackedLink
                key={card.slug}
                href={{ pathname: '/sectors/[slug]', params: { slug: card.slug } }}
                event="accueil-fiche" eventData={{ type: "secteur", slug: card.slug }}
                // Grille à une colonne sous sm seulement : les six cartes restent de
                // 640 à 767 px, en deux colonnes. Voir MOBILE_CARDS.
                className={cn(cardClass, i >= MOBILE_CARDS && 'max-sm:hidden')}
              >
                <h3 className="text-base font-semibold leading-snug text-neutral-900">{card.title}</h3>
                {indicator && <KeyFigure value={indicator.value} label={indicator.label} source={indicator.source} />}
                <CardFooter>{tdo('lastModified', { date: formatDate(card.lastModified, locale) })}</CardFooter>
              </TrackedLink>
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
// Second lien d'une carte à lien étiré : posé AU-DESSUS du pseudo-élément (z-10),
// avec une cible de 24 px (WCAG 2.5.8), sans s'étirer lui-même.
const digestEmailLink = `${linkClass} relative z-10 min-h-6`;

function RowLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-600">{children}</h3>
  );
}

function FormatCard({
  title,
  visual,
  children,
  meta,
  visualInteractive,
  visualClassName = 'h-16',
  link,
  className,
}: {
  title: string;
  /** Décoratif par défaut : le titre et le texte portent le sens. */
  visual: ReactNode;
  children: ReactNode;
  /** Précision de second rang, hors du `line-clamp` du corps. */
  meta?: ReactNode;
  /**
   * À activer quand le visuel contient des éléments focalisables. Sans cela, le
   * conteneur reste `aria-hidden` : les liens disparaîtraient de l'arbre
   * d'accessibilité tout en restant atteignables au clavier, ce qui est une
   * non-conformité (un focus qui se pose sur un élément que rien n'annonce).
   */
  visualInteractive?: boolean;
  /** Hauteur de la vignette ; `h-16` par défaut. */
  visualClassName?: string;
  link: ReactNode;
  /** Pour qu'une carte occupe deux colonnes tant que la grille n'en a que deux. */
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative flex h-full flex-col overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 transition-colors hover:border-neutral-400',
        className,
      )}
    >
      <div
        className={cn('overflow-hidden border-b border-neutral-200', visualClassName)}
        aria-hidden={visualInteractive ? undefined : true}
      >
        {visual}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h4 className="text-sm font-semibold text-neutral-900">{title}</h4>
        <p className="mt-1 line-clamp-3 text-xs leading-snug text-neutral-700">{children}</p>
        {meta && <p className="mt-1.5 text-[11px] leading-snug text-neutral-600">{meta}</p>}
        <div className="mt-auto pt-2">{link}</div>
      </div>
    </div>
  );
}

// Même hauteur pour le digest et le magazine, côte à côte sous `lg`.
const FORMAT_VISUAL_TALL = 'h-24 lg:h-16';

/** « (FR) » à l'écran, « (français) » prononcé en français par les lecteurs d'écran. */
function FrenchOnlyMark() {
  return (
    <>
      <span aria-hidden="true">(FR)</span>
      <span className="sr-only" lang="fr">
        {` (${nativeName('fr').toLowerCase()})`}
      </span>
    </>
  );
}

function FormatsSection({
  digest,
  magazine,
  weekNum,
}: {
  /** `linkableLangs` : les langues qui ont un digest réel pour `weekPath`, donc les
   *  seules à rendre cliquables. */
  digest: {
    href: string;
    weekNum: string;
    langs: string[];
    linkableLangs: string[];
    weekPath: string;
  } | null;
  magazine: { tagline: string; href: string } | null;
  weekNum: string | null;
}) {
  const t = useTranslations('home');
  const locale = useLocale();

  return (
    <section aria-labelledby="formats-title" className="py-6 md:py-8">
      <div className="mx-auto max-w-5xl px-4">
        <SectionHeader id="formats-title" title={t('protoFormatsTitle')} />

        <RowLabel>
          <span className="mt-4 block">{t('protoWeekly')}</span>
        </RowLabel>
        {/* Deux colonnes dès 390 px : trois cartes empilées coûtaient 630 px sur mobile. */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <FormatCard
            title={t('protoDigestName')}
            visualInteractive
            // Pastilles de 24 px (WCAG 2.5.8) : onze langues tiennent sur trois rangées
            // à 390 px, d'où une vignette de 96 px tant que la grille a deux colonnes.
            visualClassName={FORMAT_VISUAL_TALL}
            visual={
              <div className="flex h-full flex-wrap content-center gap-1 overflow-y-auto bg-neutral-100 px-2 py-1.5">
                {/* Chaque langue réellement traduite est un VRAI lien (règle du
                    29/06/2026, livrée par #319 sur le bandeau que cette carte remplace).
                    Celles qui n'ont pas de digest pour cette semaine restent inertes,
                    pour ne pas mener à une page française sous une URL étrangère.
                    Le code à deux lettres tient dans la carte ; le nom natif est porté
                    par `lang` et par le nom accessible, pour la prononciation. */}
                {(digest?.langs ?? CORE_DIGEST_LOCALES).map((lang) => {
                  // Cible de 24 × 24 px au moins (WCAG 2.5.8) : les pastilles faisaient
                  // 18 px de haut, sur un pas vertical de 22 px, trop serré pour
                  // l'exception d'espacement.
                  const pastille =
                    'inline-flex min-h-6 min-w-6 items-center justify-center rounded-full border px-1.5 text-[11px] font-semibold uppercase leading-4';
                  if (!digest?.linkableLangs.includes(lang)) {
                    return (
                      <span
                        key={lang}
                        lang={lang}
                        className={`${pastille} border-neutral-400 text-neutral-500`}
                      >
                        {lang}
                      </span>
                    );
                  }
                  return (
                    <TrackedAnchor
                      key={lang}
                      href={`/digest/${lang}/${digest.weekPath}`}
                      lang={lang}
                      aria-label={t('protoDigestLangAria', { lang: nativeName(lang) })}
                      // Un seul nom d'événement pour onze pastilles, la langue en
                      // propriété : onze noms distincts seraient illisibles dans Umami.
                      event="accueil-digest-langue" eventData={{ lang: lang }}
                      className={`${pastille} relative z-10 border-brand-700 text-brand-700 transition-colors hover:bg-brand-700 hover:text-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700`}
                    >
                      {lang}
                    </TrackedAnchor>
                  );
                })}
              </div>
            }
            meta={
              digest
                ? t('protoDigestMeta', {
                    envoi: CORE_DIGEST_LOCALES.length,
                    lecture: digest.langs.length,
                  })
                : undefined
            }
            link={
              // Deux liens FRÈRES, jamais imbriqués : lire le digest de la semaine
              // (lien étiré, toute la carte), et le recevoir par email. Ce second
              // lien n'était rendu que s'il n'existait aucun digest, donc jamais.
              <span className="flex flex-col items-start gap-0.5">
                {digest && (
                  <TrackedAnchor href={digest.href} event="accueil-digest" className={stretchedLink}>
                    {t('protoDigestRead', { week: digest.weekNum })}
                    <ArrowRight size={14} aria-hidden={true} />
                  </TrackedAnchor>
                )}
                <TrackedAnchor href="#subscribe" event="accueil-digest-abonnement" className={digestEmailLink}>
                  {digest ? t('protoDigestByEmail') : t('protoDigestSubscribe')}
                </TrackedAnchor>
              </span>
            }
          >
            {/* Ce que contient l'email, et non le titre du numéro de la semaine : un
                sommaire change tous les lundis et décrit un exemplaire, pas le produit.
                Les trois éléments cités sont des rubriques réelles de src/emails/digest.tsx
                (weeklyNumberTitle, commitmentsTitle, et les quatre sections de fiches). */}
            {t('protoDigestWhat')}
          </FormatCard>

          <FormatCard
            title={t('protoMagazineName')}
            visualClassName={FORMAT_VISUAL_TALL}
            visual={
              <div className="flex h-full flex-col justify-center bg-neutral-100 px-3 py-2">
                <p className={`${dmSerif.className} text-xl leading-none text-neutral-900`}>Magazine</p>
                {weekNum && (
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-neutral-600 lining-nums">
                    {t('protoMagazineWeek', { week: weekNum })}
                  </p>
                )}
              </div>
            }
            link={
              // Le numéro ne dépend pas de la langue, seule la tagline est FR. La
              // vignette annonçait « Semaine 37 » en nl/en/de pendant que le lien
              // retombait sur le sommaire général : on renvoyait le lecteur ailleurs
              // que là où on lui promettait d'aller.
              <TrackedAnchor
                href={
                  weekNum
                    ? `https://magazine.governance.brussels/s${weekNum}/`
                    : 'https://magazine.governance.brussels/'
                }
                event="accueil-magazine"
                // Le magazine n'existe qu'en français : on le dit avant le clic, hors fr.
                hrefLang="fr"
                className={stretchedLink}
              >
                {weekNum ? t('protoMagazineRead', { week: weekNum }) : t('protoMagazineReadPlain')}
                {locale !== 'fr' && <FrenchOnlyMark />}
                <ArrowRight size={14} aria-hidden={true} />
              </TrackedAnchor>
            }
          >
            {magazine ? `« ${magazine.tagline} »` : t('protoMagazineFallback')}
          </FormatCard>

          {/* Trois cartes dans une grille à deux colonnes laissaient une cellule vide,
              mesurée à 362 x 179 px à 768 px et 173 x 215 px à 390 px. La troisième
              prend donc la rangée entière tant que la grille n'a pas trois colonnes. */}
          <FormatCard
            className="max-lg:col-span-2"
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
              <TrackedLink href="/signal" event="accueil-signal" className={stretchedLink}>
                {t('protoSignalCta')}
                <ArrowRight size={14} aria-hidden={true} />
              </TrackedLink>
            }
          >
            {t('protoSignalTeaser')}
          </FormatCard>
        </div>
      </div>
    </section>
  );
}
