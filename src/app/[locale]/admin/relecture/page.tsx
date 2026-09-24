// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/require-admin';
import { getTranslations } from 'next-intl/server';
import { signOut } from '@/auth';
import { getDraftCards } from '@/lib/content';
import { type Locale } from '@/i18n/routing';
import { ReviewCard } from '@/components/review-card';
import {
  chargerElementsARelire,
  SUMMARY_MAX_AGE_DAYS,
  type ElementARelire,
  type ElementsARelire,
} from '@/lib/a-relire';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Admin · À relire',
    robots: { index: false, follow: false },
  };
}

type Traducteur = Awaited<ReturnType<typeof getTranslations<'relecture'>>>;

function collectionLabel(t: Traducteur, collection: ElementARelire['collection']): string {
  if (collection === 'domain') return t('item.collectionDomain');
  if (collection === 'dossier') return t('item.collectionDossier');
  return t('item.collectionUnknown');
}

function ageLabel(t: Traducteur, ageDays: number | null): string {
  return ageDays === null ? t('item.ageUnavailable') : t('item.age', { count: ageDays });
}

function fileLabel(t: Traducteur, cheminFichier: string | null): string {
  return cheminFichier === null ? t('item.fileUnavailable') : t('item.file', { path: cheminFichier });
}

/**
 * Une carte par élément, une colonne, zone tactile large pour le seul lien
 * (« Voir la page publiée ») : pensé pour le téléphone de l'éditeur d'abord.
 * L'état (périmé, en retard...) n'est jamais porté par la seule couleur du
 * badge, le motif est toujours écrit en toutes lettres juste en dessous.
 */
function CarteElement({ t, element }: { t: Traducteur; element: ElementARelire }) {
  return (
    <li className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-medium text-neutral-700">
          {collectionLabel(t, element.collection)}
        </span>
        <span className="text-neutral-500 uppercase">{element.locale}</span>
        <span className="text-neutral-500">{ageLabel(t, element.ageDays)}</span>
      </div>

      <p className="text-sm font-semibold text-neutral-900">
        {element.titre ?? t('item.unknownTitle')}
      </p>
      <p className="mt-1 text-sm text-neutral-600">{element.motif}</p>
      <p className="mt-2 font-mono text-xs break-all text-neutral-500">
        {fileLabel(t, element.cheminFichier)}
      </p>

      <a
        href={element.lien}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-block rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-brand-800 hover:bg-neutral-50"
      >
        {t('item.link')}
        <span className="sr-only"> (nouvel onglet)</span>
      </a>
    </li>
  );
}

function SectionElements({
  id,
  t,
  title,
  explain,
  items,
  emptyMessage,
  unavailableMessage,
}: {
  id: string;
  t: Traducteur;
  title: string;
  explain: string;
  items: ElementARelire[] | null;
  emptyMessage: string;
  unavailableMessage?: string;
}) {
  return (
    <section id={id} className="scroll-mt-4">
      <h2 className="text-xl font-semibold text-neutral-900">{title}</h2>
      <p className="mt-1 text-sm text-neutral-600">{explain}</p>

      {items === null && unavailableMessage && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
          {unavailableMessage}
        </p>
      )}

      {items !== null && items.length === 0 && (
        <p className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
          {emptyMessage}
        </p>
      )}

      {items !== null && items.length > 0 && (
        <ul className="mt-4 space-y-3">
          {items.map((el) => (
            <CarteElement key={el.id} t={t} element={el} />
          ))}
        </ul>
      )}
    </section>
  );
}

function total(elements: ElementsARelire, drafts: number): number {
  return (
    elements.faq.length +
    elements.chapeau.length +
    elements.verifications.length +
    drafts +
    (elements.pagesIa?.length ?? 0)
  );
}

function Compteur({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-100"
    >
      {children}
    </a>
  );
}

export default async function AdminRelecturePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdmin(locale);

  // Le layout contrôle aussi la session, mais Next rend la page même quand il
  // redirige : le contrôle ci-dessus est celui qui protège les données.
  const t = await getTranslations('relecture');
  const tReview = await getTranslations('review');

  const elements = await chargerElementsARelire();
  const drafts = getDraftCards(locale as Locale);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const typePathMap: Record<string, string> = {
    domain: 'domains',
    solution: 'solutions',
    sector: 'sectors',
    comparison: 'comparisons',
  };

  const rejectReasons: Record<string, string> = {
    'out-of-scope': tReview('rejectReasons.outOfScope'),
    'insufficient-source': tReview('rejectReasons.insufficientSource'),
    duplicate: tReview('rejectReasons.duplicate'),
    'not-priority': tReview('rejectReasons.notPriority'),
    'factual-error': tReview('rejectReasons.factualError'),
  };

  return (
    <div className="py-12">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">{t('title')}</h1>
            <p className="mt-2 text-neutral-600">{t('intro')}</p>
          </div>
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/' });
            }}
          >
            <button
              type="submit"
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-50"
            >
              {tReview('signOut')}
            </button>
          </form>
        </div>

        {/* Les compteurs en tête : l'éditeur voit d'un coup d'œil, sur
         * téléphone, ce qu'il reste à faire, avant de descendre dans le
         * détail de chaque section. */}
        <p className="mb-3 text-lg font-semibold text-neutral-900">
          {t('total', { count: total(elements, drafts.length) })}
        </p>
        <div className="mb-10 space-y-2">
          <Compteur href="#pages-ia">
            <span>{t('pagesIa.title')}</span>
            <span className="font-semibold tabular-nums">
              {elements.pagesIa === null ? t('unavailableCount') : t('pagesIa.count', { count: elements.pagesIa.length })}
            </span>
          </Compteur>
          <Compteur href="#faq">
            <span>{t('faq.title')}</span>
            <span className="font-semibold tabular-nums">
              {t('faq.count', { count: elements.faq.length })}
            </span>
          </Compteur>
          <Compteur href="#chapeau">
            <span>{t('chapeau.title')}</span>
            <span className="font-semibold tabular-nums">
              {t('chapeau.count', { count: elements.chapeau.length })}
            </span>
          </Compteur>
          <Compteur href="#verifications">
            <span>{t('verifications.title')}</span>
            <span className="font-semibold tabular-nums">
              {t('verifications.count', { count: elements.verifications.length })}
            </span>
          </Compteur>
          <Compteur href="#brouillons">
            <span>{tReview('title')}</span>
            <span className="font-semibold tabular-nums">
              {tReview('count', { count: drafts.length })}
            </span>
          </Compteur>
        </div>

        <div className="space-y-12">
          {/* Ordre des sections : ce que coûte l'oubli, du plus cher au
           * moins cher. Une page citée par un assistant et périmée induit
           * en erreur des lecteurs qui ne visitent jamais governance.brussels
           * directement ; une FAQ en retard peut contredire le corps de la
           * fiche ; un chapeau périmé traîne partout où il est repris
           * (meta description, JSON-LD, chatbot...) mais reste correct sur
           * la page elle-même. */}
          <SectionElements
            id="pages-ia"
            t={t}
            title={t('pagesIa.title')}
            explain={t('pagesIa.explain')}
            items={elements.pagesIa}
            emptyMessage={t('pagesIa.empty')}
            unavailableMessage={t('pagesIa.unavailable')}
          />

          <SectionElements
            id="faq"
            t={t}
            title={t('faq.title')}
            explain={t('faq.explain')}
            items={elements.faq}
            emptyMessage={t('faq.empty')}
          />

          <SectionElements
            id="chapeau"
            t={t}
            title={t('chapeau.title')}
            explain={t('chapeau.explain', { days: SUMMARY_MAX_AGE_DAYS })}
            items={elements.chapeau}
            emptyMessage={t('chapeau.empty', { days: SUMMARY_MAX_AGE_DAYS })}
          />

          {/* Échéances de revérification dépassées : même règle que le
           * content-lint verification-overdue (src/lib/verification-due.ts).
           * Écran éditeur seulement : rien de ceci n'est publié. */}
          <SectionElements
            id="verifications"
            t={t}
            title={t('verifications.title')}
            explain={t('verifications.explain')}
            items={elements.verifications}
            emptyMessage={t('verifications.empty')}
          />

          <section id="brouillons" className="scroll-mt-4">
            <h2 className="text-xl font-semibold text-neutral-900">{tReview('title')}</h2>
            <p className="mt-1 text-sm text-neutral-600">{tReview('description')}</p>

            {drafts.length === 0 ? (
              <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
                {tReview('empty')}
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-neutral-500">{tReview('count', { count: drafts.length })}</p>
                {drafts.map((draft) => {
                  const permalink = `${siteUrl}/${locale}/${typePathMap[draft.type]}/${draft.slug}`;
                  return (
                    <ReviewCard
                      key={`${draft.type}-${draft.slug}-${draft.locale}`}
                      title={draft.title}
                      slug={draft.slug}
                      type={draft.type}
                      locale={draft.locale}
                      lastModified={draft.lastModified}
                      permalink={permalink}
                      labels={{
                        publish: tReview('publish'),
                        reject: tReview('reject'),
                        published: tReview('published'),
                        rejected: tReview('rejected'),
                        preview: tReview('preview'),
                        rejectReasons,
                        confirmPublish: tReview('confirmPublish'),
                        confirmReject: tReview('confirmReject'),
                        cancel: tReview('cancel'),
                        error: tReview('error'),
                      }}
                    />
                  );
                })}
              </div>
            )}

            <div className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-6">
              <h3 className="mb-2 text-sm font-semibold text-neutral-700">{tReview('howTitle')}</h3>
              <ol className="list-inside list-decimal space-y-1 text-sm text-neutral-600">
                <li>{tReview('step1')}</li>
                <li>{tReview('step2')}</li>
                <li>{tReview('step3')}</li>
                <li>{tReview('step4')}</li>
              </ol>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
