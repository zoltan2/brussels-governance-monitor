import { AUTHOR, AUTHOR_TEXT } from './author';
import { MAGAZINE_LOCALES, STRINGS, SOURCE_LOCALE, cardRefForPath, editionUrl, type MagazineLocale, type MagazineStrings } from './locales';
import type { MagazineDraft, MagazineItem } from './types';
import { escapeHtml, GOOGLE_FONTS_HREF, umamiSnippet } from './template';
import { MAGAZINE_V2_CSS } from './template-v2';

/**
 * Gabarit v2 du magazine : couverture, sommaire, une feuille par sujet
 * (chapeau, corps, lien vers la fiche, panneau du chiffre avec statut et
 * repères, nuance titrée), « Comment lire », carte de visite, « À lundi
 * prochain ». Lecture verticale, liens d'ancrage, aucun script hors mesure.
 *
 * Décision de Zoltán du 04/10/2026 : le magazine est la porte d'entrée vers
 * governance.brussels. Il ne montre ni source, ni lien vers un média : chaque
 * sujet renvoie à sa fiche, où vivent les sources et le détail.
 */

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function siteUrl(path: string | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${AUTHOR.siteBase}${path}`;
}

function ctaLabel(path: string | undefined, s: MagazineStrings): string {
  const kind = cardRefForPath(path)?.kind;
  if (kind === 'dossiers' || kind === 'domains' || kind === 'communes' || kind === 'sectors') return s.cta[kind];
  return s.cta.site;
}

function slug(item: MagazineItem, rank: number): string {
  const base = (item.short ?? item.headline)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `sujet-${pad2(rank)}-${base || 'sujet'}`;
}

/** Vrai si `line` contient déjà tous les mots de quatre lettres ou plus de `phrase`. */
export function repeats(line: string, phrase: string): boolean {
  const words = (text: string) =>
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/[^a-z]+/)
      .filter((w) => w.length >= 4);
  const have = new Set(words(line));
  const wanted = words(phrase);
  return wanted.length > 0 && wanted.every((w) => have.has(w));
}

/** Options de rendu : langue de l'édition et éditions parues cette semaine (pour les liens entre elles). */
export interface RenderOptions {
  locale?: MagazineLocale;
  editions?: readonly MagazineLocale[];
}

function renderStory(item: MagazineItem, rank: number, total: number, weekNumber: string, s: MagazineStrings): string {
  const theme = rank % 2 === 0 ? 'dark' : 'light';
  const id = slug(item, rank);
  const url = siteUrl(item.path);
  const confidence = item.confidence ? s.confidence[item.confidence] : '';
  const facts = (item.facts ?? []).map((f) => `<li>${escapeHtml(f)}</li>`).join('');
  return `<section class="sheet story ${theme}" id="${id}" aria-labelledby="${id}-titre">
<div class="inner">
<span class="rank-mark" aria-hidden="true">${pad2(rank)}</span>
<div class="copy">
<p class="eyebrow">${escapeHtml(item.category ?? '')} · ${pad2(rank)} / ${pad2(total)}</p>
<h2 id="${id}-titre">${escapeHtml(item.headline)}</h2>
${item.lead ? `<p class="lead">${escapeHtml(item.lead)}</p>` : ''}
<p class="body-text">${escapeHtml(item.description)}</p>
${url ? `<p class="actions"><a class="button secondary" href="${escapeHtml(url)}">${escapeHtml(ctaLabel(item.path, s))}${s.ctaSuffix}</a></p>` : ''}
<p class="site-note muted">${s.siteNote}</p>
</div>
<aside class="${theme === 'light' ? 'stat-panel inverse' : 'stat-panel'}" aria-label="${s.statPanelLabel}">
${confidence ? `<p class="status"><span class="badge">${escapeHtml(confidence)}</span></p>` : ''}
<p class="stat">${escapeHtml(item.stat)}</p>
<p class="stat-label">${escapeHtml(item.stat_label)}</p>
${facts ? `<ul class="facts">${facts}</ul>` : ''}
<div class="nuance">
<p class="eyebrow">${s.nuanceEyebrow}</p>
<h3 class="nuance-title">${escapeHtml(item.nuance_title ?? '')}</h3>
<p>${escapeHtml(item.howto)}</p>
</div>
</aside>
<div class="story-foot"><span>BGM · ${s.week(escapeHtml(weekNumber))}</span><a href="#sommaire">${s.backToToc}</a></div>
</div>
</section>`;
}

export function renderMagazineV2(draft: MagazineDraft, opts: RenderOptions = {}): string {
  if (!draft.magazine) throw new Error('Cannot render: magazine is undefined');
  const { magazine, weekShort, week } = draft;
  const weekNumber = week.split('-w')[1] ?? '';
  const weekLabel = weekShort.replace(/^s/, 'S');
  const total = magazine.items.length;
  const locale = opts.locale ?? SOURCE_LOCALE;
  const s = STRINGS[locale];
  const author = AUTHOR_TEXT[locale];
  const site = `${AUTHOR.siteBase}/${locale}`;
  const canonical = editionUrl(locale, weekShort);
  const title = s.pageTitle(weekNumber);
  // « À lundi prochain. » sous la phrase de clôture, sauf si celle-ci le dit
  // déjà (« Retour lundi prochain. ») : les deux lignes se répétaient.
  const farewell = repeats(magazine.closing_line, s.seeYou) ? '' : `<p class="a-lundi">${s.seeYou}</p>\n`;
  const intro = magazine.intro ?? s.defaultIntro;
  // Liens entre éditions : seulement quand la semaine en compte plusieurs. Un
  // numéro paru en français seul garde exactement sa page d'avant.
  const editions = MAGAZINE_LOCALES.filter((l) => (opts.editions ?? [locale]).includes(l));
  const several = editions.length > 1;
  const alternates = several
    ? editions.map((l) => `<link rel="alternate" hreflang="${STRINGS[l].htmlLang}" href="${editionUrl(l, weekShort)}" />`).join('\n') + '\n'
    : '';
  const switcher = several
    ? `<li class="editions" aria-label="${s.editionsLabel}">${editions
        .map((l) =>
          l === locale
            ? `<span aria-current="true">${l.toUpperCase()}</span>`
            : `<a href="${editionUrl(l, weekShort)}" hreflang="${STRINGS[l].htmlLang}" lang="${STRINGS[l].htmlLang}" title="${STRINGS[l].languageName}">${l.toUpperCase()}</a>`,
        )
        .join(' ')}</li>\n`
    : '';

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
      (item, i) => `<li><a class="toc-link" href="#${slug(item, i + 1)}"><span class="toc-rank">${pad2(i + 1)}</span><span><span class="toc-short">${escapeHtml(item.short ?? item.category ?? '')}</span><span class="toc-title">${escapeHtml(item.headline)}</span></span><span class="toc-stat">${escapeHtml(item.stat)}<small> ${escapeHtml(item.stat_label)}</small></span></a></li>`,
    )
    .join('\n');

  const stories = magazine.items.map((item, i) => renderStory(item, i + 1, total, weekNumber, s)).join('\n');

  return `<!DOCTYPE html>
<html lang="${s.htmlLang}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(magazine.tagline)}" />
<link rel="canonical" href="${canonical}" />
${alternates}<meta property="og:type" content="article" />
<meta property="og:site_name" content="Brussels Governance Monitor" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(magazine.tagline)}" />
<meta property="og:url" content="${canonical}" />
<meta property="og:locale" content="${s.ogLocale}" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="${GOOGLE_FONTS_HREF}" rel="stylesheet" />
<style>${MAGAZINE_V2_CSS}</style>
${umamiSnippet()}
</head>
<body>
<a class="skip" href="#sommaire">${s.skipToToc}</a>
<header class="site-nav">
<a class="brand" href="${site}"><strong>BGM</strong><span><span class="brand-long">${s.brandLong}</span>${escapeHtml(weekLabel)}</span></a>
<nav aria-label="${s.navLabel}"><ul>
<li><a href="#sommaire">${s.navToc}</a></li>
<li><a href="#comment-lire">${s.navHowto}</a></li>
<li${several ? ' class="nav-site"' : ''}><a href="${site}">${s.navSite}</a></li>
${switcher}</ul></nav>
</header>
<main class="magazine">
<section class="sheet cover dark" aria-labelledby="titre">
<div class="inner cover-grid">
<div class="cover-copy">
<p class="cover-issue"><span class="dot" aria-hidden="true"></span>${s.coverIssue(escapeHtml(weekNumber))}</p>
<h1 id="titre">${s.coverTitle}</h1>
<p class="intro">${escapeHtml(intro)}</p>
<p class="cover-tagline">${escapeHtml(magazine.tagline)}</p>
<p class="cover-meta"><span>${escapeHtml(magazine.period ?? '')}</span><span>${s.countLabel(total)} · ${s.place}</span></p>
<p class="actions"><a class="button" href="#sommaire">${s.explore}</a></p>
</div>
<div class="cover-side">
${coverNumbers}
</div>
<span class="cover-watermark" aria-hidden="true">${escapeHtml(weekNumber)}</span>
</div>
</section>
<section class="sheet toc" id="sommaire" aria-labelledby="sommaire-titre">
<div class="inner">
<p class="eyebrow">${s.tocEyebrow}</p>
<h2 id="sommaire-titre">${s.tocTitle}</h2>
<p class="muted">${s.tocBlurb}</p>
<ol class="toc-list">
${toc}
</ol>
</div>
</section>
${stories}
<section class="sheet howto" id="comment-lire" aria-labelledby="comment-lire-titre">
<div class="inner">
<p class="eyebrow">${s.howtoEyebrow}</p>
<h2 id="comment-lire-titre">${s.howtoTitle}</h2>
<ol>
${s.howtoSteps.map((step) => `<li>${step}</li>`).join('\n')}
</ol>
</div>
</section>
<section class="sheet card dark" aria-labelledby="carte-titre">
<div class="inner card-inner">
<p class="eyebrow">${s.cardEyebrow}</p>
<h2 id="carte-titre" class="sr-only">${s.cardTitle}</h2>
<p class="card-manifesto">${escapeHtml(author.manifesto)}</p>
<p class="card-signature">${escapeHtml(AUTHOR.name)}</p>
<p class="card-publication"><strong>${escapeHtml(AUTHOR.publication)}</strong><br>${escapeHtml(author.publisher)}</p>
<p class="card-offer">${escapeHtml(author.offer)}</p>
<p class="card-contact"><a href="mailto:${AUTHOR.email}">${AUTHOR.email}</a> · <a href="${AUTHOR.linkedinUrl}" rel="noopener">${AUTHOR.linkedinHandle}</a></p>
</div>
</section>
<section class="sheet closing" aria-labelledby="cloture-titre">
<div class="inner closing-grid">
<div>
<p class="eyebrow">${s.closingEyebrow}</p>
<h2 id="cloture-titre">${escapeHtml(magazine.closing_line)}</h2>
${farewell}<p class="actions"><a class="button" href="${site}">${s.goToSite}</a> <a class="button secondary" href="${site}/subscribe">${s.subscribe}</a></p>
</div>
<div>
<p class="eyebrow">${s.issueEyebrow}</p>
<p class="muted">${s.issueLine(escapeHtml(weekNumber), escapeHtml(magazine.period ?? ''), s.countLabel(total))}</p>
<p class="muted">${s.issueAddress} <a href="${canonical}">${canonical}</a></p>
<p class="footerline">${s.footer(escapeHtml(AUTHOR.publication))}</p>
</div>
</div>
</section>
</main>
</body>
</html>`;
}
