/**
 * scripts/content-lint/digest-check.ts
 *
 * Contrôle éditorial des digests hebdomadaires (content/digest/AAAA-wNN.xx.mdx),
 * générés par Haiku dans bgm-ops et proposés en PR. Logique, règles et
 * défauts d'origine : src/lib/digest-check.ts.
 *
 * Sur les digests ajoutés ou modifiés :
 *   1. complétude : chaque langue de la semaine a le même nombre de sections
 *      « ## » et de sous-sections « ### » que le français, au moins 60 % de
 *      sa taille, aucun lien coupé ;
 *   2. liens : chaque lien interne mène à une page existante (même fonction
 *      et même table que internal-links.ts), et un lien vers une fiche est
 *      justifié par une entrée de la semaine ou par un texte qui nomme son
 *      sujet ;
 *   3. entités belges inventées (« Région francophone », Communauté française
 *      et Fédération Wallonie-Bruxelles comptées comme deux entités) ;
 *   4. français seulement : chaque date et chaque nombre significatif du
 *      corps figure dans les entrées du changelog de la semaine ou dans les
 *      signaux du radar que le générateur a reçus.
 *
 * Les archives non modifiées ne sont pas contrôlées : elles ont été envoyées.
 *
 * Usage :
 *   npx tsx scripts/content-lint/digest-check.ts <liste> <base>
 *     Vérifie les digests de la liste (MDX modifiés vs <base>). Bloquant.
 *     SKIP_DIGEST_FACTS=1 (label skip-digest-facts) : la règle 4 ne produit
 *     plus que des avertissements, pour une correction humaine qui cite un
 *     fait tiré d'une fiche et non du changelog. Les autres règles restent.
 *
 *   npx tsx scripts/content-lint/digest-check.ts --audit [--ref <commit>] [--week 2026-w39 [--week 2026-w38 …]]
 *     Rapport sur toutes les semaines (ou une seule), lues sur le disque ou à
 *     un commit donné (digests ET data/ de ce commit). Ne bloque jamais.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { routing } from '../../src/i18n/routing';
import { readGuardFrontmatter } from '../../src/lib/frontmatter';
import { findLinkProblems, type LinkProblem, type Pathnames } from '../../src/lib/internal-links';
import {
  cardSubject,
  checkCompleteness,
  checkEntities,
  checkFacts,
  checkLinkCoherence,
  digestBody,
  extractSourceFacts,
  parseDigestPath,
  subjectStems,
  weekCardSlugs,
  weekSourceTexts,
  type CardRef,
  type ChangelogLike,
  type DigestFinding,
  type RadarLike,
} from '../../src/lib/digest-check';
import { annotate, annotateWarning, safeLine } from './annotate';
import { readAtBase } from './git-base';
import { CONTENT, siteRoutes } from './site-routes';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DIGEST_DIR = 'content/digest';

/** Lecture d'un fichier du dépôt, sur le disque ou à un commit. */
type Reader = (rel: string) => string | null;

function diskReader(rel: string): string | null {
  const abs = path.join(REPO_ROOT, rel);
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
}

function refReader(ref: string): Reader {
  return (rel) => readAtBase(ref, rel);
}

function listDigests(ref?: string): string[] {
  if (ref) {
    const out = execFileSync('git', ['-c', 'core.quotepath=off', 'ls-tree', '--name-only', `${ref}:${DIGEST_DIR}`], { cwd: REPO_ROOT, encoding: 'utf8' });
    return out.split('\n').filter(Boolean).map((n) => `${DIGEST_DIR}/${n}`).filter((f) => parseDigestPath(f));
  }
  return fs.readdirSync(path.join(REPO_ROOT, DIGEST_DIR)).map((n) => `${DIGEST_DIR}/${n}`).filter((f) => parseDigestPath(f)).sort();
}

/**
 * Fiche visée par chaque chemin de lien, dans les quatre langues du site, sous
 * le slug du fichier et sous le slug localisé que la fiche déclare.
 *
 * Dossiers, communes, domaines et secteurs. Un domaine est une rubrique
 * (« Sécurité ») qu'un paragraphe sur une caserne de pompiers justifie sans
 * écrire le mot : c'est pourquoi la règle accepte d'abord toute fiche visée
 * par le changelog ou le radar de la semaine, et ne demande le nom du sujet
 * qu'à défaut. Mesuré le 29/09/2026 sur les 33 semaines archivées : exiger
 * le seul nom levait 417 alertes ; avec la semaine d'abord, 8 (deux liens en
 * quatre langues : w09 « Déchets sauvages » vers le domaine Propreté, faux
 * positif ; w22 perquisition d'une SISP vers le dossier SLRB, discutable).
 */
function buildCardIndex(): Map<string, CardRef> {
  const pathnames = routing.pathnames as unknown as Pathnames;
  const kinds: { internal: string; dir: string; label: string }[] = [
    { internal: '/dossiers/[slug]', dir: 'dossiers', label: 'le dossier' },
    { internal: '/communes/[slug]', dir: 'commune-cards', label: 'la commune' },
    { internal: '/domains/[slug]', dir: 'domain-cards', label: 'le domaine' },
    { internal: '/sectors/[slug]', dir: 'sector-cards', label: 'le secteur' },
  ];
  const index = new Map<string, CardRef>();
  for (const { internal, dir, label } of kinds) {
    const abs = path.join(CONTENT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const name of fs.readdirSync(abs)) {
      const m = /^(.+)\.([a-z]{2})\.mdx$/.exec(name);
      if (!m) continue;
      const [, slug, locale] = m as unknown as [string, string, string];
      const value = pathnames[internal];
      const pattern = typeof value === 'string' ? value : value?.[locale];
      if (!pattern) continue;
      let fm: Record<string, unknown> | null = null;
      try {
        fm = readGuardFrontmatter(fs.readFileSync(path.join(abs, name), 'utf8'));
      } catch {
        continue; // frontmatter illisible : faq-check le signale.
      }
      const title = typeof fm?.title === 'string' ? fm.title : '';
      const short = typeof fm?.shortTitle === 'string' ? fm.shortTitle : undefined;
      const subject = cardSubject(title, short);
      const stems = [...new Set([...subjectStems(subject), ...subjectStems(slug.replace(/-/g, ' '))])];
      const ref: CardRef = { slug, label: `${label} « ${subject || slug} »`, stems };
      const slugs = new Set([slug]);
      const localized = (fm?.localizedSlugs as Record<string, unknown> | undefined)?.[locale];
      if (typeof localized === 'string' && localized) slugs.add(localized);
      for (const s of slugs) index.set(`/${locale}${pattern.replace('[slug]', s)}`, ref);
    }
  }
  return index;
}

const LINK_REASONS: Record<LinkProblem['kind'], string> = {
  'wrong-locale-path': "chemin d'une autre langue",
  'unknown-path': 'aucune route ne correspond (404 probable)',
  'unknown-slug': "cette fiche n'existe pas dans cette langue (404)",
  'foreign-prefix': "préfixe d'une langue que le site n'a pas (404) ; les langues sans site lient vers /fr/",
  'no-locale': 'lien sans langue, redirigé vers le français',
};

interface Data {
  changelog: ChangelogLike[];
  radar: RadarLike[];
}

function readData(read: Reader): Data {
  const cl = read('data/changelog.json');
  const rd = read('data/radar.json');
  if (!cl || !rd) throw new Error('data/changelog.json ou data/radar.json introuvable : la règle 4 ne peut pas tourner');
  const radar = JSON.parse(rd) as { entries?: RadarLike[] };
  return { changelog: JSON.parse(cl) as ChangelogLike[], radar: radar.entries ?? [] };
}

interface Checked {
  week: string;
  findings: (DigestFinding & { file: string })[];
}

/**
 * Contrôle d'une semaine. `changed` : langues dont le fichier est à
 * contrôler (règles 2 à 4) ; la complétude porte toujours sur toute la semaine.
 */
function checkWeek(
  week: string,
  read: Reader,
  data: Data,
  changed: Set<string>,
  opts: { requireAll: boolean; cards: Map<string, CardRef>; routes: ReturnType<typeof siteRoutes> },
): Checked {
  const bodies: Record<string, string> = {};
  const raws: Record<string, string> = {};
  for (const lang of ['fr', 'nl', 'en', 'de', 'ar', 'es', 'pl', 'pt', 'ro', 'sw', 'tr']) {
    const raw = read(`${DIGEST_DIR}/${week}.${lang}.mdx`);
    if (raw === null) continue;
    raws[lang] = raw;
    bodies[lang] = digestBody(raw);
  }
  const findings: DigestFinding[] = [...checkCompleteness(bodies, { requireAll: opts.requireAll })];
  const weekSlugs = weekCardSlugs(week, data.changelog, data.radar);

  for (const lang of changed) {
    const body = bodies[lang];
    if (body === undefined) continue;
    // Liens : la page existe. Les numéros de ligne de findLinkProblems sont
    // ceux du fichier entier ; on le lui passe entier. Les sept langues sans
    // site lient vers les pages françaises : la correction proposée est en /fr/.
    const linkLocale = opts.routes.locales.includes(lang) ? lang : 'fr';
    for (const p of findLinkProblems(raws[lang]!, opts.routes, linkLocale)) {
      findings.push({ rule: 'liens', level: 'error', lang, line: p.line, message: `lien ${p.link} : ${LINK_REASONS[p.kind]}${p.suggestion ? ` ; remplacer par ${p.suggestion}` : ''}` });
    }
    // Cohérence lien / texte : seulement quand le lien est dans la langue du
    // texte. Les sept langues sans site lient vers /fr/ depuis un texte qui
    // n'est pas en français ; elles traduisent le français, contrôlé.
    findings.push(
      ...checkLinkCoherence(
        body,
        lang,
        (link) => (link.startsWith(`/${lang}/`) ? (opts.cards.get(link.replace(/[?#].*$/, '')) ?? null) : null),
        weekSlugs,
      ),
    );
    findings.push(...checkEntities(body, lang));
    if (lang === 'fr') {
      const texts = weekSourceTexts(week, data.changelog, data.radar);
      findings.push(...checkFacts(body, { week: extractSourceFacts(texts.week), olderRadar: extractSourceFacts(texts.olderRadar) }));
    }
  }
  const frontmatterLines = (lang: string) => {
    const raw = raws[lang];
    return raw ? raw.split('\n').length - bodies[lang]!.split('\n').length : 0;
  };
  return {
    week,
    findings: findings.map((f) => ({
      ...f,
      // Lignes du corps ramenées au fichier, sauf pour les liens (déjà dans le fichier).
      line: f.line !== undefined && f.rule !== 'liens' ? f.line + frontmatterLines(f.lang) : f.line,
      file: `${DIGEST_DIR}/${week}.${f.lang}.mdx`,
    })),
  };
}

const RULE_NAMES: Record<DigestFinding['rule'], string> = {
  completude: 'Complétude entre langues',
  liens: 'Lien interne',
  coherence: 'Lien et texte',
  entites: 'Entité belge',
  faits: 'Fait non ancré',
};

function print(checked: Checked[]): { errors: number; warnings: number } {
  let errors = 0;
  let warnings = 0;
  for (const { findings } of checked) {
    for (const f of findings) {
      const where = f.line ? `${f.file}:${f.line}` : f.file;
      const text = `  [${f.level === 'error' ? 'ERREUR' : 'avert.'}] ${RULE_NAMES[f.rule]} — ${where}  ${safeLine(f.message)}`;
      if (f.level === 'error') {
        errors++;
        console.error(text);
      } else {
        warnings++;
        console.log(text);
      }
    }
  }
  return { errors, warnings };
}

function audit(args: string[]): void {
  const refIdx = args.indexOf('--ref');
  const ref = refIdx >= 0 ? args[refIdx + 1] : undefined;
  // Plusieurs --week possibles (--week a --week b) : chaque valeur est retenue.
  // Seule la première l'était jusqu'au 30/09/2026, en silence : « --week w23
  // --week w13 » n'auditait que w23.
  const only = new Set(args.flatMap((a, i) => (a === '--week' && args[i + 1] ? [args[i + 1]] : [])));
  const read = ref ? refReader(ref) : diskReader;
  const data = readData(read);
  const files = listDigests(ref);
  const weeks = [...new Set(files.map((f) => parseDigestPath(f)!.week))].filter((w) => only.size === 0 || only.has(w)).sort();
  const cards = buildCardIndex();
  const routes = siteRoutes();
  const checked: Checked[] = [];
  for (const week of weeks) {
    const langs = new Set(files.filter((f) => parseDigestPath(f)!.week === week).map((f) => parseDigestPath(f)!.lang));
    checked.push(checkWeek(week, read, data, langs, { requireAll: false, cards, routes }));
  }
  const { errors, warnings } = print(checked);
  console.log(`\nAudit${ref ? ` à ${ref}` : ''} : ${weeks.length} semaine(s), ${errors} erreur(s), ${warnings} avertissement(s). Mode audit : jamais bloquant.`);
  const byRule = new Map<string, number>();
  for (const c of checked) for (const f of c.findings) if (f.level === 'error') byRule.set(f.rule, (byRule.get(f.rule) ?? 0) + 1);
  for (const [rule, n] of byRule) console.log(`  ${RULE_NAMES[rule as DigestFinding['rule']]} : ${n}`);
}

function main(): void {
  const args = process.argv.slice(2);
  if (args[0] === '--audit') return audit(args.slice(1));

  const [list, base] = args;
  if (!list || !base || !fs.existsSync(list)) {
    console.error('Usage : digest-check.ts <liste des MDX modifiés> <base git>   (ou --audit)');
    process.exit(1);
  }
  const changedFiles = fs
    .readFileSync(list, 'utf8')
    .split('\n')
    .map((l) => l.trim().replace(/^\.\//, ''))
    .filter((f) => f.startsWith(`${DIGEST_DIR}/`) && parseDigestPath(f) && fs.existsSync(path.join(REPO_ROOT, f)));
  if (changedFiles.length === 0) {
    console.log('OK : aucun digest ajouté ou modifié.');
    return;
  }
  const byWeek = new Map<string, Set<string>>();
  for (const f of changedFiles) {
    const { week, lang } = parseDigestPath(f)!;
    (byWeek.get(week) ?? byWeek.set(week, new Set()).get(week)!).add(lang);
  }

  const data = readData(diskReader);
  const cards = buildCardIndex();
  const routes = siteRoutes();
  const skipFacts = process.env.SKIP_DIGEST_FACTS === '1';
  const checked: Checked[] = [];
  for (const [week, langs] of [...byWeek].sort()) {
    // Semaine nouvelle dans la PR : toutes les langues sont exigées.
    const requireAll = readAtBase(base, `${DIGEST_DIR}/${week}.fr.mdx`) === null;
    const c = checkWeek(week, diskReader, data, langs, { requireAll, cards, routes });
    if (skipFacts) for (const f of c.findings) if (f.rule === 'faits') f.level = 'warning';
    checked.push(c);
  }

  console.log(`Digests contrôlés : ${changedFiles.length} fichier(s), semaine(s) ${[...byWeek.keys()].join(', ')}.`);
  if (skipFacts) console.log('SKIP_DIGEST_FACTS=1 : les faits non ancrés sont rapportés en avertissement.');
  const { errors, warnings } = print(checked);
  let annotated = 0;
  for (const c of checked) {
    for (const f of c.findings) {
      const msg = `${f.file}${f.line ? `:${f.line}` : ''} : ${safeLine(f.message)}`;
      if (f.level === 'warning') annotateWarning(RULE_NAMES[f.rule], msg, f.file);
      else if (annotated++ < 10) annotate(RULE_NAMES[f.rule], msg, f.file);
    }
  }
  if (errors === 0) {
    console.log(`OK : digests conformes${warnings ? ` (${warnings} avertissement(s) à relire)` : ''}.`);
    return;
  }
  console.error(`\nFAIL : ${errors} défaut(s) dans les digests.`);
  console.error(
    'Le digest est généré par Haiku (bgm-ops, src/digest.ts) à partir du changelog et du radar de la semaine.\n' +
      'Corriger le texte dans la PR : un fait absent des sources est retiré ou sourcé, un lien pointe vers le\n' +
      'sujet dont parle le paragraphe, une langue coupée est régénérée ou retraduite. Le label\n' +
      'skip-digest-facts rabat la seule règle des faits en avertissement (correction humaine sourcée ailleurs).',
  );
  process.exit(1);
}

main();
