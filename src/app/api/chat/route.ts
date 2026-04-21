// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { getDossierCards } from '@/lib/content';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(8000),
});

const bodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(40),
  provider: z.literal('anthropic').default('anthropic'),
  locale: z.string().min(1).max(10).optional(),
  tier: z.enum(['free', 'paid']).default('free'),
});

type Tier = z.infer<typeof bodySchema>['tier'];

const BGM_PREAMBLE =
  "Tu es l'assistant du Brussels Governance Monitor (BGM), une plateforme citoyenne indépendante qui surveille la gouvernance bruxelloise. 323 sources surveillées, 13 domaines de politique, apolitique, sans publicité. Réponds uniquement sur la base des dossiers et du contexte fournis. Si tu ne sais pas, dis-le clairement. Ne cite aucun nom de personnalité politique. À la fin de chaque réponse, indique les dossiers mentionnés sous la forme [Dossier : slug]. Cite 1 à 2 sources URL pertinentes si disponibles.";

const FREE_TIER_SUFFIX =
  ' Réponds de manière concise : 3 points maximum, 150 mots maximum. Inclus les liens dossiers mais pas les sources URL.';

function buildSystemPrompt(tier: Tier): { system: string; dossierCount: number } {
  const compact = getDossierCards('fr').map((d) => ({
    title: d.title,
    slug: d.slug,
    phase: d.phase,
    summary: d.summary,
    dossierType: d.dossierType,
    relatedDomains: d.relatedDomains,
    sources: d.sources.slice(0, 3).map((s) => s.url),
  }));

  const preamble = tier === 'free' ? BGM_PREAMBLE + FREE_TIER_SUFFIX : BGM_PREAMBLE;

  return {
    system: `${preamble}\n\nDossiers BGM (contexte, JSON):\n${JSON.stringify(compact)}`,
    dossierCount: compact.length,
  };
}

function extractIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const xri = request.headers.get('x-real-ip');
  if (xri) {
    const trimmed = xri.trim();
    if (trimmed) return trimmed;
  }
  return 'unknown';
}

function sessionHash(ip: string): string {
  const secret = process.env.CHAT_SESSION_SECRET ?? 'fallback';
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return createHash('sha256')
    .update(`${secret}|${ip}|${day}`)
    .digest('hex')
    .slice(0, 12);
}

type UsageContext = {
  provider: 'anthropic';
  locale: string;
  dossierCount: number;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  question: string;
  session: string;
};

const LOG_DIR = process.env.VERCEL
  ? '/tmp'
  : path.join(process.cwd(), 'logs');
const USAGE_LOG_FILE = path.join(LOG_DIR, 'chat-usage.jsonl');
const ERROR_LOG_FILE = path.join(LOG_DIR, 'chat-errors.jsonl');

/**
 * On Vercel: emit to stdout with a structured prefix — Vercel captures stdout
 * and makes it queryable via the dashboard / log drains. Writes to /tmp don't
 * survive cold starts, so console.log is the more reliable sink in prod.
 * Locally (non-Vercel): append a JSONL line to logs/ for the admin page.
 */
function emitLogEntry(
  prefix: string,
  file: string,
  entry: Record<string, unknown>,
): void {
  if (process.env.VERCEL) {
    console.log(prefix, JSON.stringify(entry));
    return;
  }
  const line = JSON.stringify(entry) + '\n';
  fs.mkdir(LOG_DIR, { recursive: true })
    .then(() => fs.appendFile(file, line))
    .catch((err) => console.error(`${prefix} log failed:`, err));
}

function logUsageAsync(ctx: UsageContext): void {
  emitLogEntry('[chat-usage]', USAGE_LOG_FILE, {
    ts: new Date().toISOString(),
    provider: ctx.provider,
    locale: ctx.locale,
    prompt_tokens: ctx.prompt_tokens,
    completion_tokens: ctx.completion_tokens,
    dossier_count: ctx.dossierCount,
    question: ctx.question,
    session: ctx.session,
  });
}

type ErrorLogContext = {
  provider?: string;
  locale?: string;
  session?: string;
  [k: string]: unknown;
};

function logErrorAsync(error: unknown, context: ErrorLogContext): void {
  emitLogEntry('[chat-error]', ERROR_LOG_FILE, {
    ts: new Date().toISOString(),
    provider: context.provider ?? 'unknown',
    locale: context.locale ?? 'unknown',
    session: context.session ?? 'unknown',
    error: error instanceof Error ? error.message : String(error),
    context,
  });
}

function streamingResponse(
  iter: AsyncIterable<string>,
  ctx: UsageContext,
): Response {
  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of iter) {
          if (chunk) controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
        logUsageAsync(ctx);
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}

async function* anthropicDeltas(
  system: string,
  messages: z.infer<typeof messageSchema>[],
  ctx: UsageContext,
): AsyncIterable<string> {
  const client = new Anthropic();

  try {
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      temperature: 0.1,
      system: [
        {
          type: 'text',
          text: system,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }

    try {
      const final = await stream.finalMessage();
      const input = final.usage.input_tokens ?? 0;
      const cacheCreate = final.usage.cache_creation_input_tokens ?? 0;
      const cacheRead = final.usage.cache_read_input_tokens ?? 0;
      ctx.prompt_tokens = input + cacheCreate + cacheRead;
      ctx.completion_tokens = final.usage.output_tokens ?? null;
    } catch {
      /* usage unavailable — leave nulls */
    }
  } catch (err) {
    logErrorAsync(err, {
      provider: ctx.provider,
      locale: ctx.locale,
      session: ctx.session,
      stage: 'anthropic-stream',
    });
    throw err;
  }
}

export async function POST(request: Request) {
  const ip = extractIp(request);
  const { allowed } = rateLimit(ip, { max: 10, bucket: 'chat' });
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { messages, tier } = parsed.data;
  const locale = parsed.data.locale ?? 'fr';
  const { system, dossierCount } = buildSystemPrompt(tier);

  const session = sessionHash(ip);
  const firstUser = messages.find((m) => m.role === 'user');
  const question = (firstUser?.content ?? '').slice(0, 200);

  const ctx: UsageContext = {
    provider: 'anthropic',
    locale,
    dossierCount,
    prompt_tokens: null,
    completion_tokens: null,
    question,
    session,
  };

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not configured' },
      { status: 500 },
    );
  }
  return streamingResponse(anthropicDeltas(system, messages, ctx), ctx);
}
