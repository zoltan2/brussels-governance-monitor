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
  provider: string;
  locale: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  dossier_count: number;
  question?: string;
  session?: string;
};

type ErrorEntry = {
  ts: string;
  provider: string;
  locale: string;
  session: string;
  error: string;
  context: unknown;
};

type FeedbackEntry = {
  ts: string;
  reason: string;
  provider: string;
  locale: string;
  session: string;
  has_email: boolean;
  has_comment: boolean;
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

  const [usageAll, errorsAll, feedbackAll] = await Promise.all([
    readJsonl<UsageEntry>('chat-usage.jsonl'),
    readJsonl<ErrorEntry>('chat-errors.jsonl'),
    readJsonl<FeedbackEntry>('chat-feedback.jsonl'),
  ]);

  const usage = usageAll.slice(-100).reverse();
  const errors = errorsAll.slice(-20).reverse();
  const feedback = feedbackAll.slice(-50).reverse();

  const today = new Date().toISOString().slice(0, 10);
  const usageToday = usageAll.filter((u) => u.ts.startsWith(today)).length;

  const completionSamples = usageAll
    .map((u) => u.completion_tokens)
    .filter((v): v is number => typeof v === 'number');
  const avgOut =
    completionSamples.length > 0
      ? Math.round(
          completionSamples.reduce((a, b) => a + b, 0) / completionSamples.length,
        )
      : null;

  const topLocale = mostFrequent(usageAll.map((u) => u.locale));

  return (
    <div className="py-12">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">
            Télémétrie du chatbot
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Lecture directe des logs JSONL (usage, erreurs, feedback). Les
            contenus des messages et des retours utilisateurs ne sont pas
            stockés ici — uniquement les métadonnées. Le détail des feedbacks
            arrive par email dans la boîte feedback@brusselsgovernance.be.
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

          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SummaryCard label="Requêtes aujourd'hui" value={String(usageToday)} />
            <SummaryCard
              label="Tokens sortie (moyenne)"
              value={avgOut === null ? '—' : String(avgOut)}
            />
            <SummaryCard
              label="Locale dominante"
              value={topLocale ?? '—'}
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
                    <Td mono>{u.locale}</Td>
                    <Td mono>{u.prompt_tokens ?? '—'}</Td>
                    <Td mono>{u.completion_tokens ?? '—'}</Td>
                    <Td mono>{u.dossier_count}</Td>
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
                    <Td mono>{e.locale}</Td>
                    <Td>
                      <span className="break-words [overflow-wrap:anywhere]">
                        {truncate(e.error, 200)}
                      </span>
                    </Td>
                    <Td>
                      <code className="break-words [overflow-wrap:anywhere] rounded bg-neutral-100 px-1 py-0.5 font-mono text-xs text-neutral-700">
                        {truncate(JSON.stringify(e.context), 120)}
                      </code>
                    </Td>
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
              Feedback — 50 derniers retours
            </h2>
            <span className="text-xs text-neutral-500">
              {feedbackAll.length} entrées au total
            </span>
          </div>

          {feedback.length === 0 ? (
            <EmptyRow text="Aucun feedback enregistré." />
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
                {feedback.map((f, i) => (
                  <tr
                    key={i}
                    className="border-t border-neutral-200 text-sm text-neutral-800"
                  >
                    <Td mono>{formatTs(f.ts)}</Td>
                    <Td mono>{f.reason}</Td>
                    <Td mono>{f.locale}</Td>
                    <Td>{f.has_comment ? 'Oui' : '—'}</Td>
                    <Td>{f.has_email ? 'Oui' : '—'}</Td>
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
