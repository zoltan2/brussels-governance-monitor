/**
 * scripts/generate-quiz.ts
 *
 * Génère public/quiz-data.json à partir des fichiers MDX FR (domaines + dossiers).
 * Produit un POOL de ~50 questions ; le composant client en tire 10 aléatoirement.
 * Lancement manuel : npx tsx scripts/generate-quiz.ts
 *
 * Charge ANTHROPIC_API_KEY depuis .env.local (projet courant) ou ~/Dev/bgm-ops/.env.local
 * Dépendances : tsx, gray-matter, @anthropic-ai/sdk, dotenv
 */

import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import dotenv from 'dotenv'
import Anthropic from '@anthropic-ai/sdk'

// ─── Chargement de la clé API ───────────────────────────────────────────────
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
  console.error('ANTHROPIC_API_KEY introuvable. Cherché dans :', envPaths.join(', '))
  process.exit(1)
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Chemins BGM ────────────────────────────────────────────────────────────
const CONTENT_DIRS = {
  domains: path.join(process.cwd(), 'content/domain-cards'),
  dossiers: path.join(process.cwd(), 'content/dossiers'),
}
const OUTPUT_PATH = path.join(process.cwd(), 'public/quiz-data.json')
const LOG_PATH = path.join(process.cwd(), 'quiz-generation-log.json')

// Pool target: 2 questions per domain (13×2=26) + 1-2 per dossier (~24)
const QUESTIONS_PER_DOMAIN = 2
const QUESTIONS_PER_DOSSIER = 1
// Dossiers with rich content get 2 questions
const RICH_DOSSIERS = new Set([
  'good-move', 'lez', 'metro-3', 'slrb', 'pfas', 'acs',
  'mobilite-partagee', 'data-centers-ia-energie', 'enseignement', 'petite-enfance',
])

// ─── Labels FR des domaines (slugs → français) ─────────────────────────────
const DOMAIN_LABELS_FR: Record<string, string> = {
  budget: 'Budget',
  cleanliness: 'Propreté',
  climate: 'Climat',
  digital: 'Numérique',
  economy: 'Économie',
  education: 'Enseignement',
  employment: 'Emploi',
  housing: 'Logement',
  institutional: 'Institutionnel',
  mobility: 'Mobilité',
  security: 'Sécurité',
  social: 'Social',
  'urban-planning': 'Urbanisme',
}

function domainLabelFR(slug: string): string {
  return DOMAIN_LABELS_FR[slug] ?? slug
}

// ─── Types ──────────────────────────────────────────────────────────────────
export interface QuizQuestion {
  id: string
  source: 'domain' | 'dossier'
  domain: string
  question: string
  options: [string, string, string, string]
  correct: number
  explanation: string
  sourceSlug: string
  sourceTitle: string
}

export interface QuizData {
  generatedAt: string
  poolSize: number
  questionsPerSession: number
  questions: QuizQuestion[]
}

interface GenerationLogEntry {
  id: string
  source: 'domain' | 'dossier'
  slug: string
  title: string
  requestedCount: number
  rawResponse: string
  parsedOk: boolean
  parsedCount: number
  error?: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function readFrenchMDX(dir: string) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.fr.mdx'))
    .map((file) => {
      const raw = fs.readFileSync(path.join(dir, file), 'utf-8')
      const { data, content } = matter(raw)
      return { slug: file.replace('.fr.mdx', ''), frontmatter: data, content }
    })
}

function truncate(str: string, max = 4000) {
  return str.length > max ? str.slice(0, max) + '\u2026' : str
}

// ─── Génération par contenu ─────────────────────────────────────────────────
async function generateFromContent(
  content: string,
  title: string,
  slug: string,
  type: 'domain' | 'dossier',
  count: number,
  log: GenerationLogEntry[]
): Promise<QuizQuestion[]> {
  const prompt = `Tu es un expert en gouvernance de la Région de Bruxelles-Capitale.
À partir du contenu ci-dessous, génère exactement ${count} question(s) de quiz QCM à 4 choix en français.
Le quiz vise à informer et attirer un public non-spécialiste vers Brussels Governance Monitor.

Titre : ${title}
Contenu :
${truncate(content)}

Réponds UNIQUEMENT avec un tableau JSON valide, sans markdown ni backticks.
Format exact :
[
  {
    "question": "...",
    "options": ["option A", "option B", "option C", "option D"],
    "correct": 0,
    "explanation": "1-2 phrases qui éclairent la réponse et donnent envie d'en savoir plus."
  }
]

Règles :
- Chaque question doit porter sur un FAIT DIFFÉRENT du contenu
- Questions factuelles, précises, accessibles au grand public
- Une seule bonne réponse, index "correct" = 0, 1, 2 ou 3
- Distracteurs plausibles (pas de mauvaises réponses évidentes)
- Explication orientée vers la lecture du contenu source
- Jamais de jargon sans explication
- PAS de noms de politiciens — utilise les rôles institutionnels
`

  const entry: GenerationLogEntry = {
    id: `${type}-${slug}`,
    source: type,
    slug,
    title,
    requestedCount: count,
    rawResponse: '',
    parsedOk: false,
    parsedCount: 0,
  }

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: count * 500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '[]'
    entry.rawResponse = text

    // Nettoyage : parfois le modèle enveloppe dans ```json ... ```
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
    const parsed = JSON.parse(cleaned)

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('Réponse JSON vide ou pas un tableau')
    }

    const routePrefix = type === 'domain' ? '/fr/domaines' : '/fr/dossiers'
    const questions: QuizQuestion[] = []

    for (let i = 0; i < parsed.length; i++) {
      const q = parsed[i]
      if (
        typeof q.question !== 'string' ||
        !Array.isArray(q.options) ||
        q.options.length !== 4 ||
        typeof q.correct !== 'number' ||
        q.correct < 0 ||
        q.correct > 3 ||
        typeof q.explanation !== 'string'
      ) {
        continue // skip malformed, keep the rest
      }

      questions.push({
        id: `${type}-${slug}-${i}`,
        source: type,
        domain: '',
        question: q.question,
        options: q.options as [string, string, string, string],
        correct: q.correct,
        explanation: q.explanation,
        sourceSlug: `${routePrefix}/${slug}`,
        sourceTitle: title,
      })
    }

    entry.parsedOk = true
    entry.parsedCount = questions.length
    log.push(entry)

    return questions
  } catch (err) {
    entry.error = (err as Error).message
    log.push(entry)
    throw err
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function generateQuiz() {
  console.log('Génération du pool de questions BGM…\n')
  const questions: QuizQuestion[] = []
  const generationLog: GenerationLogEntry[] = []

  // ── Domaines (13 × 2 = 26 questions) ────────────────────────────────────
  const domains = readFrenchMDX(CONTENT_DIRS.domains)
  console.log(`Domaines : ${domains.length} fichiers FR`)

  for (const d of domains) {
    const title = (d.frontmatter.title as string) ?? d.slug
    const domainSlug = (d.frontmatter.domain as string) ?? d.slug
    try {
      const qs = await generateFromContent(
        d.content, title, d.slug, 'domain', QUESTIONS_PER_DOMAIN, generationLog
      )
      qs.forEach((q) => (q.domain = domainLabelFR(domainSlug)))
      questions.push(...qs)
      console.log(`  OK ${title} (${qs.length}q)`)
    } catch (err) {
      console.warn(`  SKIP ${d.slug} — ${(err as Error).message}`)
    }
  }

  // ── Dossiers (21 × 1-2 = ~26 questions) ─────────────────────────────────
  const dossiers = readFrenchMDX(CONTENT_DIRS.dossiers)
  console.log(`\nDossiers : ${dossiers.length} fichiers FR`)

  for (const d of dossiers) {
    const title = (d.frontmatter.title as string) ?? d.slug
    const domainSlug =
      Array.isArray(d.frontmatter.relatedDomains) && d.frontmatter.relatedDomains.length > 0
        ? (d.frontmatter.relatedDomains[0] as string)
        : ''
    const count = RICH_DOSSIERS.has(d.slug) ? 2 : QUESTIONS_PER_DOSSIER
    try {
      const qs = await generateFromContent(
        d.content, title, d.slug, 'dossier', count, generationLog
      )
      qs.forEach((q) => (q.domain = domainLabelFR(domainSlug)))
      questions.push(...qs)
      console.log(`  OK ${title} (${qs.length}q)`)
    } catch (err) {
      console.warn(`  SKIP ${d.slug} — ${(err as Error).message}`)
    }
  }

  // ── Écriture ──────────────────────────────────────────────────────────────
  const quizData: QuizData = {
    generatedAt: new Date().toISOString(),
    poolSize: questions.length,
    questionsPerSession: 10,
    questions,
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(quizData, null, 2))
  console.log(
    `\nPool généré : ${questions.length} questions → public/quiz-data.json`
  )

  // ── Log de génération ─────────────────────────────────────────────────────
  fs.writeFileSync(
    LOG_PATH,
    JSON.stringify(
      {
        generatedAt: quizData.generatedAt,
        totalQuestions: questions.length,
        entries: generationLog,
      },
      null,
      2
    )
  )
  console.log(`Log → quiz-generation-log.json (${generationLog.length} entrées)`)
}

generateQuiz().catch((err) => {
  console.error('Erreur génération quiz :', err)
  process.exit(1)
})
