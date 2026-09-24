// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { ReactNode } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Breadcrumb } from '@/components/breadcrumb';
import { CopyButton } from '@/components/presse/copy-button';
import { formatDate } from '@/lib/utils';
import { PRESS_KINDS, groupPressMentions, latestVerification, type PressMention } from '@/lib/press';
import { pressFactFigure, type PressFact } from '@/lib/press-facts';
import type { PressStats } from '@/lib/site-stats';

/** Adresse validée par le propriétaire du site (24/09/2026) : ni formulaire ni téléphone. */
export const PRESS_EMAIL = 'contact@brusselsgovernance.be';

export interface PressFactView extends PressFact {
  /** URL absolue et localisée de la fiche, pour la formulation suggérée. */
  pageUrl: string;
}

const PROVIDE_KEYS = ['provide1', 'provide2', 'provide3', 'provide4', 'provide5', 'provide6'] as const;

const linkClass =
  'font-medium text-brand-800 underline decoration-brand-700/40 underline-offset-2 hover:text-brand-900 hover:decoration-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2';

const sectionClass = 'mt-12 scroll-mt-24';
const h2Class = 'text-xl font-semibold text-neutral-900';

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function languageName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Lien externe : nouvel onglet annoncé, comme dans le pied de page du site. */
function ExternalLink({
  href,
  newTab,
  children,
  className = linkClass,
  lang,
  ...data
}: {
  href: string;
  newTab: string;
  children: ReactNode;
  className?: string;
  lang?: string;
} & Record<`data-${string}`, string>) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} lang={lang} {...data}>
      {children}
      <span className="ml-1" aria-hidden="true">
        &#8599;
      </span>
      <span className="sr-only"> ({newTab})</span>
    </a>
  );
}

export function PresseView({
  locale,
  stats,
  facts,
  mentions,
}: {
  locale: string;
  stats: PressStats;
  facts: PressFactView[];
  mentions: PressMention[];
}) {
  const t = useTranslations('press');
  const tb = useTranslations('breadcrumb');
  const tf = useTranslations('footer');
  const td = useTranslations('domains');
  const format = useFormatter();
  const newTab = tf('newTab');

  const groupes = groupPressMentions(mentions);
  const verifie = latestVerification(mentions);

  const copyLabels = {
    copiedMessage: t('copied'),
    selectedMessage: t('selected'),
  };

  const statItems: Array<{ key: string; value: number; label: string }> = [
    { key: 'pages', value: stats.pages, label: t('stats.pages') },
    { key: 'sources', value: stats.sourcesSuivies, label: t('stats.sources') },
    { key: 'dossiers', value: stats.dossiers, label: t('stats.dossiers') },
    { key: 'domaines', value: stats.domaines, label: t('stats.domaines') },
    { key: 'langues', value: stats.langues, label: t('stats.langues') },
  ];

  return (
    <section className="py-12">
      <div className="mx-auto max-w-5xl px-4">
        <Breadcrumb items={[{ label: tb('home'), href: '/' }, { label: tb('press') }]} />

        {/* A. Titre, chapeau, en bref */}
        <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">{t('pageTitle')}</h1>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-neutral-700">{t('lead')}</p>

        <section aria-labelledby="presse-en-bref" className="mt-10">
          <h2 id="presse-en-bref" className={h2Class}>
            {t('briefTitle')}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-700">{t('briefLine')}</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {statItems.map((s) => (
              <div
                key={s.key}
                data-stat={s.key}
                className="flex flex-col-reverse rounded-lg border border-neutral-200 bg-neutral-50 p-4"
              >
                <dt className="mt-1 text-xs leading-snug text-neutral-600">{s.label}</dt>
                <dd className="text-2xl font-bold text-brand-900">{format.number(s.value)}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-xs text-neutral-500">{t('statsNote')}</p>
        </section>

        {/* B. Ce que BGM peut fournir */}
        <section aria-labelledby="presse-fournir" className={sectionClass}>
          <h2 id="presse-fournir" className={h2Class}>
            {t('provideTitle')}
          </h2>
          <ul className="mt-4 grid max-w-3xl gap-2 text-sm leading-relaxed text-neutral-700 sm:grid-cols-2">
            {PROVIDE_KEYS.map((k) => (
              <li key={k} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-status-delayed" aria-hidden="true" />
                <span>{t(k)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 max-w-3xl border-l-2 border-brand-700 pl-3 text-sm leading-relaxed text-neutral-700">
            {t('provideNote')}
          </p>
        </section>

        {/* C. Trois informations prêtes à citer */}
        {facts.length > 0 && (
          <section aria-labelledby="presse-faits" className={sectionClass}>
            <h2 id="presse-faits" className={h2Class}>
              {t('factsTitle')}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-600">{t('factsIntro')}</p>
            <ul className="mt-4 grid gap-4 lg:grid-cols-3">
              {facts.map((f) => {
                const citationId = `presse-fait-${f.slug}`;
                const figure = pressFactFigure(f);
                const date = formatDate(f.date, locale);
                const pageHref =
                  f.collection === 'domain'
                    ? ({ pathname: '/domains/[slug]', params: { slug: f.routeSlug } } as const)
                    : ({ pathname: '/dossiers/[slug]', params: { slug: f.routeSlug } } as const);
                return (
                  <li
                    key={`${f.collection}-${f.slug}`}
                    data-fait={f.slug}
                    className="flex min-w-0 flex-col rounded-lg border border-neutral-200 bg-neutral-50 p-5"
                  >
                    <h3 className="text-sm font-semibold leading-snug text-neutral-900">{f.label}</h3>
                    <p className="mt-2 break-words text-2xl font-bold leading-tight text-brand-900">{f.value}</p>
                    {f.unit && <p className="mt-1 text-xs leading-snug text-neutral-600">{f.unit}</p>}
                    <dl className="mt-3 space-y-1 text-xs text-neutral-600">
                      <div className="flex flex-wrap gap-x-1">
                        <dt>{t('factDateLabel')}</dt>
                        <dd>
                          <time dateTime={f.date}>{date}</time>
                        </dd>
                      </div>
                      <div className="flex flex-wrap gap-x-1">
                        <dt>{t('factConfidenceLabel')}</dt>
                        <dd className="font-medium text-neutral-800">{td(`confidence.${f.confidence}`)}</dd>
                      </div>
                      {f.source && (
                        <div className="flex flex-wrap gap-x-1">
                          <dt>{t('factSourceLabel')}</dt>
                          <dd className="min-w-0 break-words">
                            {f.source}
                            {f.sourceUrl && (
                              <>
                                {' '}
                                (
                                <ExternalLink href={f.sourceUrl} newTab={newTab}>
                                  {hostOf(f.sourceUrl)}
                                </ExternalLink>
                                )
                              </>
                            )}
                          </dd>
                        </div>
                      )}
                    </dl>
                    <p className="mt-3 text-xs">
                      <Link
                        href={pageHref}
                        className={linkClass}
                        data-umami-event="presse-fait"
                        data-umami-event-action="page"
                        data-umami-event-slug={f.slug}
                      >
                        {t('factPage', { title: f.pageTitle })}
                      </Link>
                    </p>
                    <div className="mt-4 border-t border-neutral-200 pt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                        {t('suggestedLabel')}
                      </p>
                      <p id={citationId} className="mt-1 break-words text-sm leading-relaxed text-neutral-800">
                        {f.source
                          ? t('suggested', { label: f.label, figure, source: f.source, date, url: f.pageUrl })
                          : t('suggestedNoSource', { label: f.label, figure, date, url: f.pageUrl })}
                      </p>
                      <CopyButton
                        targetId={citationId}
                        label={t('copyReference')}
                        event="presse-fait"
                        eventData={{ action: 'copie', slug: f.slug }}
                        {...copyLabels}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* D. Textes de présentation */}
        <section aria-labelledby="presse-presenter" className={sectionClass}>
          <h2 id="presse-presenter" className={h2Class}>
            {t('presentTitle')}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-600">{t('presentIntro')}</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-5">
              <h3 className="text-sm font-semibold text-neutral-900">{t('shortTitle')}</h3>
              <p id="presse-texte-court" className="mt-2 text-sm leading-relaxed text-neutral-800">
                {t('shortText')}
              </p>
              <CopyButton
                targetId="presse-texte-court"
                label={t('copyText')}
                event="presse-copie-courte"
                {...copyLabels}
              />
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-5">
              <h3 className="text-sm font-semibold text-neutral-900">{t('longTitle')}</h3>
              <p id="presse-texte-long" className="mt-2 text-sm leading-relaxed text-neutral-800">
                {t('longText')}
              </p>
              <CopyButton
                targetId="presse-texte-long"
                label={t('copyText')}
                event="presse-copie-longue"
                {...copyLabels}
              />
            </div>
          </div>
        </section>

        {/* F. Revue de presse */}
        <section aria-labelledby="presse-revue" className={sectionClass}>
          <h2 id="presse-revue" className={h2Class}>
            {t('reviewTitle')}
          </h2>
          {PRESS_KINDS.map((kind) => {
            const liste = groupes[kind];
            if (liste.length === 0) return null;
            return (
              <section key={kind} aria-labelledby={`presse-${kind}`} data-kind={kind} className="mt-6">
                <h3 id={`presse-${kind}`} className="text-base font-semibold text-neutral-900">
                  {t(`kinds.${kind}.title`)}
                </h3>
                <p className="mt-1 max-w-3xl text-sm text-neutral-600">{t(`kinds.${kind}.description`)}</p>
                <ul className="mt-3 space-y-3">
                  {liste.map((m) => (
                    <li
                      key={m.id}
                      data-mention={m.id}
                      className="rounded-lg border border-neutral-200 bg-neutral-50 p-4"
                    >
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-600">
                        <span className="font-semibold text-neutral-800">{m.outlet}</span>
                        {m.publishedAt && (
                          <>
                            <span aria-hidden="true">·</span>
                            <time dateTime={m.publishedAt}>{formatDate(m.publishedAt, locale)}</time>
                          </>
                        )}
                        {!m.publishedAt && m.updatedAt && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>
                              {t('updatedOn')} <time dateTime={m.updatedAt}>{formatDate(m.updatedAt, locale)}</time>
                            </span>
                          </>
                        )}
                        {m.author && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{t('by', { author: m.author })}</span>
                          </>
                        )}
                      </p>
                      <p className="mt-1 text-sm">
                        <ExternalLink
                          href={m.url}
                          newTab={newTab}
                          lang={m.lang !== locale ? m.lang : undefined}
                          data-umami-event="presse-mention"
                          data-umami-event-id={m.id}
                          data-umami-event-kind={m.kind}
                        >
                          {m.title}
                        </ExternalLink>
                      </p>
                      {m.context && <p className="mt-1 text-xs text-neutral-600">{m.context}</p>}
                      {m.translatedVersions.length > 0 && (
                        <p className="mt-1 text-xs text-neutral-600">
                          {m.translatedVersions.map((v) => (
                            <ExternalLink
                              key={v.url}
                              href={v.url}
                              newTab={newTab}
                              data-umami-event="presse-mention"
                              data-umami-event-id={m.id}
                              data-umami-event-kind={m.kind}
                              data-umami-event-langue={v.lang}
                            >
                              {t('otherVersion', { language: languageName(v.lang, locale) })}
                            </ExternalLink>
                          ))}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          {verifie && (
            <p className="mt-4 text-xs text-neutral-500">
              {t('verifiedNote', { date: formatDate(verifie, locale) })}
            </p>
          )}
        </section>

        {/* G. Contact */}
        <section
          aria-labelledby="presse-contact"
          className={`${sectionClass} rounded-lg border border-brand-700/30 bg-neutral-100 p-5 sm:p-6`}
        >
          <h2 id="presse-contact" className={h2Class}>
            {t('contactTitle')}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-700">{t('contactQuestion')}</p>
          <p className="mt-3 text-base">
            <a
              href={`mailto:${PRESS_EMAIL}`}
              className={`${linkClass} break-all`}
              data-umami-event="presse-contact"
            >
              {PRESS_EMAIL}
            </a>
          </p>
          <p className="mt-3 text-sm leading-relaxed text-neutral-700">{t('contactInterviews')}</p>
          <p className="mt-2 text-sm leading-relaxed text-neutral-700">{t('contactCite')}</p>
        </section>
      </div>
    </section>
  );
}
