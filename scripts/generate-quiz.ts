/**
 * scripts/generate-quiz.ts
 *
 * Génère public/quiz-data-{locale}.json pour chaque locale (fr, nl, en, de).
 * Produit un POOL de ~50 questions par langue ; le composant client en tire 10.
 *
 * Usage :
 *   npx tsx scripts/generate-quiz.ts          # toutes les locales
 *   npx tsx scripts/generate-quiz.ts --locale fr   # une seule locale
 *
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

// ─── Config ─────────────────────────────────────────────────────────────────
const LOCALES = ['fr', 'nl', 'en', 'de'] as const
type Locale = (typeof LOCALES)[number]

const CONTENT_DIRS = {
  domains: path.join(process.cwd(), 'content/domain-cards'),
  dossiers: path.join(process.cwd(), 'content/dossiers'),
}

const QUESTIONS_PER_DOMAIN = 2
const QUESTIONS_PER_DOSSIER = 1
const RICH_DOSSIERS = new Set([
  'good-move', 'lez', 'metro-3', 'slrb', 'pfas', 'acs',
  'mobilite-partagee', 'data-centers-ia-energie', 'enseignement', 'petite-enfance',
])

// ─── Locale-specific config ─────────────────────────────────────────────────
const LOCALE_CONFIG: Record<Locale, {
  lang: string
  routePrefixDomains: string
  routePrefixDossiers: string
  prompt: (title: string, content: string, count: number) => string
}> = {
  fr: {
    lang: 'français',
    routePrefixDomains: '/fr/domaines',
    routePrefixDossiers: '/fr/dossiers',
    prompt: (title, content, count) => `Tu es un expert en gouvernance de la Région de Bruxelles-Capitale.
À partir du contenu ci-dessous, génère exactement ${count} question(s) de quiz QCM à 4 choix en français.
Le quiz vise à informer et attirer un public non-spécialiste vers Brussels Governance Monitor.

Titre : ${title}
Contenu :
${content}

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
- PRIVILÉGIE les questions sur les mécanismes, structures, institutions et faits établis
- ÉVITE les chiffres susceptibles d'évoluer rapidement (budgets provisoires, statistiques en cours, estimations préliminaires)
- Questions factuelles, précises, accessibles au grand public
- Une seule bonne réponse, index "correct" = 0, 1, 2 ou 3
- Distracteurs plausibles (pas de mauvaises réponses évidentes)
- JAMAIS de pourcentages, proportions ou chiffres révélateurs entre parenthèses dans les options — ils donnent la réponse. Place ces détails dans l'explication (affichée APRÈS le choix)
- Explication orientée vers la lecture du contenu source
- Jamais de jargon sans explication
- PAS de noms de politiciens — utilise les rôles institutionnels
`,
  },
  nl: {
    lang: 'Nederlands',
    routePrefixDomains: '/nl/domeinen',
    routePrefixDossiers: '/nl/dossiers',
    prompt: (title, content, count) => `Je bent een expert in het bestuur van het Brussels Hoofdstedelijk Gewest.
Genereer op basis van de onderstaande inhoud precies ${count} meerkeuzequizvra(a)g(en) met 4 keuzes in het Nederlands.
De quiz is bedoeld om een breed publiek te informeren en aan te trekken naar Brussels Governance Monitor.

Titel: ${title}
Inhoud:
${content}

Antwoord ALLEEN met een geldige JSON-array, zonder markdown of backticks.
Exact formaat:
[
  {
    "question": "...",
    "options": ["optie A", "optie B", "optie C", "optie D"],
    "correct": 0,
    "explanation": "1-2 zinnen die het antwoord toelichten en nieuwsgierig maken."
  }
]

Regels:
- Elke vraag moet over een ANDER FEIT uit de inhoud gaan
- GEEF VOORKEUR aan vragen over mechanismen, structuren, instellingen en vaststaande feiten
- VERMIJD cijfers die snel kunnen veranderen (voorlopige budgetten, lopende statistieken, voorlopige schattingen)
- Feitelijke, nauwkeurige vragen, toegankelijk voor het grote publiek
- Eén juist antwoord, index "correct" = 0, 1, 2 of 3
- Plausibele afleiders (geen voor de hand liggende foute antwoorden)
- NOOIT percentages, verhoudingen of onthullende cijfers tussen haakjes in de opties — ze geven het antwoord weg. Vermeld deze details in de uitleg (getoond NA de keuze)
- Uitleg gericht op het lezen van de broninhoud
- Nooit jargon zonder uitleg
- GEEN namen van politici — gebruik institutionele functies
`,
  },
  en: {
    lang: 'English',
    routePrefixDomains: '/en/domains',
    routePrefixDossiers: '/en/dossiers',
    prompt: (title, content, count) => `You are an expert in Brussels-Capital Region governance.
Based on the content below, generate exactly ${count} multiple-choice quiz question(s) with 4 options in English.
The quiz aims to inform and attract a non-specialist audience to Brussels Governance Monitor.

Title: ${title}
Content:
${content}

Reply ONLY with a valid JSON array, no markdown or backticks.
Exact format:
[
  {
    "question": "...",
    "options": ["option A", "option B", "option C", "option D"],
    "correct": 0,
    "explanation": "1-2 sentences that illuminate the answer and encourage further reading."
  }
]

Rules:
- Each question must cover a DIFFERENT FACT from the content
- PREFER questions about mechanisms, structures, institutions and established facts
- AVOID figures likely to change quickly (provisional budgets, ongoing statistics, preliminary estimates)
- Factual, precise questions, accessible to the general public
- One correct answer, index "correct" = 0, 1, 2 or 3
- Plausible distractors (no obviously wrong answers)
- NEVER include percentages, proportions or revealing figures in parentheses in options — they give away the answer. Put these details in the explanation (shown AFTER the choice)
- Explanation oriented toward reading the source content
- Never use jargon without explanation
- NO politician names — use institutional roles
`,
  },
  de: {
    lang: 'Deutsch',
    routePrefixDomains: '/de/bereiche',
    routePrefixDossiers: '/de/dossiers',
    prompt: (title, content, count) => `Sie sind ein Experte für die Regierungsführung der Region Brüssel-Hauptstadt.
Erstellen Sie auf Basis des folgenden Inhalts genau ${count} Multiple-Choice-Quizfrage(n) mit 4 Optionen auf Deutsch.
Das Quiz soll ein breites Publikum informieren und auf den Brussels Governance Monitor aufmerksam machen.

Titel: ${title}
Inhalt:
${content}

Antworten Sie NUR mit einem gültigen JSON-Array, ohne Markdown oder Backticks.
Genaues Format:
[
  {
    "question": "...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
    "explanation": "1-2 Sätze, die die Antwort erläutern und zum Weiterlesen anregen."
  }
]

Regeln:
- Jede Frage muss ein ANDERES FAKT aus dem Inhalt behandeln
- BEVORZUGE Fragen zu Mechanismen, Strukturen, Institutionen und gesicherten Fakten
- VERMEIDE Zahlen, die sich schnell ändern können (vorläufige Budgets, laufende Statistiken, vorläufige Schätzungen)
- Sachliche, präzise Fragen, zugänglich für die breite Öffentlichkeit
- Eine richtige Antwort, Index "correct" = 0, 1, 2 oder 3
- Plausible Distraktoren (keine offensichtlich falschen Antworten)
- NIEMALS Prozentsätze, Verhältnisse oder verräterische Zahlen in Klammern in den Optionen — sie verraten die Antwort. Diese Details gehören in die Erklärung (angezeigt NACH der Wahl)
- Erklärung auf das Lesen des Quellinhalts ausgerichtet
- Niemals Fachjargon ohne Erklärung
- KEINE Politikernamen — verwenden Sie institutionelle Funktionen
`,
  },
}

// ─── Domain labels per locale ───────────────────────────────────────────────
const DOMAIN_LABELS: Record<Locale, Record<string, string>> = {
  fr: {
    budget: 'Budget', cleanliness: 'Propreté', climate: 'Climat', digital: 'Numérique',
    economy: 'Économie', education: 'Enseignement', employment: 'Emploi', housing: 'Logement',
    institutional: 'Institutionnel', mobility: 'Mobilité', security: 'Sécurité', social: 'Social',
    'urban-planning': 'Urbanisme',
  },
  nl: {
    budget: 'Budget', cleanliness: 'Netheid', climate: 'Klimaat', digital: 'Digitaal',
    economy: 'Economie', education: 'Onderwijs', employment: 'Werkgelegenheid', housing: 'Huisvesting',
    institutional: 'Institutioneel', mobility: 'Mobiliteit', security: 'Veiligheid', social: 'Sociaal',
    'urban-planning': 'Stedenbouw',
  },
  en: {
    budget: 'Budget', cleanliness: 'Cleanliness', climate: 'Climate', digital: 'Digital',
    economy: 'Economy', education: 'Education', employment: 'Employment', housing: 'Housing',
    institutional: 'Institutional', mobility: 'Mobility', security: 'Security', social: 'Social',
    'urban-planning': 'Urban Planning',
  },
  de: {
    budget: 'Budget', cleanliness: 'Sauberkeit', climate: 'Klima', digital: 'Digital',
    economy: 'Wirtschaft', education: 'Bildung', employment: 'Beschäftigung', housing: 'Wohnen',
    institutional: 'Institutionell', mobility: 'Mobilität', security: 'Sicherheit', social: 'Soziales',
    'urban-planning': 'Stadtplanung',
  },
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
  locale: string
  poolSize: number
  questionsPerSession: number
  questions: QuizQuestion[]
}

interface GenerationLogEntry {
  id: string
  locale: string
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
function readLocaleMDX(dir: string, locale: Locale) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(`.${locale}.mdx`))
    .map((file) => {
      const raw = fs.readFileSync(path.join(dir, file), 'utf-8')
      const { data, content } = matter(raw)
      return { slug: file.replace(`.${locale}.mdx`, ''), frontmatter: data, content }
    })
}

function truncate(str: string, max = 4000) {
  return str.length > max ? str.slice(0, max) + '\u2026' : str
}

// ─── Generation ─────────────────────────────────────────────────────────────
async function generateFromContent(
  content: string,
  title: string,
  slug: string,
  type: 'domain' | 'dossier',
  count: number,
  locale: Locale,
  log: GenerationLogEntry[]
): Promise<QuizQuestion[]> {
  const config = LOCALE_CONFIG[locale]
  const prompt = config.prompt(title, truncate(content), count)

  const entry: GenerationLogEntry = {
    id: `${type}-${slug}-${locale}`,
    locale,
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

    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
    const parsed = JSON.parse(cleaned)

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('Empty JSON or not an array')
    }

    const routePrefix = type === 'domain' ? config.routePrefixDomains : config.routePrefixDossiers
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
        continue
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

// ─── Generate for one locale ────────────────────────────────────────────────
async function generateForLocale(locale: Locale, log: GenerationLogEntry[]): Promise<QuizData> {
  const labels = DOMAIN_LABELS[locale]
  const questions: QuizQuestion[] = []

  // Domains
  const domains = readLocaleMDX(CONTENT_DIRS.domains, locale)
  console.log(`  Domains: ${domains.length} ${locale.toUpperCase()} files`)

  for (const d of domains) {
    const title = (d.frontmatter.title as string) ?? d.slug
    const domainSlug = (d.frontmatter.domain as string) ?? d.slug
    try {
      const qs = await generateFromContent(
        d.content, title, d.slug, 'domain', QUESTIONS_PER_DOMAIN, locale, log
      )
      qs.forEach((q) => (q.domain = labels[domainSlug] ?? domainSlug))
      questions.push(...qs)
      console.log(`    OK ${title} (${qs.length}q)`)
    } catch (err) {
      console.warn(`    SKIP ${d.slug} — ${(err as Error).message}`)
    }
  }

  // Dossiers
  const dossiers = readLocaleMDX(CONTENT_DIRS.dossiers, locale)
  console.log(`  Dossiers: ${dossiers.length} ${locale.toUpperCase()} files`)

  for (const d of dossiers) {
    const title = (d.frontmatter.title as string) ?? d.slug
    const domainSlug =
      Array.isArray(d.frontmatter.relatedDomains) && d.frontmatter.relatedDomains.length > 0
        ? (d.frontmatter.relatedDomains[0] as string)
        : ''
    const count = RICH_DOSSIERS.has(d.slug) ? 2 : QUESTIONS_PER_DOSSIER
    try {
      const qs = await generateFromContent(
        d.content, title, d.slug, 'dossier', count, locale, log
      )
      qs.forEach((q) => (q.domain = labels[domainSlug] ?? domainSlug))
      questions.push(...qs)
      console.log(`    OK ${title} (${qs.length}q)`)
    } catch (err) {
      console.warn(`    SKIP ${d.slug} — ${(err as Error).message}`)
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    locale,
    poolSize: questions.length,
    questionsPerSession: 10,
    questions,
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2)
  const localeFlag = args.indexOf('--locale')
  const targetLocales: Locale[] =
    localeFlag !== -1 && args[localeFlag + 1]
      ? [args[localeFlag + 1] as Locale]
      : [...LOCALES]

  console.log(`Generating quiz pool for: ${targetLocales.join(', ')}\n`)
  const generationLog: GenerationLogEntry[] = []

  for (const locale of targetLocales) {
    console.log(`\n── ${locale.toUpperCase()} ──────────────────────────────────────`)
    const data = await generateForLocale(locale, generationLog)
    const outPath = path.join(process.cwd(), `public/quiz-data-${locale}.json`)
    fs.writeFileSync(outPath, JSON.stringify(data, null, 2))
    console.log(`  Pool: ${data.poolSize} questions → quiz-data-${locale}.json`)
  }

  // Write log
  const logPath = path.join(process.cwd(), 'quiz-generation-log.json')
  fs.writeFileSync(
    logPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), entries: generationLog }, null, 2)
  )
  console.log(`\nLog → quiz-generation-log.json (${generationLog.length} entries)`)
}

main().catch((err) => {
  console.error('Quiz generation error:', err)
  process.exit(1)
})
