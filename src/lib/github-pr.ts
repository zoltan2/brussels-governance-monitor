// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Lecture des PR de contenu via l'API REST GitHub.
 *
 * Trois pièges mesurés le 2026-08-11, chacun ayant une conséquence :
 *
 * 1. `GET /pulls` rend un objet PLUS PAUVRE que `GET /pulls/{n}` : ni
 *    `changed_files` ni `mergeable_state`. Ne jamais lire ces champs sur un
 *    élément de liste, ils valent `undefined` sans erreur.
 * 2. `GET /pulls/{n}/files` pagine : 30 par défaut, 100 au maximum, plafond
 *    dur à 3000. Une PR de veille compte de 293 à 1480 fichiers. Une
 *    troncature silencieuse rendrait toute liste blanche contournable, car
 *    GitHub trie par chemin et `src/` arrive APRÈS le millier de fichiers
 *    `public/pagefind/`. D'où le drapeau `truncated`, qui doit bloquer la
 *    fusion plutôt que la laisser passer.
 * 3. `GET /commits/{sha}/check-runs` est déjà porté par le sha demandé :
 *    comparer `check_runs[].head_sha` au sha interrogé compare une valeur à
 *    elle-même. NE PAS écrire ce garde-fou, il donne une fausse assurance.
 *    La protection réelle est le paramètre `sha` transmis à la fusion
 *    (tâche 8), que GitHub refuse si la branche a bougé.
 */

const API = 'https://api.github.com';
const PER_PAGE = 100;
const MAX_PAGES = 30; // 3000 fichiers, le plafond dur de l'API.

/** Vérifié sur les PR de veille réelles : `content/veille-2026-08-09`. */
export const CONTENT_BRANCH_PREFIX = 'content/veille-';

export interface ContentPr {
  number: number;
  title: string;
  body: string;
  branch: string;
  /** Commit de tête de la branche. */
  sha: string;
  /** Commit de base sur main, nécessaire pour lire l'état antérieur d'une fiche. */
  baseSha: string;
  /** Branche cible. Une PR ne visant pas `main` ne doit pas être présentée ici. */
  baseRef: string;
  /**
   * Dépôt d'où vient la branche. **La garde de sécurité décisive.** Sur une PR
   * ouverte depuis un fork, `branch` est le nom choisi par l'auteur : un
   * inconnu nomme sa branche `content/veille-2026-08-16` et franchit toute
   * garde qui ne regarde que le nom. `null` si le fork a été supprimé.
   */
  headRepo: string | null;
  createdAt: string;
  /** Renseigné par `GET /pulls/{n}` seulement, jamais par la liste. */
  mergedAt: string | null;
}

export interface PrFile {
  path: string;
  status: string;
  additions: number;
  deletions: number;
}

export interface PrFiles {
  files: PrFile[];
  truncated: boolean;
  /**
   * Pourquoi la liste est tronquée, ou `null` si elle ne l'est pas.
   * `page-echouee` (403 de quota, 500…) n'est PAS `plafond-atteint` (plus de
   * 3000 fichiers, le plafond dur de l'API) : la première panne se résout en
   * réessayant, la seconde ne se résout que sur GitHub. Un message qui ne
   * distingue pas les deux envoie diagnostiquer au mauvais endroit.
   */
  truncatedReason: 'page-echouee' | 'plafond-atteint' | null;
}

export interface CheckState {
  passed: number;
  pending: number;
  failed: string[];
  total: number;
  /** Contrôles requis qui n'ont pas réussi. Vide = feu vert. */
  missing: string[];
}

/**
 * GitHub est insensible à la casse sur `owner/name`, et la variable
 * d'environnement se voit souvent écrite avec un `.git`, une barre finale ou
 * une URL complète. Comparée en égalité stricte à `head.repo.full_name`, une
 * de ces formes ferait à la fois disparaître l'écran (« Rien à publier ») et
 * refuser la fusion (403), sans qu'aucun des deux symptômes ne désigne la
 * cause. On normalise une fois, ici.
 */
export function normalizeRepo(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/\/$/, '')
    .toLowerCase();
}

function config(): { token: string; repo: string } {
  const token = process.env.GITHUB_TOKEN;
  const rawRepo = process.env.GITHUB_REPO;
  if (!token || !rawRepo) {
    throw new Error('GITHUB_TOKEN et GITHUB_REPO sont requis');
  }
  const repo = normalizeRepo(rawRepo);
  if (!/^[^/]+\/[^/]+$/.test(repo)) {
    throw new Error(`GITHUB_REPO mal formé : attendu owner/name, reçu ${rawRepo}`);
  }
  return { token, repo };
}

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

interface RawPr {
  number: number;
  title: string;
  body: string | null;
  created_at: string;
  merged_at: string | null;
  head: { ref: string; sha: string; repo: { full_name: string } | null };
  base: { sha: string; ref: string };
}

function toPr(raw: RawPr): ContentPr {
  return {
    number: raw.number,
    title: raw.title,
    body: raw.body ?? '',
    branch: raw.head.ref,
    sha: raw.head.sha,
    baseSha: raw.base.sha,
    baseRef: raw.base.ref,
    headRepo: raw.head.repo?.full_name ?? null,
    createdAt: raw.created_at,
    mergedAt: raw.merged_at ?? null,
  };
}

/**
 * « Cette PR a-t-elle le droit d'être publiée depuis l'écran d'admin ? »
 * Rend la RAISON du refus, ou `null` si elle passe.
 *
 * Écrit UNE fois et lu par les trois surfaces — la liste, la page-décision et
 * la route de fusion. Auparavant le contrat était écrit deux fois de deux
 * façons et absent de la troisième : `getContentPr` ne filtrait rien, donc
 * `/fr/admin/content/<n>` affichait n'importe quelle PR ouverte, y compris
 * une PR de fork au titre et au corps contrôlés par un inconnu, dans
 * l'habillage de confiance de l'admin.
 *
 * `repo` est accepté sous n'importe laquelle des formes que `normalizeRepo`
 * anticipe : on ne compare jamais une brute à une normalisée.
 */
export function publishablePrProblem(
  pr: Pick<ContentPr, 'headRepo' | 'branch' | 'baseRef'>,
  repo: string,
): string | null {
  // LA garde décisive : la branche doit venir de NOTRE dépôt. Sur une PR de
  // fork, `branch` est le nom choisi par un inconnu — vérifier le nom seul ne
  // vérifie rien. `headRepo` vaut `null` quand le fork a été supprimé.
  if (pr.headRepo === null || pr.headRepo.toLowerCase() !== normalizeRepo(repo)) {
    return 'PR extérieure au dépôt';
  }
  if (!pr.branch.startsWith(CONTENT_BRANCH_PREFIX)) {
    return 'Branche hors périmètre';
  }
  if (pr.baseRef !== 'main') {
    return 'Branche cible inattendue';
  }
  return null;
}

/**
 * Lit un fichier à une référence donnée. Renvoie `null` si le fichier
 * n'existe pas à cette référence, ce qui est le cas nominal pour une fiche
 * créée par la veille : elle n'a pas d'état antérieur.
 *
 * LÈVE sur tout autre échec. Rendre `null` sur un 403 de quota faisait
 * afficher « aucun résumé de changement » et zéro chiffre nouveau pour
 * TOUTES les fiches, strictement indiscernable d'une veille sans résumé — sur
 * le seul panneau que la spec désigne comme réellement relu.
 */
export async function readFileAtRef(path: string, ref: string): Promise<string | null> {
  const { token, repo } = config();

  // `encodeURI` n'encode ni `#`, ni `?`, ni `&`, ni `=`. Git accepte ces
  // caractères dans un nom de fichier, et un nom bien choisi détournerait la
  // référence lue : `mobilite?ref=main&x=.fr.mdx` ferait lire `main` des deux
  // côtés, donc afficher « aucun changement » sur une fiche modifiée. C'est
  // le seul contrôle humain de l'écran ; on le protège.
  // Un chemin refusé n'est pas un fichier absent : on lève, pour que la fiche
  // s'affiche « illisible » au lieu de « aucun résumé ».
  if (!/^[A-Za-z0-9._/-]+$/.test(path) || path.includes('..')) {
    throw new Error(`chemin refusé : ${path}`);
  }

  const encoded = path.split('/').map(encodeURIComponent).join('/');
  const res = await fetch(`${API}/repos/${repo}/contents/${encoded}?ref=${encodeURIComponent(ref)}`, {
    headers: headers(token),
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`contents/${path}: GitHub a répondu ${res.status}`);
  }
  const body = (await res.json()) as { content?: string; encoding?: string };
  if (!body.content || body.encoding !== 'base64') {
    throw new Error(`contents/${path}: réponse sans contenu base64`);
  }
  return Buffer.from(body.content, 'base64').toString('utf8');
}

export async function listContentPrs(): Promise<ContentPr[]> {
  const { token, repo } = config();
  const res = await fetch(`${API}/repos/${repo}/pulls?state=open&per_page=50`, {
    headers: headers(token),
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const raw = (await res.json()) as RawPr[];
  // Les trois filtres — origine, préfixe de branche, branche cible — vivent
  // dans `publishablePrProblem`, partagée avec la page-décision et la route
  // de fusion.
  return raw.map(toPr).filter((p) => publishablePrProblem(p, repo) === null);
}

/**
 * `null` signifie « cette PR n'existe pas », et RIEN d'autre. Avaler tout
 * `!res.ok` en `null` faisait rendre un 404 « page introuvable » sur un 403 de
 * quota : l'écran affirmait l'inexistence d'une PR qu'il n'avait pas pu lire,
 * seule surface du module à mentir là où la tuile, l'aiguillage et l'état des
 * contrôles disent tous « indisponible ». Même motif que `src/lib/github.ts`.
 */
export async function getContentPr(number: number): Promise<ContentPr | null> {
  const { token, repo } = config();
  const res = await fetch(`${API}/repos/${repo}/pulls/${number}`, {
    headers: headers(token),
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`pulls/${number}: GitHub a répondu ${res.status}`);
  }
  return toPr((await res.json()) as RawPr);
}

export async function getPrFiles(number: number): Promise<PrFiles> {
  const { token, repo } = config();
  const files: PrFile[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetch(`${API}/repos/${repo}/pulls/${number}/files?per_page=${PER_PAGE}&page=${page}`, {
      headers: headers(token),
      cache: 'no-store',
    });
    if (!res.ok) return { files, truncated: true, truncatedReason: 'page-echouee' };

    const batch = (await res.json()) as Array<{
      filename: string;
      status: string;
      additions: number;
      deletions: number;
    }>;

    for (const f of batch) {
      files.push({
        path: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
      });
    }

    // Une page incomplète signifie qu'on a tout vu.
    if (batch.length < PER_PAGE) return { files, truncated: false, truncatedReason: null };
  }

  // On a épuisé les pages autorisées sans jamais voir de page incomplète :
  // il reste peut-être des fichiers qu'on n'a pas regardés.
  return { files, truncated: true, truncatedReason: 'plafond-atteint' };
}

/**
 * Contrôles que la CI doit avoir exécutés ET réussis avant toute fusion.
 * Exiger un ensemble NOMMÉ, et pas seulement « aucun échec » : une PR ouverte
 * depuis un fork n'exécute aucun workflow tant qu'un mainteneur ne l'approuve
 * pas, donc son état nominal est zéro contrôle — que « aucun échec » lit
 * comme un feu vert.
 *
 * Ce sont les noms de job, pas de workflow : c'est ce que rend l'API
 * `check-runs`. Relevés le 2026-08-11 dans `.github/workflows/`. Si un
 * workflow est renommé, cette liste doit suivre.
 *
 * Trois des quatre sont conditionnés par `paths:` : les exiger toujours
 * bloquerait une veille qui ne touche pas ces chemins. « Editorial content
 * checks » et « Quiz pool checks » partagent le même déclencheur, donc la
 * même branche conditionnelle : ce sont les deux jobs d'un même workflow,
 * `content-lint.yml`, qui se déclenchent toujours ensemble.
 */
const CHECK_ALWAYS = 'Lint, Typecheck & Build'; // ci.yml, aucun filtre de chemin
const CHECK_CONTENT = 'Editorial content checks'; // content-lint.yml, job content-lint
const CHECK_QUIZ = 'Quiz pool checks'; // content-lint.yml, job quiz-lint
const CHECK_PAGEFIND = 'Pagefind index up to date'; // pagefind-freshness.yml

/** Contrôles requis pour CE jeu de fichiers, selon les filtres `paths:`. */
export function requiredChecksFor(paths: string[]): string[] {
  const required = [CHECK_ALWAYS];

  if (
    paths.some(
      (p) =>
        p.startsWith('content/') ||
        /^public\/quiz-data-.*\.json$/.test(p) ||
        p === 'scripts/quiz-lint.ts',
    )
  ) {
    // `content-lint.yml` déclenche `content-lint` (Editorial content checks)
    // ET `quiz-lint` (Quiz pool checks) sous le même `paths:`, sans `if:`
    // propre à l'un ou l'autre job : ils partent toujours ensemble.
    required.push(CHECK_CONTENT, CHECK_QUIZ);
  }

  if (
    paths.some(
      (p) =>
        p.startsWith('content/') ||
        /^messages\/[^/]+\.json$/.test(p) ||
        p === 'velite.config.ts' ||
        p.startsWith('public/pagefind/'),
    )
  ) {
    required.push(CHECK_PAGEFIND);
  }

  return required;
}

export async function getCheckState(sha: string, paths: string[]): Promise<CheckState> {
  const { token, repo } = config();

  const runs: Array<{ name: string; status: string; conclusion: string | null }> = [];
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(`${API}/repos/${repo}/commits/${sha}/check-runs?per_page=100&page=${page}`, {
      headers: headers(token),
      cache: 'no-store',
    });
    // Échouer en se FERMANT. Rendre un état vide sur un 403 de limite de débit
    // se lirait « tous les contrôles sont verts » : c'est l'inverse de ce
    // qu'il faut, et c'est incohérent avec getPrFiles et getContentPr, qui
    // échouent tous deux en se fermant.
    if (!res.ok) {
      throw new Error(`check-runs: GitHub a répondu ${res.status}`);
    }
    const body = (await res.json()) as {
      check_runs?: Array<{ name: string; status: string; conclusion: string | null }>;
    };
    const batch = body.check_runs ?? [];
    runs.push(...batch);
    if (batch.length < 100) break;
  }

  const failed: string[] = [];
  const succeeded = new Set<string>();
  let passed = 0;
  let pending = 0;

  for (const run of runs) {
    if (run.status !== 'completed') {
      pending++;
    } else if (
      run.conclusion === 'success' ||
      run.conclusion === 'neutral' ||
      run.conclusion === 'skipped'
    ) {
      passed++;
      succeeded.add(run.name);
    } else {
      failed.push(run.name);
    }
  }

  const missing = requiredChecksFor(paths).filter((name) => !succeeded.has(name));

  return { passed, pending, failed, total: runs.length, missing };
}
