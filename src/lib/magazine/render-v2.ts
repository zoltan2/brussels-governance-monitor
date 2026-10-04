import { AUTHOR } from './author';
import type { MagazineDraft, MagazineItem, MagazineConfidence, MagazineSourceKind } from './types';
import { escapeHtml, GOOGLE_FONTS_HREF, umamiSnippet } from './template';
import { MAGAZINE_V2_CSS } from './template-v2';

/**
 * Gabarit v2 du magazine : couverture, sommaire, une feuille par sujet
 * (chapeau, corps, sources typées, panneau du chiffre avec statut et repères,
 * nuance titrée), « Comment lire » adressé au lecteur, clôture.
 * Lecture verticale, liens d'ancrage, aucun script hors mesure d'audience.
 */

const MAGAZINE_BASE = 'https://magazine.governance.brussels';

const CONFIDENCE_LABEL: Record<MagazineConfidence, string> = {
  official: 'Donnée officielle',
  estimated: 'Estimation',
  unconfirmed: 'Rapporté par la presse, non confirmé',
};

const KIND_LABEL: Record<MagazineSourceKind, string> = {
  primaire: 'Source primaire',
  secondaire: 'Source secondaire',
  tierce: 'Source tierce',
};

const COUNT_WORDS = ['', 'Un', 'Deux', 'Trois', 'Quatre', 'Cinq', 'Six', 'Sept', 'Huit', 'Neuf', 'Dix', 'Onze', 'Douze'];

function countLabel(n: number): string {
  const word = COUNT_WORDS[n];
  return word ? `${word} sujet${n > 1 ? 's' : ''}` : `${n} sujets`;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatDayFr(iso: string | undefined): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const d = new Date(`${iso}T12:00:00Z`);
  const s = new Intl.DateTimeFormat('fr-BE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
  return s.replace(/^1 /, '1er ');
}

function siteUrl(path: string | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${AUTHOR.siteBase}${path}`;
}

function ctaLabel(path: string | undefined): string {
  if (!path) return 'Lire sur le site';
  if (path.includes('/dossiers/')) return 'Lire le dossier';
  if (path.includes('/domaines/')) return 'Explorer le thème';
  if (path.includes('/communes/')) return 'Voir la commune';
  if (path.includes('/secteurs/')) return 'Voir le secteur';
  return 'Lire sur le site';
}

function slug(item: MagazineItem, rank: number): string {
  const base = (item.short ?? item.headline)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `sujet-${pad2(rank)}-${base || 'sujet'}`;
}

function renderSources(item: MagazineItem, consulted: string): string {
  const sources = item.sources ?? [];
  if (sources.length === 0) return '';
  const refs = `${sources.length} référence${sources.length > 1 ? 's' : ''}`;
  const lis = sources
    .map(
      (s) => `<li><span class="kind">${escapeHtml(KIND_LABEL[s.kind] ?? s.kind)}</span><a class="print-url" href="${escapeHtml(s.url)}" rel="noopener">${escapeHtml(s.label)}</a>${s.note ? `<br><span class="muted">${escapeHtml(s.note)}</span>` : ''}</li>`,
    )
    .join('\n');
  const consultedLine = consulted ? `<p class="consulted">Références consultées le ${escapeHtml(consulted)}.</p>` : '';
  return `<div class="sources">
<h3>Sources et périmètre · ${refs}</h3>
<ul>
${lis}
</ul>
${consultedLine}
</div>`;
}

function renderStory(item: MagazineItem, rank: number, total: number, consulted: string, weekNumber: string): string {
  const theme = rank % 2 === 0 ? 'dark' : 'light';
  const id = slug(item, rank);
  const url = siteUrl(item.path);
  const confidence = item.confidence ? CONFIDENCE_LABEL[item.confidence] : '';
  const facts = (item.facts ?? []).map((f) => `<li>${escapeHtml(f)}</li>`).join('');
  return `<section class="sheet story ${theme}" id="${id}" aria-labelledby="${id}-titre">
<div class="inner">
<div class="copy">
<p class="eyebrow">${escapeHtml(item.category ?? '')} · ${pad2(rank)} / ${pad2(total)}</p>
<h2 id="${id}-titre">${escapeHtml(item.headline)}</h2>
${item.lead ? `<p class="lead">${escapeHtml(item.lead)}</p>` : ''}
<p class="body-text">${escapeHtml(item.description)}</p>
${url ? `<p class="actions"><a class="button secondary" href="${escapeHtml(url)}">${escapeHtml(ctaLabel(item.path))}</a></p>` : ''}
${renderSources(item, consulted)}
</div>
<aside class="stat-panel" aria-label="Le chiffre et sa nuance">
<p class="status">${confidence ? `<span class="badge">${escapeHtml(confidence)}</span>` : ''}${item.status ? `<span class="detail">${escapeHtml(item.status)}</span>` : ''}</p>
<p class="stat">${escapeHtml(item.stat)}</p>
<p class="stat-label">${escapeHtml(item.stat_label)}</p>
${facts ? `<ul class="facts">${facts}</ul>` : ''}
<div class="nuance">
<p class="eyebrow">La nuance qui compte</p>
<h3 class="nuance-title">${escapeHtml(item.nuance_title ?? '')}</h3>
<p>${escapeHtml(item.howto)}</p>
</div>
</aside>
<div class="story-foot"><span>BGM · Semaine ${escapeHtml(weekNumber)}</span><a href="#sommaire">Retour au sommaire ↑</a></div>
</div>
</section>`;
}

export function renderMagazineV2(draft: MagazineDraft): string {
  if (!draft.magazine) throw new Error('Cannot render: magazine is undefined');
  const { magazine, weekShort, week } = draft;
  const weekNumber = week.split('-w')[1] ?? '';
  const weekLabel = weekShort.replace(/^s/, 'S');
  const total = magazine.items.length;
  const canonical = `${MAGAZINE_BASE}/${weekShort}/`;
  const consulted = formatDayFr(magazine.consulted);
  const title = `BGM, Bruxelles, derrière les chiffres · Semaine ${weekNumber}`;
  const intro = magazine.intro ?? 'Ce qui change. Ce que l’on sait. Et ce que les chiffres ne disent pas.';

  const covers = magazine.items
    .map((item, i) => ({ item, rank: i + 1 }))
    .filter(({ item }) => item.cover)
    .slice(0, 3);
  const coverNumbers = covers.length
    ? `<ul class="cover-numbers">
${covers
  .map(
    ({ item, rank }) => `<li class="cover-number"><span class="eyebrow">${pad2(rank)} / ${escapeHtml(item.short ?? '')}</span><span class="n">${escapeHtml(item.stat)}</span><small>${escapeHtml(item.stat_label)}</small></li>`,
  )
  .join('\n')}
</ul>`
    : '';

  const toc = magazine.items
    .map(
      (item, i) => `<li><a class="toc-link" href="#${slug(item, i + 1)}"><span class="toc-rank">${pad2(i + 1)}</span><span><span class="toc-short">${escapeHtml(item.short ?? item.category ?? '')}</span><span class="toc-title">${escapeHtml(item.headline)}</span></span><span class="toc-stat">${escapeHtml(item.stat)}</span></a></li>`,
    )
    .join('\n');

  const stories = magazine.items.map((item, i) => renderStory(item, i + 1, total, consulted, weekNumber)).join('\n');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(magazine.tagline)}" />
<link rel="canonical" href="${canonical}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="Brussels Governance Monitor" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(magazine.tagline)}" />
<meta property="og:url" content="${canonical}" />
<meta property="og:locale" content="fr_BE" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="${GOOGLE_FONTS_HREF}" rel="stylesheet" />
<style>${MAGAZINE_V2_CSS}</style>
${umamiSnippet()}
</head>
<body>
<a class="skip" href="#sommaire">Aller au sommaire</a>
<header class="site-nav">
<a class="brand" href="${AUTHOR.siteBase}/fr"><strong>BGM</strong><span>Le magazine · ${escapeHtml(weekLabel)}</span></a>
<nav aria-label="Navigation du magazine"><ul>
<li><a href="#sommaire">Sommaire</a></li>
<li><a href="#comment-lire">Comment lire</a></li>
<li><a href="${AUTHOR.siteBase}/fr">Le site ↗</a></li>
</ul></nav>
</header>
<main class="magazine">
<section class="sheet cover dark" aria-labelledby="titre">
<div class="inner">
<p class="cover-meta"><span>Semaine ${escapeHtml(weekNumber)} · ${escapeHtml(magazine.period ?? '')}</span><span>${countLabel(total)} · Bruxelles</span></p>
<h1 id="titre">Bruxelles, derrière les chiffres.</h1>
<p class="intro">${escapeHtml(intro)}</p>
<p class="actions"><a class="button" href="#sommaire">Explorer les sujets ↓</a></p>
${coverNumbers}
</div>
</section>
<section class="sheet toc" id="sommaire" aria-labelledby="sommaire-titre">
<div class="inner">
<p class="eyebrow">Cette semaine</p>
<h2 id="sommaire-titre">Choisissez votre point d’entrée</h2>
<p class="muted">${escapeHtml(magazine.tagline)}</p>
<ol class="toc-list">
${toc}
</ol>
</div>
</section>
${stories}
<section class="sheet howto" id="comment-lire" aria-labelledby="comment-lire-titre">
<div class="inner">
<p class="eyebrow">Mode d’emploi</p>
<h2 id="comment-lire-titre">Comment lire ce magazine</h2>
<ol>
<li>Chaque sujet commence par ce qui change, puis ce que l’on sait, avec ses sources. La nuance, en fin de panneau, dit ce que le chiffre ne mesure pas.</li>
<li>Le statut du chiffre vient du niveau de confiance de la fiche sur le site : donnée officielle, estimation, ou fait rapporté par la presse et non confirmé.</li>
<li>Les sources sont typées : une source primaire est le document d’origine, une source secondaire le rapporte, une source tierce le commente.</li>
<li>Un lien par sujet vous mène à la fiche complète sur governance.brussels, qui est mise à jour quand le fait évolue.</li>
</ol>
</div>
</section>
<section class="sheet closing dark" aria-labelledby="cloture-titre">
<div class="inner closing-grid">
<div>
<p class="eyebrow">À suivre</p>
<h2 id="cloture-titre">${escapeHtml(magazine.closing_line)}</h2>
<p>${escapeHtml(AUTHOR.publication)} suit les décisions publiques à Bruxelles : faits, contexte, nuances. ${escapeHtml(AUTHOR.publisher)}.</p>
<p class="actions"><a class="button" href="${AUTHOR.siteBase}/fr">Aller sur governance.brussels</a> <a class="button secondary" href="${AUTHOR.siteBase}/fr/digest">Recevoir le digest</a></p>
</div>
<div>
<p class="eyebrow">Ce numéro</p>
<p class="muted">Semaine ${escapeHtml(weekNumber)}, ${escapeHtml(magazine.period ?? '')}. ${countLabel(total)}. ${consulted ? `Références consultées le ${escapeHtml(consulted)}.` : ''}</p>
<p class="muted">Adresse de ce numéro : <a href="${canonical}">${canonical}</a></p>
</div>
<p class="footerline">${escapeHtml(AUTHOR.publication)} · ${escapeHtml(AUTHOR.publisher)} · <a href="mailto:${AUTHOR.email}">${AUTHOR.email}</a></p>
</div>
</section>
</main>
</body>
</html>`;
}
