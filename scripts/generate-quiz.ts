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
 * Dépendances : tsx, js-yaml (via src/lib/frontmatter), @anthropic-ai/sdk, dotenv
 */

import fs from 'fs'
import path from 'path'
import { matter } from '../src/lib/frontmatter'
import dotenv from 'dotenv'
import Anthropic from '@anthropic-ai/sdk'
import type { QuizData, QuizQuestion } from './quiz-provenance'
import {
  MIN_BODY_CHARS,
  PROMPT_VERSION,
  assessPool,
  hashBody,
  readPool,
  readUnits,
  unitKeyOf,
  unitsToRegenerate,
  type Provenance,
} from './quiz-provenance'

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
- TERMINOLOGIE BELGE OBLIGATOIRE : « bourgmestre » (jamais « maire »), « commune » ou « maison communale » (jamais « mairie »), « échevin » (jamais « adjoint au maire »), « tram » (jamais « tramway »)
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
- VERPLICHTE BELGISCHE TERMINOLOGIE: « burgemeester » (nooit « maire »), « gemeente » of « gemeentehuis » (nooit « mairie »), « schepen » (nooit « wethouder »), « tram » (nooit « tramway »)
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
- MANDATORY Belgian terminology when referring to local officials and infrastructure: use « bourgmestre » (never "mayor"), « commune » or « maison communale » (never "town hall"), « échevin » (never "deputy mayor"), « tram » (never "tramway")
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
- BELGISCHE TERMINOLOGIE für lokale Amtsträger und Infrastruktur: « Bürgermeister » (wie in Belgien, nicht die Form anderer Länder), « Gemeinde » oder « Gemeindehaus » (nicht « Rathaus » im Brüsseler Kontext), « Schöffe » (nicht « Beigeordneter »), « Tram » (nicht « Straßenbahn » im Brüsseler Kontext)
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
// QuizQuestion et QuizData vivent dans quiz-provenance.ts : ce sont les mêmes
// structures que celles lues par quiz-status.ts et par la passe de backfill.
// Les dupliquer ici avait fait diverger le champ `locale` (string vs union).
export type { QuizQuestion, QuizData } from './quiz-provenance'

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

/**
 * Shuffle the 4 options of a question and return both the new options array
 * and the new index of the (still) correct answer. Counters the LLM bias of
 * placing the correct answer in position A or B (~95% of cases observed).
 */
function shuffleOptions(
  options: [string, string, string, string],
  correct: number
): { options: [string, string, string, string]; correct: number } {
  const correctValue = options[correct]
  const indices = [0, 1, 2, 3]
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  const shuffled = indices.map((i) => options[i]) as [string, string, string, string]
  return { options: shuffled, correct: shuffled.indexOf(correctValue) }
}

// ─── Generation ─────────────────────────────────────────────────────────────
const MODEL = 'claude-haiku-4-5-20251001'
/** Nombre de tentatives par unité avant d'abandonner. Une réponse du modèle
 *  peut être invalide ponctuellement ; abandonner au premier échec est ce qui
 *  a produit les 4 questions allemandes manquantes d'avril 2026. */
const MAX_ATTEMPTS = 3

async function generateFromContent(
  content: string,
  title: string,
  slug: string,
  type: 'domain' | 'dossier',
  count: number,
  locale: Locale,
  log: GenerationLogEntry[],
  provenance: Provenance
): Promise<QuizQuestion[]> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await attemptGeneration(content, title, slug, type, count, locale, log, provenance)
    } catch (err) {
      lastError = err as Error
      if (attempt < MAX_ATTEMPTS) {
        console.warn(`      tentative ${attempt}/${MAX_ATTEMPTS} échouée (${lastError.message}), on réessaie`)
      }
    }
  }

  throw lastError ?? new Error('échec inconnu')
}

async function attemptGeneration(
  content: string,
  title: string,
  slug: string,
  type: 'domain' | 'dossier',
  count: number,
  locale: Locale,
  log: GenerationLogEntry[],
  provenance: Provenance
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
      model: MODEL,
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

      const shuffled = shuffleOptions(
        q.options as [string, string, string, string],
        q.correct
      )

      questions.push({
        id: `${type}-${slug}-${i}`,
        source: type,
        domain: '',
        question: q.question,
        options: shuffled.options,
        correct: shuffled.correct,
        explanation: q.explanation,
        sourceSlug: `${routePrefix}/${slug}`,
        sourceTitle: title,
        provenance,
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

interface LocaleResult {
  data: QuizData
  regenerated: number
  reused: number
  skippedThin: string[]
  failures: string[]
}

/**
 * Génère (ou régénère) le pool d'une locale.
 *
 * En mode incrémental, seules les unités dont la source a changé sont
 * envoyées au modèle ; les questions dont la source n'a pas bougé sont
 * reprises telles quelles, avec leur provenance intacte. C'est ce qui rend la
 * relecture soutenable : quelques questions par semaine au lieu de 224.
 */
async function generateForLocale(
  locale: Locale,
  log: GenerationLogEntry[],
  onlyStale: boolean
): Promise<LocaleResult> {
  const labels = DOMAIN_LABELS[locale]
  const units = readUnits(locale)

  let targets: Set<string> | null = null
  const reusable = new Map<string, QuizQuestion[]>()

  if (onlyStale) {
    const pool = readPool(locale)
    if (!pool) {
      console.log('  Pas de pool existant, génération complète.')
    } else {
      const statuses = assessPool(pool as QuizData, units)
      targets = unitsToRegenerate(statuses, units)
      const staleIds = new Set(
        statuses.filter((st) => st.freshness !== 'fresh').map((st) => st.id)
      )
      for (const q of pool.questions) {
        if (staleIds.has(q.id)) continue
        const key = unitKeyOf(q)
        if (!reusable.has(key)) reusable.set(key, [])
        reusable.get(key)!.push(q)
      }
      const reusedCount = [...reusable.values()].reduce((a, v) => a + v.length, 0)
      console.log(`  Incrémental : ${targets.size} unité(s) à régénérer, ${reusedCount} question(s) reprises`)
    }
  }

  const questions: QuizQuestion[] = []
  const skippedThin: string[] = []
  const failures: string[] = []
  let regenerated = 0

  const ordered = [...units.entries()].sort(([a], [b]) => a.localeCompare(b))

  for (const [unitKey, unit] of ordered) {
    if (targets && !targets.has(unitKey)) {
      questions.push(...(reusable.get(unitKey) ?? []))
      continue
    }

    // Une unité trop mince produit des questions anecdotiques ou des doublons.
    if (unit.body.trim().length < MIN_BODY_CHARS) {
      skippedThin.push(unitKey)
      console.log(`    THIN ${unit.slug} (${unit.body.trim().length} signes) — aucune question`)
      continue
    }

    const count =
      unit.type === 'domain'
        ? QUESTIONS_PER_DOMAIN
        : RICH_DOSSIERS.has(unit.slug)
          ? 2
          : QUESTIONS_PER_DOSSIER

    const provenance: Provenance = {
      sourceLastModified: unit.lastModified,
      sourceContentHash: unit.contentHash,
      generatedAt: new Date().toISOString(),
      model: MODEL,
      promptVersion: PROMPT_VERSION,
    }

    try {
      const qs = await generateFromContent(
        unit.body, unit.title, unit.slug, unit.type, count, locale, log, provenance
      )
      const domainSlug = unit.type === 'domain' ? unit.slug : ''
      qs.forEach((q) => (q.domain = labels[domainSlug] ?? domainSlug))
      questions.push(...qs)
      regenerated += qs.length
      console.log(`    OK ${unit.title} (${qs.length}q)`)
    } catch (err) {
      failures.push(unitKey)
      console.error(`    ÉCHEC ${unit.slug} — ${(err as Error).message}`)
      // On conserve l'ancienne question plutôt que de perdre la couverture.
      questions.push(...(reusable.get(unitKey) ?? []))
    }
  }

  questions.sort((a, b) => a.id.localeCompare(b.id))

  return {
    data: {
      generatedAt: new Date().toISOString(),
      locale,
      poolSize: questions.length,
      questionsPerSession: 10,
      questions,
    },
    regenerated,
    reused: questions.length - regenerated,
    skippedThin,
    failures,
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2)
  const localeFlag = args.indexOf('--locale')
  const onlyStale = args.includes('--only-stale')
  const targetLocales: Locale[] =
    localeFlag !== -1 && args[localeFlag + 1]
      ? [args[localeFlag + 1] as Locale]
      : [...LOCALES]

  console.log(
    `Génération du pool de quiz : ${targetLocales.join(', ')}` +
      (onlyStale ? ' (incrémental, sources modifiées uniquement)' : ' (complète)') +
      '\n'
  )
  const generationLog: GenerationLogEntry[] = []
  const allFailures: string[] = []

  for (const locale of targetLocales) {
    console.log(`\n── ${locale.toUpperCase()} ──────────────────────────────────────`)
    const result = await generateForLocale(locale, generationLog, onlyStale)
    const outPath = path.join(process.cwd(), `public/quiz-data-${locale}.json`)
    fs.writeFileSync(outPath, JSON.stringify(result.data, null, 2) + '\n')

    console.log(
      `  Pool : ${result.data.poolSize} questions ` +
        `(${result.regenerated} régénérées, ${result.reused} reprises) → quiz-data-${locale}.json`
    )
    if (result.skippedThin.length) {
      console.log(`  Unités trop minces, sans question : ${result.skippedThin.join(', ')}`)
    }
    for (const f of result.failures) allFailures.push(`${locale}:${f}`)
  }

  const logPath = path.join(process.cwd(), 'quiz-generation-log.json')
  fs.writeFileSync(
    logPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), entries: generationLog }, null, 2)
  )
  console.log(`\nJournal → quiz-generation-log.json (${generationLog.length} entrées)`)

  // Un échec d'unité ne doit JAMAIS passer inaperçu : c'est ainsi que quatre
  // questions allemandes ont manqué pendant quatre mois sans que personne ne
  // le sache.
  if (allFailures.length) {
    console.error(
      `\n${allFailures.length} unité(s) en échec après ${MAX_ATTEMPTS} tentatives :\n  ` +
        allFailures.join('\n  ')
    )
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Erreur de génération du quiz :', err)
  process.exit(1)
})
