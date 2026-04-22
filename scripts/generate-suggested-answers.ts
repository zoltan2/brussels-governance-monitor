/**
 * scripts/generate-suggested-answers.ts
 *
 * Pre-generates the 4 suggested-question answers × 4 locales × 2 tiers (32 total)
 * and writes them to src/lib/chat-cache/suggested-answers.json.
 *
 * The chat route (/api/chat) matches incoming messages against this cache and
 * serves the precomputed answer via fake-streaming when a cache hit occurs —
 * saves an Anthropic call on the most-clicked questions.
 *
 * Run this whenever:
 *  - Dossier content changes (veille merges, new dossiers)
 *  - The system prompt is updated
 *  - The suggested questions are changed in src/lib/chat-suggestions.ts
 *
 * Usage:
 *   npm run chat:generate-suggested
 */

import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import dotenv from 'dotenv'
import Anthropic from '@anthropic-ai/sdk'

import { CHAT_SUGGESTIONS, CHAT_TIERS, type ChatTier } from '../src/lib/chat-suggestions'
import { buildSystemPrompt } from '../src/lib/chat-system-prompt'

// ─── Load API key ───────────────────────────────────────────────────────────
const envPaths = [
  path.join(process.cwd(), '.env.local'),
  path.join(process.env.HOME ?? '', 'Dev/bgm-ops/.env.local'),
]

for (const envPath of envPaths) {
  if (!process.env.ANTHROPIC_API_KEY && fs.existsSync(envPath)) {
    dotenv.config({ path: envPath })
  }
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY missing. Looked in:', envPaths.join(', '))
  process.exit(1)
}

// ─── Config ─────────────────────────────────────────────────────────────────
const OUTPUT_FILE = path.join(
  process.cwd(),
  'src/lib/chat-cache/suggested-answers.json',
)
const MODEL = 'claude-sonnet-4-5'
const MAX_TOKENS = 2048
const TEMPERATURE = 0.1

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Generation ─────────────────────────────────────────────────────────────
type AnswerCache = Record<string, Record<ChatTier, Record<string, string>>>

async function generateOne(
  locale: string,
  tier: ChatTier,
  question: string,
): Promise<string> {
  const { system } = buildSystemPrompt(tier, locale)
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    system: [
      {
        type: 'text',
        text: system,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: question }],
  })
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()
  if (!text) throw new Error('empty response')
  return text
}

async function main() {
  console.log(`Generating suggested answers → ${OUTPUT_FILE}\n`)

  const cache: AnswerCache = {}
  let total = 0
  let generated = 0
  let failed = 0

  for (const [locale, questions] of Object.entries(CHAT_SUGGESTIONS)) {
    cache[locale] = { free: {}, paid: {} }
    for (const tier of CHAT_TIERS) {
      for (const question of questions) {
        total++
        const label = `[${locale}/${tier}] ${question.slice(0, 45)}${question.length > 45 ? '…' : ''}`
        process.stdout.write(`${label.padEnd(62, ' ')} `)
        try {
          const answer = await generateOne(locale, tier, question)
          cache[locale][tier][question] = answer
          console.log(`✓ ${answer.length} chars`)
          generated++
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.log(`✗ ${msg}`)
          failed++
        }
      }
    }
  }

  await fsp.mkdir(path.dirname(OUTPUT_FILE), { recursive: true })
  await fsp.writeFile(OUTPUT_FILE, JSON.stringify(cache, null, 2) + '\n')

  console.log(
    `\nGenerated ${generated}/${total} answers${failed > 0 ? ` (${failed} failed)` : ''}.`,
  )
  console.log(`Wrote ${OUTPUT_FILE}`)

  if (failed === total) {
    console.error('\nAll generations failed — leaving existing cache untouched.')
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
