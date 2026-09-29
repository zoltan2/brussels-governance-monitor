// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'node:crypto';
import { rateLimit } from '@/lib/rate-limit';
import { buildSystemPrompt } from '@/lib/chat-system-prompt';
import { pushLog } from '@/lib/chat-logs';
import { currentQuestion } from '@/lib/chat-question';
import { clientIp } from '@/lib/client-ip';
import { sameOriginRefusal } from '@/lib/same-origin';
import { readChatTier, readChatAccessRef, type ChatTier } from '@/lib/chat-access';
import { getDb } from '@/lib/db';
import {
  MODELE_CHAT,
  ajouterDepense,
  budgetAtteint,
  coutMicroUsd,
  jourBruxelles,
} from '@/lib/chat-budget';
import {
  enregistrerDeblocage,
  etatPaiement,
  noterVerification,
  sessionRemboursee,
} from '@/lib/chat-paiements';
import Stripe from 'stripe';
import { bodyTooLargeRefusal, readJsonCapped } from '@/lib/request-guards';
import { boundAssistantTurns, chatHistoryRefusal, type ChatTurn } from '@/lib/chat-history';

export const runtime = 'nodejs';

/**
 * Plafonds d'entree.
 *
 * Ils etaient de 40 messages de 8 000 caracteres, soit l'ordre de grandeur d'un
 * livre court par requete : environ 85 000 jetons non mis en cache, ~0,29 $ la
 * requete, et jusqu'a 170 $ l'heure depuis une seule adresse (audit 21/09).
 * Une question sur une fiche tient tres largement dans ce qui suit.
 */
const MAX_MESSAGES = 12;
const MAX_CONTENT_CHARS = 2000;
/**
 * Une reponse de l'assistant renvoyee par le widget peut depasser 2 000
 * caracteres (sortie plafonnee a 2 048 jetons) : la refuser cassait le tour
 * suivant. Elle est acceptee jusqu'a ce plafond, puis TRONQUEE a 2 000
 * caracteres avant d'etre relayee (`boundAssistantTurns`), donc sans surcout.
 */
const MAX_ASSISTANT_INPUT_CHARS = 8000;

const messageSchema = z.discriminatedUnion('role', [
  z.object({ role: z.literal('user'), content: z.string().min(1).max(MAX_CONTENT_CHARS) }),
  z.object({
    role: z.literal('assistant'),
    content: z.string().min(1).max(MAX_ASSISTANT_INPUT_CHARS),
  }),
]);

const bodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(MAX_MESSAGES),
  provider: z.literal('anthropic').default('anthropic'),
  locale: z.string().min(1).max(10).optional(),
  // `tier` N'EST PLUS LU DANS LE CORPS. Il etait envoye par le navigateur, donc
  // choisi par l'appelant : `{"tier":"paid"}` suffisait a obtenir le prompt payant.
  // Le niveau est desormais derive d'un cookie signe cote serveur, pose seulement
  // apres verification du paiement aupres de Stripe (src/lib/chat-access.ts).
});

function sessionHash(ip: string): string {
  // ECHEC FERME. Le repli etait la chaine litterale 'fallback'. Si la variable
  // sautait lors d'une reconfiguration, la telemetrie continuait de s'ecrire en
  // APPARENCE pseudonymisee, alors que `sha256('fallback'|ip|jour)` se parcourt
  // sur l'espace IPv4 entier en quelques minutes : qui obtenait les journaux
  // retrouvait l'adresse en clair. La politique de confidentialite affirme un
  // « hachage non reversible » : elle aurait ete fausse, en silence.
  // On aligne sur src/lib/token.ts, qui leve deja (audit 21/09).
  const secret = process.env.CHAT_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      'CHAT_SESSION_SECRET is required to pseudonymise chat telemetry. Set it in .env.local.',
    );
  }
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
  cached: boolean;
};

function logUsageAsync(ctx: UsageContext): void {
  pushLog('usage', {
    ts: new Date().toISOString(),
    provider: ctx.provider,
    locale: ctx.locale,
    prompt_tokens: ctx.prompt_tokens,
    completion_tokens: ctx.completion_tokens,
    dossier_count: ctx.dossierCount,
    question: ctx.question,
    session: ctx.session,
    cached: ctx.cached,
  });
}

type ErrorLogContext = {
  provider?: string;
  locale?: string;
  session?: string;
  [k: string]: unknown;
};

function logErrorAsync(error: unknown, context: ErrorLogContext): void {
  pushLog('errors', {
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
  messages: ChatTurn[],
  ctx: UsageContext,
): AsyncIterable<string> {
  const client = new Anthropic();

  try {
    const stream = client.messages.stream({
      model: MODELE_CHAT,
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
      // Plafond de dépense quotidien (src/lib/chat-budget.ts) : chaque type de
      // jeton à son prix, pas la somme des jetons d'entrée.
      const db = getDb();
      if (db) ajouterDepense(db, jourBruxelles(), coutMicroUsd(final.usage));
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

/**
 * Niveau d'accès, avec révocation d'un accès payant remboursé (revue red team
 * du 29/09/2026). La signature du cookie suffit à `readChatTier` ; ici, on
 * vérifie aussi au registre des paiements, et auprès de Stripe au plus une
 * fois par jour et par session. Une panne de Stripe laisse l'accès ouvert
 * (journalisée) : quelques euros ne valent pas de couper un lecteur qui a payé.
 */
async function niveauVerifie(headers: Headers): Promise<ChatTier> {
  const tier = readChatTier(headers);
  if (tier !== 'paid') return tier;
  const ref = readChatAccessRef(headers);
  const db = getDb();
  if (!ref || !db) return tier;

  const maintenant = Date.now();
  let etat = etatPaiement(db, ref, maintenant);
  if (!etat) {
    // Accès ouvert avant le registre : on l'inscrit et on le vérifie tout de suite.
    enregistrerDeblocage(db, ref, 0);
    etat = { rembourse: false, aReverifier: true };
  }
  if (etat.rembourse) return 'free';
  if (!etat.aReverifier) return tier;

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return tier;
  try {
    const session = await new Stripe(secret).checkout.sessions.retrieve(ref, {
      expand: ['payment_intent.latest_charge'],
    });
    const rembourse = sessionRemboursee(session);
    noterVerification(db, ref, maintenant, rembourse);
    return rembourse ? 'free' : tier;
  } catch (err) {
    console.error('[chat] revérification du paiement impossible', err instanceof Error ? err.message : 'erreur');
    return tier;
  }
}

/** Taille maximale du corps accepte, avant meme de le lire. */
const MAX_BODY_BYTES = 64 * 1024;

/** Quota journalier par adresse, au-dela du plafond par minute. */
const FREE_DAILY_MAX = 30;
const PAID_DAILY_MAX = 300;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  // 1. COUPE-CIRCUIT SERVEUR. `NEXT_PUBLIC_CHATBOT_ENABLED` n'etait teste que
  //    dans le widget : couper le chatbot masquait le bouton et laissait l'API
  //    servie et facturable. Il fallait donc pouvoir couper la depense, pas
  //    seulement l'interface.
  if (process.env.NEXT_PUBLIC_CHATBOT_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Chat disabled' }, { status: 503 });
  }

  // 2. GARDE D'ORIGINE. `Request.json()` ignore le `Content-Type` : un formulaire
  //    en `text/plain` sur un site tiers fabrique un corps JSON valide sans
  //    declencher de preflight CORS. Sans cette garde, n'importe quelle page du
  //    web pouvait faire appeler le modele depuis l'adresse IP de ses visiteurs,
  //    ce qui contourne la limite par adresse par le nombre de victimes.
  //    Le module existait deja et n'etait cable que sur les routes admin.
  const refus = sameOriginRefusal(request.headers);
  if (refus) {
    return NextResponse.json({ error: refus }, { status: 403 });
  }

  // 3. TAILLE DU CORPS. `request.json()` met tout en tampon avant validation :
  //    un corps de plusieurs centaines de Mo tuait le processus.
  //    Ce test sur `Content-Length` n'ecarte que le cas franc, sans rien lire ;
  //    la lecture plus bas compte les octets reellement recus.
  if (bodyTooLargeRefusal(request.headers, MAX_BODY_BYTES)) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  const ip = clientIp(request.headers);
  const { allowed } = rateLimit(ip, { max: 10, bucket: 'chat' });
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // 4. NIVEAU D'ACCES DERIVE DU SERVEUR, jamais du corps de la requete.
  const tier = await niveauVerifie(request.headers);

  // 4 bis. PLAFOND DE DÉPENSE QUOTIDIEN, tous visiteurs confondus (2 USD par
  //    défaut, décision du 29/09/2026). Au-delà, plus aucun appel au modèle
  //    jusqu'à minuit, heure de Bruxelles.
  const dbBudget = getDb();
  if (dbBudget && budgetAtteint(dbBudget, jourBruxelles())) {
    return NextResponse.json({ error: 'Daily budget reached' }, { status: 503 });
  }

  // 5. QUOTA JOURNALIER. Le quota vivait dans le `localStorage` : le vider
  //    suffisait a le reinitialiser, et un appel direct a l'API l'ignorait.
  const { allowed: sousQuota } = rateLimit(ip, {
    bucket: `chat-jour-${tier}`,
    max: tier === 'paid' ? PAID_DAILY_MAX : FREE_DAILY_MAX,
    windowMs: ONE_DAY_MS,
  });
  if (!sousQuota) {
    return NextResponse.json({ error: 'Daily quota reached', tier }, { status: 429 });
  }

  const lu = await readJsonCapped(request, MAX_BODY_BYTES);
  if (!lu.ok) {
    return NextResponse.json({ error: lu.error }, { status: lu.status });
  }

  const parsed = bodySchema.safeParse(lu.value);
  if (!parsed.success) {
    // Le detail du schema exposait la forme exacte des champs, y compris le nom
    // du champ piege anti-robot que d'autres routes utilisent. Message generique.
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  // Forme de l'historique : alternance stricte, du premier au dernier tour
  // `user`. Un tour `assistant` fabrique en tete ou enchaine est refuse
  // (revue red team du 28/09, voir src/lib/chat-history.ts).
  if (chatHistoryRefusal(parsed.data.messages)) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
  const messages = boundAssistantTurns(parsed.data.messages);
  const locale = parsed.data.locale ?? 'fr';

  const session = sessionHash(ip);
  // Le widget renvoie tout l'historique : la question du tour en cours est le
  // dernier message `user`, pas le premier (sinon la télémétrie relogue la
  // question d'ouverture à chaque tour).
  const question = currentQuestion(messages);

  // Chaque question part au modèle. Le cache des réponses préparées
  // (src/lib/chat-cache/suggested-answers.json, figé depuis le 22/04) est
  // retiré depuis le 29/09/2026 : il servait des faits faux.
  const { system, dossierCount } = buildSystemPrompt(tier, locale);

  const ctx: UsageContext = {
    provider: 'anthropic',
    locale,
    dossierCount,
    prompt_tokens: null,
    completion_tokens: null,
    question,
    session,
    cached: false,
  };

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not configured' },
      { status: 500 },
    );
  }
  return streamingResponse(anthropicDeltas(system, messages, ctx), ctx);
}
