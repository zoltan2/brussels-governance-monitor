// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Logique pure du Stuut, pour le jeu natif du panneau de jeux.
 *
 * Portée depuis le dépôt du jeu (zoltan2/stuut, public/assets/game.mjs et
 * defi-codec.mjs), SANS la banque de mots : le mot du jour vient de
 * `GET https://stuut.governance.brussels/api/jour`, calculé par le même
 * chargeur que le jeu autonome et le digest de 7h15. Recopier la banque ici
 * l'aurait fait diverger à la première publication, et le panneau aurait fait
 * jouer un autre mot que le jeu autonome, sans que rien ne le signale.
 *
 * Ce qui reste recopié, et pourquoi c'est tenable :
 *   - l'évaluation d'un essai et la normalisation, deux fonctions de trois
 *     lignes qui n'ont pas bougé depuis le lancement ;
 *   - le format du lien de défi (v2). Il est lu par le jeu AUTONOME, qui reste
 *     le seul à recevoir des défis. `stuut.test.ts` verrouille la compatibilité
 *     sur des sorties produites par le vrai codec : si l'un des deux change,
 *     le test casse.
 */

export const STUUT_SITE = 'https://stuut.governance.brussels';
export const STUUT_API_JOUR = `${STUUT_SITE}/api/jour`;

export const MAX_ESSAIS = 6;

/** Réponse de `/api/jour`. */
export interface StuutJour {
  jour: string;
  numero: number;
  mot: string;
  definition: string;
  url: string;
  appat: string | null;
}

/** Garde de forme : une réponse inattendue doit mener à l'écran d'erreur, pas à un plantage. */
export function estStuutJour(v: unknown): v is StuutJour {
  if (!v || typeof v !== 'object') return false;
  const j = v as Record<string, unknown>;
  return (
    typeof j.jour === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(j.jour) &&
    typeof j.numero === 'number' &&
    Number.isInteger(j.numero) &&
    typeof j.mot === 'string' &&
    /^[A-Za-zÀ-ÿ]{2,20}$/.test(j.mot) &&
    typeof j.definition === 'string' &&
    typeof j.url === 'string' &&
    (j.appat === null || typeof j.appat === 'string')
  );
}

export type Verdict = 'correct' | 'present' | 'absent';

/** Majuscules sans accents : « Mobilité » et « MOBILITE » sont le même mot. */
export function norm(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
}

/**
 * Évalue un essai, lettre par lettre. Deux passes, comme le Wordle : les lettres
 * bien placées d'abord, puis les lettres présentes ailleurs, dans la limite de
 * leur nombre d'occurrences restantes dans la solution.
 */
export function evaluer(essai: string, solution: string): Verdict[] {
  const res: Verdict[] = Array(solution.length).fill('absent');
  const reste: Record<string, number> = {};
  for (let i = 0; i < solution.length; i++) {
    if (essai[i] === solution[i]) res[i] = 'correct';
    else reste[solution[i]] = (reste[solution[i]] ?? 0) + 1;
  }
  for (let i = 0; i < solution.length; i++) {
    if (res[i] === 'correct') continue;
    const l = essai[i];
    if ((reste[l] ?? 0) > 0) {
      res[i] = 'present';
      reste[l]--;
    }
  }
  return res;
}

const RANG: Record<Verdict, number> = { absent: 0, present: 1, correct: 2 };

/** État des touches du clavier : chaque lettre garde le meilleur verdict obtenu. */
export function etatTouches(essais: string[], evals: Verdict[][]): Record<string, Verdict> {
  const etat: Record<string, Verdict> = {};
  essais.forEach((essai, r) => {
    for (let i = 0; i < essai.length; i++) {
      const l = essai[i];
      const v = evals[r][i];
      if (etat[l] === undefined || RANG[v] > RANG[etat[l]]) etat[l] = v;
    }
  });
  return etat;
}

export const EMO: Record<Verdict, string> = { correct: '🟩', present: '🟧', absent: '⬛' };

export function grilleDepuisEvals(evals: Verdict[][]): string {
  return evals.map((ligne) => ligne.map((v) => EMO[v]).join('')).join('\n');
}

// ─── Statistiques locales ───────────────────────────────────────────────────
// Mêmes clé et forme que le jeu autonome. Elles ne se croisent pas pour autant :
// le localStorage est propre à chaque origine, et governance.brussels n'est pas
// stuut.governance.brussels. Un joueur a donc une série ici et une autre là-bas.

export const CLE_STATS = 'bgm_stuut_stats';
export const CLE_PSEUDO = 'bgm_stuut_pseudo';

export interface ResultatDuJour {
  day: number;
  won: boolean;
  /** Nombre d'essais si gagné, 0 si perdu. */
  n: number;
  grid: string;
}

export interface StuutStats {
  played: number;
  wins: number;
  streak: number;
  max: number;
  dist: number[];
  lastDay: number | null;
  today?: ResultatDuJour;
}

export function statsVierges(): StuutStats {
  return { played: 0, wins: 0, streak: 0, max: 0, dist: [0, 0, 0, 0, 0, 0], lastDay: null };
}

/** Lecture tolérante : une valeur corrompue ou d'une autre forme repart de zéro. */
export function lireStats(brut: string | null): StuutStats {
  if (!brut) return statsVierges();
  try {
    const s = JSON.parse(brut) as Partial<StuutStats> | null;
    if (!s || typeof s !== 'object' || !Array.isArray(s.dist) || s.dist.length !== 6) return statsVierges();
    return { ...statsVierges(), ...s } as StuutStats;
  } catch {
    return statsVierges();
  }
}

/**
 * Enregistre la partie du jour. Une seule comptabilisation par jour, comme dans
 * le jeu autonome : rejouer le même jour ne gonfle rien.
 */
export function enregistrer(s: StuutStats, resultat: ResultatDuJour): StuutStats {
  const suivant: StuutStats = { ...s, dist: [...s.dist], today: resultat };
  if (s.lastDay === resultat.day) return suivant;
  suivant.played++;
  if (resultat.won) {
    suivant.wins++;
    // Série : un jour sauté la casse. Le jeu autonome ne le vérifie pas (il ne
    // la remet à zéro que sur une défaite) ; ici on compare au jour précédent.
    suivant.streak = s.lastDay === resultat.day - 1 ? s.streak + 1 : 1;
    suivant.max = Math.max(suivant.max, suivant.streak);
    suivant.dist[resultat.n - 1]++;
  } else {
    suivant.streak = 0;
  }
  suivant.lastDay = resultat.day;
  return suivant;
}

// ─── Partage et défi ────────────────────────────────────────────────────────

export function texteResultat(numero: number, r: ResultatDuJour): string {
  const score = r.won ? r.n : 'X';
  return `Le Stuut du jour n°${numero} : ${score}/${MAX_ESSAIS}\n${r.grid}\n${STUUT_SITE}`;
}

const PSEUDO_RETIRE = /[^\p{L}\p{N} .,'!?-]/gu;

/** Nettoie un pseudo : il voyage dans le lien de défi, séparé par des « | ». */
export function assainirPseudo(p: unknown): string | null {
  if (typeof p !== 'string') return null;
  const propre = p.replace(PSEUDO_RETIRE, '').trim().slice(0, 20);
  return propre.length ? propre : null;
}

const CHIFFRE: Record<string, string> = { [EMO.absent]: '0', [EMO.present]: '1', [EMO.correct]: '2' };

function isoVersJourEpoch(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

function base64Url(octets: Uint8Array): string {
  let bin = '';
  for (const b of octets) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Encode un défi au format v2 du jeu autonome :
 * `2|<jour en base 36>|<essais>|<variante>|<pseudo>|<grille en chiffres>`,
 * en base64url. `[...grid]` et non `split('')` : les emoji sont hors du plan
 * de base, `split` les couperait en deux moitiés invalides.
 */
export function encoderDefi(d: {
  jour: string;
  n: number;
  pseudo: string | null;
  grid: string;
  variante: number;
}): string {
  const grille = [...d.grid].map((c) => (c === '\n' ? '\n' : CHIFFRE[c] ?? '')).join('');
  const brut = `2|${isoVersJourEpoch(d.jour).toString(36)}|${d.n}|${d.variante}|${d.pseudo ?? ''}|${grille}`;
  return base64Url(new TextEncoder().encode(brut));
}

/** Les trois accroches de défi du jeu autonome, dans le même ordre (l'index voyage dans le lien). */
const ACCROCHES = [
  {
    win: (n: number, g: string, u: string) =>
      `Comme le Wordle, mais sur les coulisses de Bruxelles. J'ai trouvé le mot du jour en ${n} essai${n === 1 ? '' : 's'} :\n${g}\nÀ toi de jouer 👉 ${u}`,
    lose: (g: string, u: string) =>
      `Comme le Wordle, mais sur les coulisses de Bruxelles. Le mot du jour m'a résisté :\n${g}\nÀ toi de voir si tu fais mieux 👉 ${u}`,
  },
  {
    win: (n: number, g: string, u: string) =>
      `J'ai trouvé le mot du jour sur la gouvernance bruxelloise en ${n} essai${n === 1 ? '' : 's'} :\n${g}\nToi, tu tiens combien d'essais ? ${u}`,
    lose: (g: string, u: string) =>
      `Le mot du jour sur la gouvernance bruxelloise m'a résisté :\n${g}\nToi, tu vas faire mieux ? ${u}`,
  },
  {
    win: (n: number, g: string, u: string) =>
      `Un mot par jour pour décrypter la gouvernance bruxelloise, je l'ai trouvé en ${n} essai${n === 1 ? '' : 's'} :\n${g}\nà toi de tenter 👉 ${u}`,
    lose: (g: string, u: string) =>
      `Un mot par jour pour décrypter la gouvernance bruxelloise, celui du jour m'a résisté :\n${g}\nà toi de tenter 👉 ${u}`,
  },
];

export const NB_VARIANTES = ACCROCHES.length;

export function texteDefi(r: ResultatDuJour, url: string, variante: number): string {
  const a = ACCROCHES[variante];
  return r.won ? a.win(r.n, r.grid, url) : a.lose(r.grid, url);
}

/** Le lien de défi pointe vers le jeu AUTONOME, seul à savoir le lire. */
export function lienDefi(code: string): string {
  return `${STUUT_SITE}/#d=${code}`;
}

/**
 * Le lien « pour aller plus loin » vise une page de ce site : on le rend
 * relatif, sans les UTM que le jeu autonome y ajoute (une visite interne n'a
 * pas de campagne d'acquisition). Une adresse externe reste telle quelle.
 */
export function lienInterne(url: string): string {
  try {
    const u = new URL(url);
    if (u.origin === 'https://governance.brussels') return `${u.pathname}${u.hash}`;
  } catch {
    // adresse illisible : rendue telle quelle, le navigateur tranchera
  }
  return url;
}

// ─── Inscription au Stuut par e-mail ────────────────────────────────────────
// Même service que le jeu autonome : stuut-api, avec sa double confirmation par
// e-mail, son délai d'une heure par adresse et son limiteur par IP. La route
// accepte governance.brussels depuis le 18/09/2026 (stuut-api, origine-inscription.ts).

export const STUUT_API_INSCRIPTION = `${STUUT_SITE}/api/subscribe`;

/** Mêmes clés que le jeu autonome (newsletter-form.mjs, game.mjs), sur l'origine de BGM. */
export const CLE_INSCRIT = 'bgm_stuut_subscribed';
export const CLE_INVITATION = 'bgm_stuut_email_prompt_at';

/** Une invitation en fin de partie tous les trois jours au plus, comme le jeu autonome. */
export const DELAI_INVITATION_MS = 3 * 86_400_000;

// La même règle que newsletter-flow.mjs : le serveur revalide de toute façon.
const EMAIL_RE = /^[^@\s<>"']+@[^@\s<>"']+\.[^@\s<>"']+$/;

export function emailValide(v: string): boolean {
  return EMAIL_RE.test(v) && v.length <= 254;
}

export function doitInviter({
  inscrit,
  derniereInvitation,
  maintenant,
}: {
  inscrit: boolean;
  derniereInvitation: number | null;
  maintenant: number;
}): boolean {
  if (inscrit) return false;
  if (derniereInvitation === null || !Number.isFinite(derniereInvitation)) return true;
  return maintenant - derniereInvitation >= DELAI_INVITATION_MS;
}

// ─── Affichage ──────────────────────────────────────────────────────────────

/** Interstice entre cases, resserré pour les mots longs (jusqu'à 13 lettres). */
export function interstice(longueur: number): number {
  return longueur >= 12 ? 2 : longueur >= 10 ? 5 : 7;
}

/** Taille maximale d'une case ; la largeur réelle est bornée en CSS par la largeur du plateau. */
export function caseMax(longueur: number): number {
  return longueur > 9 ? 44 : longueur > 7 ? 48 : 52;
}

export const CLAVIER = [
  ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M'],
  ['ENTRER', 'W', 'X', 'C', 'V', 'B', 'N', 'RETOUR'],
] as const;

const VICTOIRES = ['Bien vu.', 'Tout en finesse.', 'Net et sans bavure.', 'Pile dans le mille.'];

export function verdictFinal(r: ResultatDuJour): string {
  if (!r.won) return 'Celui-là était coriace.';
  if (r.n === 1) return 'Du premier coup. Chapeau, vraiment.';
  return VICTOIRES[Math.min(r.n - 1, VICTOIRES.length - 1)];
}
