// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getContentPr,
  getPrFiles,
  getCheckState,
  publishablePrProblem,
  type CheckState,
  type ContentPr,
} from '@/lib/github-pr';
import { chainState, readDigestSnapshot } from '@/lib/publication-deadlines';
import { collectSummaryChanges } from '@/lib/change-summary';
import { fileSetRefusal } from '@/lib/mergeable-files';
import { Verdict } from '@/components/admin/content/verdict';
import { ChainStateBanner } from '@/components/admin/content/chain-state';
import { ContentChanges } from '@/components/admin/content/content-changes';
import { ActionBar } from '@/components/admin/content/action-bar';
import { Published } from '@/components/admin/content/published';

export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  return { title: 'Publication', robots: { index: false, follow: false } };
}

/**
 * Toute lecture d'horloge et tout appel réseau vivent ici, jamais dans le
 * rendu : `react-hooks/purity` interdit `new Date()` pendant le rendu.
 */
type LoadResult =
  | { kind: 'missing' }
  | { kind: 'refused'; reason: string }
  | {
      kind: 'ok';
      pr: ContentPr;
      files: Awaited<ReturnType<typeof getPrFiles>>;
      checks: CheckState | null;
      digest: Awaited<ReturnType<typeof readDigestSnapshot>>;
      summaries: Awaited<ReturnType<typeof collectSummaryChanges>>;
      fileRefusal: string | null;
      now: Date;
    };

async function load(number: number): Promise<LoadResult> {
  const pr = await getContentPr(number);
  if (!pr) return { kind: 'missing' };

  // Origine, préfixe de branche, branche cible : le même contrat que la liste
  // et la route de fusion. Sans ce garde, cette page affichait n'importe
  // quelle PR ouverte — y compris une PR de fork, dont le titre et le corps
  // sont écrits par un inconnu — dans l'habillage de confiance de l'admin.
  const reason = publishablePrProblem(pr, process.env.GITHUB_REPO ?? '');
  if (reason) return { kind: 'refused', reason };

  // Les contrôles requis dépendent des chemins touchés : il faut donc les
  // fichiers avant de pouvoir juger les contrôles.
  const [files, digest] = await Promise.all([
    getPrFiles(number),
    readDigestSnapshot(),
  ]);
  let checks: CheckState | null = null;
  try {
    checks = await getCheckState(pr.sha, files.files.map((f) => f.path));
  } catch {
    checks = null; // l'écran affichera « état des contrôles indisponible »
  }

  // Même fonction que la route de fusion : sans ce calcul, une PR touchant un
  // fichier hors périmètre affichait « Prêt à publier », bouton actif, et
  // recevait un 403 au clic.
  const fileRefusal = fileSetRefusal(files.files.map((f) => f.path));

  const frenchPaths = files.files
    .filter((f) => f.path.startsWith('content/') && f.path.endsWith('.fr.mdx'))
    .map((f) => f.path);
  const summaries = await collectSummaryChanges(frenchPaths, pr.baseSha, pr.sha);

  return {
    kind: 'ok',
    pr,
    files,
    checks,
    digest,
    summaries,
    fileRefusal,
    now: new Date(),
  };
}

export default async function ContentDecisionPage({
  params,
}: {
  params: Promise<{ locale: string; number: string }>;
}) {
  const { locale, number } = await params;
  const parsed = Number(number);
  if (!Number.isInteger(parsed) || parsed <= 0) notFound();

  const data = await load(parsed);
  if (data.kind === 'missing') notFound();

  // On ne rend NI le titre NI le corps d'une PR refusée : ce sont deux
  // chaînes écrites par un inconnu quand la PR vient d'un fork.
  if (data.kind === 'refused') {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-neutral-900">
          Cette PR n&apos;est pas publiable depuis cet écran
        </h1>
        <p className="mt-2 text-neutral-600">
          {data.reason}. Seules les PR de veille ouvertes depuis ce dépôt et
          visant <code>main</code> sont publiables ici.
        </p>
      </div>
    );
  }

  const repo = process.env.GITHUB_REPO ?? '';

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-32">
      {data.pr.mergedAt ? (
        <Published mergedAt={data.pr.mergedAt} files={data.files.files} />
      ) : (
        <>
          {data.checks ? (
            <Verdict
              pr={data.pr}
              checks={data.checks}
              truncated={data.files.truncated}
              fileRefusal={data.fileRefusal}
              now={data.now}
            />
          ) : (
            <section
              aria-labelledby="verdict-titre"
              className="rounded-lg border border-amber-500 bg-amber-50/60 p-6"
            >
              <h1 id="verdict-titre" className="text-2xl font-bold text-neutral-900">
                État des contrôles indisponible
              </h1>
              <p className="mt-2 text-sm text-neutral-600">
                {data.pr.title} · GitHub n&apos;a pas répondu à la demande de contrôles.
                Vérifier sur GitHub avant de publier.
              </p>
            </section>
          )}
          <ChainStateBanner state={chainState(data.digest, data.now)} />
        </>
      )}

      <section className="rounded-lg border border-neutral-200 bg-neutral-50 p-5">
        <h2 className="sr-only">Description de la veille</h2>
        <p className="whitespace-pre-line text-base leading-relaxed text-neutral-900">
          {data.pr.body}
        </p>
      </section>

      <ContentChanges
        files={data.files.files}
        truncated={data.files.truncated}
        summaries={data.summaries}
      />

      <a
        href={`https://github.com/${repo}/pull/${data.pr.number}`}
        className="inline-block text-sm underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        Ouvrir sur GitHub
      </a>

      <details className="rounded-lg border border-neutral-200 bg-neutral-50 p-5">
        <summary className="cursor-pointer text-sm text-neutral-600">Détails techniques</summary>
        <dl className="mt-3 space-y-1 text-sm text-neutral-600">
          <div>PR #{data.pr.number}</div>
          <div>Branche {data.pr.branch}</div>
          <div>Commit {data.pr.sha.slice(0, 7)}</div>
          <div>{data.files.files.length} fichiers au total</div>
        </dl>
      </details>

      {/* Sans état de contrôles, on ne peut pas juger : pas de barre plutôt
          qu'une barre qui autoriserait à l'aveugle. */}
      {!data.pr.mergedAt && data.checks && (
        <ActionBar
          number={data.pr.number}
          sha={data.pr.sha}
          checks={data.checks}
          truncated={data.files.truncated}
          fileRefusal={data.fileRefusal}
          locale={locale}
        />
      )}
    </div>
  );
}
