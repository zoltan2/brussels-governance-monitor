/**
 * scripts/quiz-translate-prep.ts
 *
 * Atelier de traduction du quiz : prépare le travail de régénération d'une
 * langue cible à partir du pool français, sans rien inventer.
 *
 *   npx tsx scripts/quiz-translate-prep.ts --locale nl [--type dossier] [--limit 8]
 *
 * Le dump de `quiz-manual.ts` dit QUELLES unités régénérer et avec quel hash de
 * source. Il ne dit pas SUR QUOI s'appuyer pour les rédiger. Cet atelier comble
 * ce vide en écrivant `.quiz-pending/atelier-{locale}.json`, où chaque unité
 * porte trois choses :
 *
 *   1. les questions FRANÇAISES de la même unité — la source à traduire, dont
 *      les faits ont déjà été vérifiés et relus ;
 *   2. le libellé `domain` DÉJÀ EN PLACE dans le pool cible — jamais un libellé
 *      traduit à la volée ;
 *   3. les questions que l'unité possède ENCORE dans le pool cible, celles que
 *      la régénération va remplacer.
 *
 * Le point 3 est le cœur de l'affaire. Il n'y a volontairement AUCUN glossaire
 * codé en dur dans ce fichier. Un glossaire écrit de mémoire se trompe : le
 * 18/09/2026, six termes tenus pour acquis (« DPR », « STIB » et « nursing
 * home » en anglais, « Pflegeheime », « Deontologiekommission » et « MIVB » en
 * allemand) se sont révélés ABSENTS des pools auxquels on les attribuait, alors
 * que le pool anglais emploie « SLRB » neuf fois. La terminologie de la maison
 * se constate, elle ne se rappelle pas : les questions sortantes de l'unité en
 * sont la meilleure preuve, en contexte et vérifiable.
 *
 * Le squelette `.quiz-pending/questions-{locale}.skeleton.json` est écrit dans
 * la foulée, `unitKey` et `domain` déjà remplis. `quiz-manual.ts apply` traite
 * `domain` comme facultatif et le remplace par une chaîne vide s'il manque —
 * c'est ainsi que des libellés se sont vidés en français. Pré-remplir le
 * squelette supprime la possibilité même de l'oubli.
 */

import fs from 'fs'
import path from 'path'
import { readPool, unitKeyOf, type Locale, type QuizQuestion } from './quiz-provenance'

const PENDING_DIR = path.join(process.cwd(), '.quiz-pending')
const SOURCE_LOCALE: Locale = 'fr'

interface DumpUnit {
  unitKey: string
  slug: string
  type: 'domain' | 'dossier'
  title: string
  quota: number
  sourceLastModified: string
  sourceContentHash: string
  sourceSlug: string
  body: string
}

function flag(name: string): string | null {
  const i = process.argv.indexOf(name)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1]! : null
}

/** Questions d'un pool, regroupées par clé d'unité. */
function byUnit(questions: QuizQuestion[]): Map<string, QuizQuestion[]> {
  const out = new Map<string, QuizQuestion[]>()
  for (const q of questions) {
    const k = unitKeyOf(q)
    if (!out.has(k)) out.set(k, [])
    out.get(k)!.push(q)
  }
  return out
}

/**
 * Libellé `domain` à employer dans la langue cible.
 *
 * Trois sources, de la plus sûre à la plus faible, et JAMAIS de traduction
 * inventée. La troisième couvre le cas d'une unité que la langue cible ne
 * possède pas encore : on emprunte alors le libellé à une autre unité qui
 * partage le même domaine français, et on dit à qui on l'a emprunté pour que
 * la décision reste auditable.
 */
function resolveDomain(
  unitKey: string,
  targetUnits: Map<string, QuizQuestion[]>,
  frUnits: Map<string, QuizQuestion[]>,
): { domain: string; origin: string } {
  const own = targetUnits.get(unitKey)?.[0]?.domain
  if (own) return { domain: own, origin: 'pool cible, même unité' }

  const frDomain = frUnits.get(unitKey)?.[0]?.domain
  if (frDomain) {
    for (const [otherKey, frList] of frUnits) {
      if (otherKey === unitKey) continue
      if (frList[0]?.domain !== frDomain) continue
      const borrowed = targetUnits.get(otherKey)?.[0]?.domain
      if (borrowed) {
        return { domain: borrowed, origin: `emprunté à ${otherKey} (même domaine « ${frDomain} »)` }
      }
    }
  }

  return { domain: '', origin: 'INTROUVABLE — à trancher à la main' }
}

function main(): void {
  const locale = flag('--locale') as Locale | null
  if (!locale || locale === SOURCE_LOCALE) {
    console.error('Usage : quiz-translate-prep.ts --locale nl|en|de [--type domain|dossier] [--limit N]')
    process.exit(1)
  }

  const unitsFile = path.join(PENDING_DIR, `units-${locale}.json`)
  if (!fs.existsSync(unitsFile)) {
    console.error(`${unitsFile} absent : lancer d'abord « npm run quiz:manual:dump -- --locale ${locale} ».`)
    process.exit(1)
  }

  const dumped = (JSON.parse(fs.readFileSync(unitsFile, 'utf-8')) as { units: DumpUnit[] }).units
  const frPool = readPool(SOURCE_LOCALE)
  const targetPool = readPool(locale)
  if (!frPool) {
    console.error('public/quiz-data-fr.json absent : pas de source à traduire.')
    process.exit(1)
  }

  const frUnits = byUnit(frPool.questions)
  const targetUnits = byUnit(targetPool?.questions ?? [])

  const typeFilter = flag('--type')
  const limit = flag('--limit')

  const selected = dumped
    .filter((u) => !typeFilter || u.type === typeFilter)
    .slice(0, limit ? Number(limit) : undefined)

  const sansSource: string[] = []
  const sansLibelle: string[] = []
  const empruntes: string[] = []

  const atelier = selected.map((u) => {
    const source = frUnits.get(u.unitKey) ?? []
    if (source.length === 0) sansSource.push(u.unitKey)

    const { domain, origin } = resolveDomain(u.unitKey, targetUnits, frUnits)
    if (!domain) sansLibelle.push(u.unitKey)
    else if (origin.startsWith('emprunté')) empruntes.push(`${u.unitKey} → ${origin}`)

    return {
      unitKey: u.unitKey,
      type: u.type,
      slug: u.slug,
      quota: u.quota,
      titreSource: u.title,
      sourceSlug: u.sourceSlug,
      corpsSignes: u.body.length,
      domainCible: domain,
      domainOrigine: origin,
      // La source à traduire : faits déjà vérifiés côté français.
      questionsFrancaises: source.map((q) => ({
        id: q.id,
        domain: q.domain,
        question: q.question,
        options: q.options,
        correct: q.correct,
        explanation: q.explanation,
      })),
      // La terminologie de la maison, en contexte. Ces questions vont être
      // remplacées : elles ne servent qu'à fixer le vocabulaire et les sigles.
      terminologieSortante: (targetUnits.get(u.unitKey) ?? []).map((q) => ({
        question: q.question,
        options: q.options,
        explanation: q.explanation,
      })),
    }
  })

  fs.mkdirSync(PENDING_DIR, { recursive: true })
  const outFile = path.join(PENDING_DIR, `atelier-${locale}.json`)
  fs.writeFileSync(outFile, JSON.stringify({ locale, source: SOURCE_LOCALE, unites: atelier }, null, 2) + '\n')

  // Squelette prêt pour `quiz-manual.ts apply`, `domain` déjà rempli.
  const skeleton = atelier.flatMap((u) =>
    Array.from({ length: u.quota }, () => ({
      unitKey: u.unitKey,
      domain: u.domainCible,
      question: '',
      options: ['', '', '', ''],
      correct: 0,
      explanation: '',
    })),
  )
  const skelFile = path.join(PENDING_DIR, `questions-${locale}.skeleton.json`)
  fs.writeFileSync(skelFile, JSON.stringify(skeleton, null, 2) + '\n')

  const attendues = atelier.reduce((n, u) => n + u.quota, 0)
  console.log(`${locale} : ${atelier.length} unité(s), ${attendues} question(s) attendues`)
  console.log(`  atelier   → ${outFile}`)
  console.log(`  squelette → ${skelFile}`)
  console.log(`  unités sans terminologie sortante : ${atelier.filter((u) => u.terminologieSortante.length === 0).length}`)

  for (const e of empruntes) console.log(`  libellé emprunté : ${e}`)

  // Une alarme qui se tait ne sert à rien : ces deux cas exigent une décision
  // humaine, ils sortent en erreur et non en note de bas de page.
  if (sansSource.length) {
    console.error(`\n  ⚠ ${sansSource.length} unité(s) SANS question française à traduire : ${sansSource.join(', ')}`)
  }
  if (sansLibelle.length) {
    console.error(`  ⚠ ${sansLibelle.length} unité(s) SANS libellé « domain » : ${sansLibelle.join(', ')}`)
  }
  if (sansSource.length || sansLibelle.length) process.exit(1)
}

main()
