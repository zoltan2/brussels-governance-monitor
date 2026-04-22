// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import fs from 'node:fs/promises';
import path from 'node:path';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Admin — Chat telemetry',
    robots: { index: false, follow: false },
  };
}

type UsageEntry = {
  ts: string;
  provider?: string;
  locale?: string;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  dossier_count?: number;
  question?: string;
  session?: string;
  cached?: boolean;
};

type ErrorEntry = {
  ts: string;
  provider?: string;
  locale?: string;
  session?: string;
  error?: string;
  context?: unknown;
};

type FeedbackEntry = {
  ts: string;
  reason?: string;
  provider?: string;
  locale?: string;
  session?: string;
  has_email?: boolean;
  has_comment?: boolean;
  value?: number | null;
  message_count?: number | null;
};

type EmailGateEntry = {
  ts: string;
  email_hash?: string;
  opt_in_digest?: boolean;
  locale?: string;
  already_subscribed?: boolean;
  confirmation_sent?: boolean;
};

const LOG_DIR = process.env.VERCEL
  ? '/tmp'
  : path.join(process.cwd(), 'logs');

async function readJsonl<T>(file: string): Promise<T[]> {
  let raw: string;
  try {
    raw = await fs.readFile(path.join(LOG_DIR, file), 'utf-8');
  } catch {
    return [];
  }
  const out: T[] = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line) as T);
    } catch {
      /* skip malformed lines silently */
    }
  }
  return out;
}

function formatTs(iso: string): string {
  return iso.slice(0, 16).replace('T', ' ');
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + '…';
}

function mostFrequent(values: string[]): string | null {
  if (values.length === 0) return null;
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let top: string | null = null;
  let max = 0;
  for (const [k, v] of counts) {
    if (v > max) {
      max = v;
      top = k;
    }
  }
  return top;
}

function pct(num: number, den: number): string {
  if (den === 0) return '—';
  return `${Math.round((num / den) * 100)}%`;
}

function ratingEmoji(value: number | null | undefined): string {
  if (value === 1) return '😞';
  if (value === 2) return '😐';
  if (value === 3) return '😊';
  return '—';
}

export default async function AdminChatPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const session = await auth();
  if (!session) {
    redirect(`/${locale}/login`);
  }

  const [usageAll, errorsAll, feedbackAll, emailGateAll] = await Promise.all([
    readJsonl<UsageEntry>('chat-usage.jsonl'),
    readJsonl<ErrorEntry>('chat-errors.jsonl'),
    readJsonl<FeedbackEntry>('chat-feedback.jsonl'),
    readJsonl<EmailGateEntry>('chat-email-gate.jsonl'),
  ]);

  const usage = usageAll.slice(-100).reverse();
  const errors = errorsAll.slice(-20).reverse();

  const today = new Date().toISOString().slice(0, 10);
  const usageToday = usageAll.filter((u) => u.ts.startsWith(today)).length;
  const cachedCount = usageAll.filter((u) => u.cached === true).length;

  const completionSamples = usageAll
    .map((u) => u.completion_tokens)
    .filter((v): v is number => typeof v === 'number');
  const avgOut =
    completionSamples.length > 0
      ? Math.round(
          completionSamples.reduce((a, b) => a + b, 0) / completionSamples.length,
        )
      : null;

  const topLocale = mostFrequent(
    usageAll.map((u) => u.locale).filter((l): l is string => Boolean(l)),
  );

  // Split feedback by type
  const thumbsUp = feedbackAll.filter((f) => f.reason === 'up');
  const sessionRatings = feedbackAll.filter(
    (f) => f.reason === 'session-rating',
  );
  const problemReports = feedbackAll.filter(
    (f) => f.reason && !['up', 'session-rating'].includes(f.reason),
  );

  const ratingValues = sessionRatings
    .map((r) => r.value)
    .filter((v): v is number => typeof v === 'number');
  const avgRating =
    ratingValues.length > 0
      ? (
          ratingValues.reduce((s, v) => s + v, 0) / ratingValues.length
        ).toFixed(2)
      : null;

  // Email-gate stats
  const emailGateToday = emailGateAll.filter((e) =>
    e.ts.startsWith(today),
  ).length;
  const emailOptIns = emailGateAll.filter((e) => e.opt_in_digest).length;
  const emailAlreadySubscribed = emailGateAll.filter(
    (e) => e.already_subscribed,
  ).length;

  return (
    <div className="py-12">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">
            Télémétrie du chatbot
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Lecture directe des logs JSONL (usage, erreurs, feedback, email-gate).
            Les contenus des messages, emails et commentaires ne sont pas stockés ici —
            uniquement des métadonnées anonymisées (hashes). Le détail des retours
            négatifs arrive par email dans la boîte feedback@brusselsgovernance.be.
          </p>
        </div>

        {/* USAGE */}
        <section className="mb-12">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="text-xl font-semibold text-neutral-900">
              Usage — 100 derniers appels
            </h2>
            <span className="text-xs text-neutral-500">
              {usageAll.length} entrées au total
            </span>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Requêtes aujourd'hui" value={String(usageToday)} />
            <SummaryCard
              label="Tokens sortie (moy.)"
              value={avgOut === null ? '—' : String(avgOut)}
            />
            <SummaryCard
              label="Locale dominante"
              value={topLocale ?? '—'}
            />
            <SummaryCard
              label="Cache hits (cumul)"
              value={`${cachedCount} (${pct(cachedCount, usageAll.length)})`}
            />
          </div>

          {usage.length === 0 ? (
            <EmptyRow text="Aucune donnée d'usage." />
          ) : (
            <TableShell>
              <thead className="bg-neutral-100 text-left text-xs uppercase tracking-wide text-neutral-600">
                <tr>
                  <Th>Date</Th>
                  <Th>Question</Th>
                  <Th>Locale</Th>
                  <Th>Cache</Th>
                  <Th>Tokens in</Th>
                  <Th>Tokens out</Th>
                  <Th>Dossiers</Th>
                </tr>
              </thead>
              <tbody>
                {usage.map((u, i) => (
                  <tr
                    key={i}
                    className="border-t border-neutral-200 text-sm text-neutral-800"
                  >
                    <Td mono>{formatTs(u.ts)}</Td>
                    <Td>{u.question ? truncate(u.question, 60) : '—'}</Td>
                    <Td mono>{u.locale ?? '—'}</Td>
                    <Td mono>{u.cached ? '✓' : '—'}</Td>
                    <Td mono>{u.prompt_tokens ?? '—'}</Td>
                    <Td mono>{u.completion_tokens ?? '—'}</Td>
                    <Td mono>{u.dossier_count ?? '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </section>

        {/* FEEDBACK */}
        <section className="mb-12">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="text-xl font-semibold text-neutral-900">
              Feedback utilisateur
            </h2>
            <span className="text-xs text-neutral-500">
              {feedbackAll.length} événements au total
            </span>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SummaryCard label="👍 Utile" value={String(thumbsUp.length)} />
            <SummaryCard
              label="👎 Problèmes signalés"
              value={String(problemReports.length)}
            />
            <SummaryCard
              label="★ CSAT session"
              value={
                avgRating === null
                  ? `${sessionRatings.length}`
                  : `${sessionRatings.length} · moy. ${avgRating}/3`
              }
            />
          </div>

          {/* Problems reported — most important, shown first */}
          <h3 className="mb-2 mt-6 text-sm font-semibold text-neutral-800">
            👎 Problèmes signalés (50 derniers)
          </h3>
          {problemReports.length === 0 ? (
            <EmptyRow text="Aucun problème signalé." />
          ) : (
            <TableShell>
              <thead className="bg-neutral-100 text-left text-xs uppercase tracking-wide text-neutral-600">
                <tr>
                  <Th>Date</Th>
                  <Th>Raison</Th>
                  <Th>Locale</Th>
                  <Th>Commentaire ?</Th>
                  <Th>Email ?</Th>
                </tr>
              </thead>
              <tbody>
                {problemReports
                  .slice(-50)
                  .reverse()
                  .map((f, i) => (
                    <tr
                      key={i}
                      className="border-t border-neutral-200 text-sm text-neutral-800"
                    >
                      <Td mono>{formatTs(f.ts)}</Td>
                      <Td mono>{f.reason ?? '—'}</Td>
                      <Td mono>{f.locale ?? '—'}</Td>
                      <Td>{f.has_comment ? 'Oui' : '—'}</Td>
                      <Td>{f.has_email ? 'Oui' : '—'}</Td>
                    </tr>
                  ))}
              </tbody>
            </TableShell>
          )}

          {/* Thumbs up */}
          <h3 className="mb-2 mt-6 text-sm font-semibold text-neutral-800">
            👍 Upvotes (50 derniers)
          </h3>
          {thumbsUp.length === 0 ? (
            <EmptyRow text="Aucun upvote enregistré." />
          ) : (
            <TableShell>
              <thead className="bg-neutral-100 text-left text-xs uppercase tracking-wide text-neutral-600">
                <tr>
                  <Th>Date</Th>
                  <Th>Locale</Th>
                </tr>
              </thead>
              <tbody>
                {thumbsUp
                  .slice(-50)
                  .reverse()
                  .map((f, i) => (
                    <tr
                      key={i}
                      className="border-t border-neutral-200 text-sm text-neutral-800"
                    >
                      <Td mono>{formatTs(f.ts)}</Td>
                      <Td mono>{f.locale ?? '—'}</Td>
                    </tr>
                  ))}
              </tbody>
            </TableShell>
          )}

          {/* Session ratings */}
          <h3 className="mb-2 mt-6 text-sm font-semibold text-neutral-800">
            ★ Notes de session (50 dernières)
          </h3>
          {sessionRatings.length === 0 ? (
            <EmptyRow text="Aucune note de session enregistrée." />
          ) : (
            <TableShell>
              <thead className="bg-neutral-100 text-left text-xs uppercase tracking-wide text-neutral-600">
                <tr>
                  <Th>Date</Th>
                  <Th>Note</Th>
                  <Th>Valeur</Th>
                  <Th>Locale</Th>
                  <Th>Nb messages</Th>
                </tr>
              </thead>
              <tbody>
                {sessionRatings
                  .slice(-50)
                  .reverse()
                  .map((f, i) => (
                    <tr
                      key={i}
                      className="border-t border-neutral-200 text-sm text-neutral-800"
                    >
                      <Td mono>{formatTs(f.ts)}</Td>
                      <Td>{ratingEmoji(f.value)}</Td>
                      <Td mono>{f.value ?? '—'}</Td>
                      <Td mono>{f.locale ?? '—'}</Td>
                      <Td mono>{f.message_count ?? '—'}</Td>
                    </tr>
                  ))}
              </tbody>
            </TableShell>
          )}
        </section>

        {/* EMAIL-GATE */}
        <section className="mb-12">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="text-xl font-semibold text-neutral-900">
              Email-gate (palier intermédiaire)
            </h2>
            <span className="text-xs text-neutral-500">
              {emailGateAll.length} passages au total
            </span>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SummaryCard
              label="Passages aujourd'hui"
              value={String(emailGateToday)}
            />
            <SummaryCard
              label="Opt-in digest"
              value={`${emailOptIns} (${pct(emailOptIns, emailGateAll.length)})`}
            />
            <SummaryCard
              label="Déjà abonnés"
              value={`${emailAlreadySubscribed} (${pct(emailAlreadySubscribed, emailGateAll.length)})`}
            />
          </div>

          {emailGateAll.length === 0 ? (
            <EmptyRow text="Aucun passage email-gate enregistré." />
          ) : (
            <TableShell>
              <thead className="bg-neutral-100 text-left text-xs uppercase tracking-wide text-neutral-600">
                <tr>
                  <Th>Date</Th>
                  <Th>Locale</Th>
                  <Th>Opt-in digest</Th>
                  <Th>Déjà abonné</Th>
                  <Th>Confirmation envoyée</Th>
                </tr>
              </thead>
              <tbody>
                {emailGateAll
                  .slice(-50)
                  .reverse()
                  .map((e, i) => (
                    <tr
                      key={i}
                      className="border-t border-neutral-200 text-sm text-neutral-800"
                    >
                      <Td mono>{formatTs(e.ts)}</Td>
                      <Td mono>{e.locale ?? '—'}</Td>
                      <Td>{e.opt_in_digest ? 'Oui' : '—'}</Td>
                      <Td>{e.already_subscribed ? 'Oui' : '—'}</Td>
                      <Td>{e.confirmation_sent ? 'Oui' : '—'}</Td>
                    </tr>
                  ))}
              </tbody>
            </TableShell>
          )}
        </section>

        {/* ERRORS */}
        <section className="mb-12">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="text-xl font-semibold text-neutral-900">
              Erreurs — 20 dernières
            </h2>
            <span className="text-xs text-neutral-500">
              {errorsAll.length} entrées au total
            </span>
          </div>

          {errors.length === 0 ? (
            <EmptyRow text="Aucune erreur enregistrée." />
          ) : (
            <TableShell>
              <thead className="bg-neutral-100 text-left text-xs uppercase tracking-wide text-neutral-600">
                <tr>
                  <Th>Date</Th>
                  <Th>Locale</Th>
                  <Th>Message</Th>
                  <Th>Contexte</Th>
                </tr>
              </thead>
              <tbody>
                {errors.map((e, i) => (
                  <tr
                    key={i}
                    className="border-t border-neutral-200 text-sm text-neutral-800"
                  >
                    <Td mono>{formatTs(e.ts)}</Td>
                    <Td mono>{e.locale ?? '—'}</Td>
                    <Td>
                      <span className="break-words [overflow-wrap:anywhere]">
                        {truncate(e.error ?? '(no message)', 200)}
                      </span>
                    </Td>
                    <Td>
                      <code className="break-words [overflow-wrap:anywhere] rounded bg-neutral-100 px-1 py-0.5 font-mono text-xs text-neutral-700">
                        {truncate(JSON.stringify(e.context ?? null), 120)}
                      </code>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </section>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-neutral-900">{value}</p>
    </div>
  );
}

function TableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-md border border-neutral-200">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 font-medium">{children}</th>;
}

function Td({
  children,
  mono = false,
}: {
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <td
      className={
        mono
          ? 'whitespace-nowrap px-3 py-2 align-top font-mono text-xs text-neutral-700'
          : 'px-3 py-2 align-top'
      }
    >
      {children}
    </td>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-500">
      {text}
    </div>
  );
}
