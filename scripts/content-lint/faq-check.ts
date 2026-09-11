/**
 * scripts/content-lint/faq-check.ts
 *
 * Relecture et unicité des FAQ des fiches domaines et dossiers. La logique vit
 * dans src/lib/faq-review.ts, qui explique pourquoi ces deux gardes existent.
 *
 * Usage :
 *   npx tsx scripts/content-lint/faq-check.ts <fichier-liste>
 *     Mode CI. Vérifie que chaque fiche listée (un chemin par ligne) porte un
 *     `faqReviewed` au moins égal à sa `lastModified`, puis que chaque question
 *     n'est portée que par une seule fiche, sur tout le dépôt. Sort en code 1 si
 *     l'un des deux échoue. SKIP_FAQ_REVIEW=1 (label PR `skip-faq-check`)
 *     désactive la relecture, jamais l'unicité.
 *
 *   npm run faq:check
 *     Mode audit sur tout le dépôt. Affiche, ne bloque jamais.
 *
 *   npm run faq:registry
 *     Affiche le registre des questions calculé depuis le contenu, en JSON. Il
 *     remplace le registre tenu à la main dans bgm-ops, et n'écrit aucun fichier.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  type CardQuestions,
  checkFaqReview,
  extractFaqQuestions,
  findQuestionCollisions,
  normalizeQuestion,
} from '../../src/lib/faq-review';
import { FrontmatterError } from '../../src/lib/frontmatter';
import { annotate, safeLine } from './annotate';
import { readFrontmatterScalar } from '../../src/lib/summary-freshness';

/**
 * Seules ces collections déclarent le champ `faq` dans velite.config.ts
 * (DomainCard et DossierCard, vérifié le 2026-09-11). Velite supprime en
 * silence un champ non déclaré : une FAQ écrite sur une fiche secteur ou
 * commune ne s'afficherait jamais, et la vérifier n'aurait pas de sens.
 */
const SCOPED_DIRS = ['content/domain-cards', 'content/dossiers'] as const;

const REPO_ROOT = path.resolve(__dirname, '..', '..');



/**
 * Confinement par chemin résolu, pas par préfixe de chaîne : un préfixe laisse
 * passer `content/dossiers/../../package.json`, qui sortait du périmètre et
 * était lu (constaté le 2026-09-11). Git ne produit pas de tels chemins, mais
 * la liste vient de l'appelant, et une garde ne doit pas dépendre de lui.
 */
function isInScope(file: string): boolean {
  const abs = path.resolve(REPO_ROOT, file);
  return SCOPED_DIRS.some((dir) => abs.startsWith(path.join(REPO_ROOT, dir) + path.sep));
}

function listAllCards(): string[] {
  const files: string[] = [];
  for (const dir of SCOPED_DIRS) {
    const abs = path.join(REPO_ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const name of fs.readdirSync(abs).sort()) {
      if (name.endsWith('.mdx')) files.push(`${dir}/${name}`);
    }
  }
  return files;
}

function read(file: string): string | null {
  const abs = path.resolve(REPO_ROOT, file);
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
}

/** slug et locale depuis le frontmatter, avec repli sur le nom `slug.locale.mdx`. */
function identity(file: string, content: string): { slug: string; locale: string } {
  const base = path.basename(file, '.mdx');
  const dot = base.lastIndexOf('.');
  return {
    slug: readFrontmatterScalar(content, 'slug') ?? (dot > 0 ? base.slice(0, dot) : base),
    locale: readFrontmatterScalar(content, 'locale') ?? (dot > 0 ? base.slice(dot + 1) : 'fr'),
  };
}

/**
 * Un frontmatter illisible arrête tout : sa FAQ échapperait sinon au contrôle
 * d'unicité, et Velite refuserait de toute façon la fiche au build.
 */
function collectQuestions(): CardQuestions[] {
  const cards: CardQuestions[] = [];
  const unreadable: string[] = [];
  for (const file of listAllCards()) {
    const content = read(file);
    if (content === null) continue;
    try {
      const questions = extractFaqQuestions(content);
      if (questions.length === 0) continue;
      cards.push({ ...identity(file, content), questions });
    } catch (err) {
      if (!(err instanceof FrontmatterError)) throw err;
      unreadable.push(`  ${file}\n      ${err.message}`);
    }
  }
  if (unreadable.length > 0) {
    console.error('ERREUR : frontmatter illisible, FAQ non vérifiable :\n');
    for (const u of unreadable) console.error(u);
    process.exit(1);
  }
  return cards;
}

/**
 * Le dépôt porte des centaines de questions. N'en voir aucune signifie que le
 * check est aveugle (dossier renommé, champ `faq` renommé, extracteur cassé),
 * pas que tout va bien : on échoue plutôt que d'afficher un OK trompeur.
 */
function assertSeesQuestions(cards: CardQuestions[]): void {
  const total = cards.reduce((n, c) => n + c.questions.length, 0);
  if (total > 0) return;
  console.error("ERREUR : aucune question de FAQ trouvée dans les fiches domaines et dossiers.");
  console.error(`Le check d'unicité est aveugle. Vérifier ${SCOPED_DIRS.join(' et ')} et le champ faq.`);
  process.exit(1);
}

function reportCollisions(stream: (msg: string) => void): number {
  const cards = collectQuestions();
  assertSeesQuestions(cards);
  const collisions = findQuestionCollisions(cards);
  if (collisions.length === 0) return 0;
  stream(`Question(s) posée(s) deux fois (${collisions.length}) :\n`);
  for (const c of collisions) {
    stream(`  [${c.locale}] « ${safeLine(c.question)} »`);
    const repeated = c.count > c.slugs.length ? ` (${c.count} occurrences, répétée dans une même fiche)` : '';
    stream(`      ${c.slugs.join(', ')}${repeated}`);
    annotate('Question en double', `[${c.locale}] « ${safeLine(c.question)} » : ${c.slugs.join(', ')}${repeated}`);
  }
  stream('');
  stream('Une question, une seule fiche : deux fiches qui répondent à la même requête se');
  stream('concurrencent dans les moteurs de recherche. Garder la question sur la fiche');
  stream("canonique et reformuler l'autre vers une requête distincte. Dans une même");
  stream('fiche, supprimer le doublon.');
  return collisions.length;
}

function printRegistry(): void {
  const registry: Record<string, Record<string, string | string[]>> = {};
  for (const card of collectQuestions()) {
    const byLocale = (registry[card.locale] ??= {});
    for (const q of card.questions) {
      const key = normalizeQuestion(q);
      const prev = byLocale[key];
      if (prev === undefined) byLocale[key] = card.slug;
      else if (prev !== card.slug && !(Array.isArray(prev) && prev.includes(card.slug))) {
        byLocale[key] = [...(Array.isArray(prev) ? prev : [prev]), card.slug].sort();
      }
    }
  }
  const sorted = Object.fromEntries(
    Object.keys(registry)
      .sort()
      .map((locale) => [
        locale,
        Object.fromEntries(Object.entries(registry[locale]!).sort(([a], [b]) => a.localeCompare(b))),
      ]),
  );
  console.log(JSON.stringify(sorted, null, 2));
}

function main(): void {
  const arg = process.argv[2];

  if (arg === '--registry') {
    printRegistry();
    return;
  }

  // Mode audit : aucun argument, on regarde tout et on ne bloque rien.
  if (!arg) {
    const cards = listAllCards();
    let missing = 0;
    for (const file of cards) {
      const content = read(file);
      if (content === null) continue;
      try {
        if (readFrontmatterScalar(content, 'faqReviewed') === undefined) missing++;
      } catch (err) {
        if (!(err instanceof FrontmatterError)) throw err;
        console.log(`${file} : ${err.message}`);
      }
    }
    console.log(`${cards.length} fiche(s) domaine et dossier, dont ${missing} sans faqReviewed.`);
    console.log("Elles ne seront vérifiées qu'à leur prochaine republication.\n");
    if (reportCollisions(console.log) === 0) console.log('OK : aucune question posée deux fois.');
    console.log('\nMode audit : aucune sortie en erreur.');
    return;
  }

  if (!fs.existsSync(arg)) {
    console.error(`ERREUR : liste de fichiers introuvable (${arg}).`);
    process.exit(1);
  }

  let failed = false;

  // 1. Relecture, sur les seules fiches republiées.
  if (process.env.SKIP_FAQ_REVIEW === '1') {
    console.log('SKIP : relecture des FAQ (label skip-faq-check).');
  } else {
    const changed = fs
      .readFileSync(arg, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .filter(isInScope);

    const violations: { file: string; reason: string }[] = [];
    let checked = 0;
    let deleted = 0;
    for (const file of changed) {
      const content = read(file);
      if (content === null) {
        deleted++; // fiche supprimée par la PR
        continue;
      }
      checked++;
      try {
        const r = checkFaqReview({
          lastModified: readFrontmatterScalar(content, 'lastModified'),
          faqReviewed: readFrontmatterScalar(content, 'faqReviewed'),
        });
        if (r.verdict !== 'ok') violations.push({ file, reason: r.reason });
      } catch (err) {
        if (!(err instanceof FrontmatterError)) throw err;
        violations.push({ file, reason: err.message });
      }
    }

    const deletedNote = deleted > 0 ? `, ${deleted} supprimée(s) ignorée(s)` : '';
    if (checked === 0) {
      console.log(`Relecture : aucune fiche domaine ou dossier à vérifier${deletedNote}.`);
    } else if (violations.length === 0) {
      console.log(`OK : FAQ relue sur ${checked} fiche(s) vérifiée(s)${deletedNote}.`);
    } else {
      failed = true;
      console.error('FAIL : FAQ à relire dans les fiches suivantes :\n');
      for (const v of violations) {
        console.error(`  ${v.file}`);
        console.error(`      ${v.reason}`);
        annotate('FAQ à relire', `${v.file} : ${v.reason} Correctif sans republication : label skip-faq-check, puis fermer et rouvrir la PR.`, v.file);
      }
      console.error('');
      console.error('Chaque fiche republiée doit dire que sa FAQ a été relue contre son corps,');
      console.error("qu'elle en ait une ou non. Sans FAQ, la date enregistre la décision");
      console.error("« relu, rien à écrire ». Passer faqReviewed à la date du jour après relecture.");
      console.error("Coquille ou lien corrigé, sans republication : label 'skip-faq-check', posé À LA");
      console.error('CRÉATION de la PR (ajouté après coup, il ne relance pas la CI : fermer puis rouvrir');
      console.error("la PR). En local : SKIP_FAQ_REVIEW=1 git push. Il suspend la relecture, jamais l'unicité.");
      console.error('');
    }
  }

  // 2. Unicité, sur tout le dépôt : une collision peut venir de l'une ou l'autre fiche.
  if (reportCollisions(console.error) > 0) failed = true;
  else console.log('OK : aucune question posée deux fois.');

  if (failed) process.exit(1);
}

main();
