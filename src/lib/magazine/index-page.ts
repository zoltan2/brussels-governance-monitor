/**
 * Root index page for magazine.governance.brussels.
 *
 * Different paradigm from the issue pages: this is a normal vertically
 * scrollable landing page (not the immersive horizontal viewport), serving
 * as the canonical entry point with hero, latest issue, archive, and about.
 *
 * i18n-ready: all user-facing strings live in STRINGS keyed by IndexLocale.
 * Today only `fr` is wired through `buildMagazine` — adding NL/EN/DE later
 * means populating STRINGS[locale] and writing the file at e.g.
 * `docs/magazine/nl/index.html`.
 */
import { escapeHtml, GOOGLE_FONTS_HREF } from './template';
import { AUTHOR } from './author';

export type IndexLocale = 'fr' | 'nl' | 'en' | 'de';

export interface WeekMeta {
  weekShort: string; // e.g. "s17"
  weekLabel: string; // e.g. "S17"
  dateRange?: string; // e.g. "20 — 26 avril 2026"
  tagline?: string;
  itemCount?: number;
}

interface IndexStrings {
  htmlLang: string;
  pageTitle: string;
  publicationKicker: string;
  publisherTag: string;
  heroTagline: string;
  heroBlurb: string;
  scrollCue: string;
  latestSection: string;
  latestKicker: string;
  latestRead: string;
  archiveSection: string;
  archiveEmpty: string;
  aboutSection: string;
  aboutBody: string;
  siteCta: string;
  contactKicker: string;
  colophon: string;
}

const STRINGS: Partial<Record<IndexLocale, IndexStrings>> = {
  fr: {
    htmlLang: 'fr',
    pageTitle: 'BGM Magazine — Brussels Governance Monitor',
    publicationKicker: 'Magazine hebdomadaire',
    publisherTag: 'Édité par Zoltán Jánosi',
    heroTagline: 'Une semaine bruxelloise, en huit signaux.',
    heroBlurb:
      'Chaque lundi, le digest du Brussels Governance Monitor distille la semaine institutionnelle bruxelloise en huit signaux. Une lecture horizontale, conçue pour cinq minutes — sans bruit ni parti pris.',
    scrollCue: 'Découvrir',
    latestSection: 'Dernier numéro',
    latestKicker: 'À lire cette semaine',
    latestRead: 'Lire le digest',
    archiveSection: 'Archives',
    archiveEmpty: 'Aucun numéro publié pour le moment.',
    aboutSection: 'Le projet',
    aboutBody:
      'Le Brussels Governance Monitor (BGM) suit en continu treize domaines de gouvernance, vingt et un dossiers transversaux et dix-neuf communes. Le digest hebdomadaire en condense la trajectoire — institutionnelle, sobre, sourcée. Pour la version complète, les fiches détaillées et le radar quotidien, rendez-vous sur le site principal.',
    siteCta: 'Aller sur governance.brussels',
    contactKicker: 'Contact',
    colophon:
      'BGM est édité par Advice That SRL (Bruxelles). Toute reproduction ou citation doit mentionner la source. Les données et analyses sont publiées sous licence source-available — voir governance.brussels/legal.',
  },
};

function resolveStrings(locale: IndexLocale): IndexStrings {
  return STRINGS[locale] ?? STRINGS.fr!;
}

export function renderIndexPage(
  weeks: WeekMeta[],
  locale: IndexLocale = 'fr',
): string {
  const t = resolveStrings(locale);
  const latest = weeks[0];
  const archive = weeks.slice(latest ? 1 : 0);

  const latestBlock = latest
    ? `
        <article class="latest">
          <div class="latest-kicker">${escapeHtml(t.latestKicker)}</div>
          <div class="latest-card">
            <div class="latest-card-rank">${escapeHtml(latest.weekLabel)}</div>
            <div class="latest-card-body">
              <div class="latest-card-meta">${escapeHtml(latest.dateRange ?? '')}</div>
              ${latest.tagline ? `<p class="latest-card-tagline">${escapeHtml(latest.tagline)}</p>` : ''}
              ${latest.itemCount ? `<div class="latest-card-count">${latest.itemCount} signaux</div>` : ''}
            </div>
            <a class="latest-card-cta" href="./${escapeHtml(latest.weekShort)}/" aria-label="${escapeHtml(t.latestRead)}">
              <span>${escapeHtml(t.latestRead)}</span>
              <span class="arrow" aria-hidden="true">→</span>
            </a>
          </div>
        </article>`
    : '';

  const archiveBlock =
    archive.length > 0
      ? `
        <section class="archive">
          <h2 class="section-title">${escapeHtml(t.archiveSection)}</h2>
          <ul class="archive-list">
${archive
  .map(
    (w) => `            <li class="archive-item">
              <a href="./${escapeHtml(w.weekShort)}/" class="archive-link">
                <span class="archive-rank">${escapeHtml(w.weekLabel)}</span>
                <span class="archive-meta">
                  <span class="archive-dates">${escapeHtml(w.dateRange ?? '—')}</span>
                  ${w.tagline ? `<span class="archive-tagline">${escapeHtml(w.tagline)}</span>` : ''}
                </span>
                <span class="archive-arrow" aria-hidden="true">→</span>
              </a>
            </li>`,
  )
  .join('\n')}
          </ul>
        </section>`
      : `
        <section class="archive">
          <h2 class="section-title">${escapeHtml(t.archiveSection)}</h2>
          <p class="archive-empty">${escapeHtml(t.archiveEmpty)}</p>
        </section>`;

  return `<!DOCTYPE html>
<html lang="${escapeHtml(t.htmlLang)}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(t.pageTitle)}</title>
<meta name="description" content="${escapeHtml(t.heroBlurb)}" />
<meta property="og:title" content="${escapeHtml(t.pageTitle)}" />
<meta property="og:description" content="${escapeHtml(t.heroTagline)}" />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://magazine.governance.brussels/" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="${GOOGLE_FONTS_HREF}" rel="stylesheet" />
<style>${INDEX_CSS}</style>
</head>
<body>
  <header class="topbar">
    <div class="topbar-inner">
      <span class="kicker">${escapeHtml(t.publicationKicker)}</span>
      <span class="kicker kicker-right">${escapeHtml(t.publisherTag)}</span>
    </div>
  </header>

  <main>
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-mark">BGM</div>
        <p class="hero-publication">Brussels Governance Monitor</p>
        <h1 class="hero-tagline">${escapeHtml(t.heroTagline)}</h1>
        <p class="hero-blurb">${escapeHtml(t.heroBlurb)}</p>
        <a class="hero-cue" href="#dernier-numero">
          <span>${escapeHtml(t.scrollCue)}</span>
          <span class="hero-cue-arrow" aria-hidden="true">↓</span>
        </a>
      </div>
    </section>

    <section class="latest-section" id="dernier-numero">
      <h2 class="section-title">${escapeHtml(t.latestSection)}</h2>
      ${latestBlock}
    </section>

    ${archiveBlock}

    <section class="about">
      <h2 class="section-title">${escapeHtml(t.aboutSection)}</h2>
      <p class="about-body">${escapeHtml(t.aboutBody)}</p>
      <a class="about-cta" href="${escapeHtml(AUTHOR.siteBase)}" target="_blank" rel="noopener noreferrer">
        <span>${escapeHtml(t.siteCta)}</span>
        <span class="arrow" aria-hidden="true">→</span>
      </a>
    </section>

    <section class="contact">
      <h2 class="section-title">${escapeHtml(t.contactKicker)}</h2>
      <ul class="contact-list">
        <li>
          <span class="contact-label">Email</span>
          <a href="mailto:${escapeHtml(AUTHOR.email)}">${escapeHtml(AUTHOR.email)}</a>
        </li>
        <li>
          <span class="contact-label">LinkedIn</span>
          <a href="${escapeHtml(AUTHOR.linkedinUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(AUTHOR.linkedinHandle)}</a>
        </li>
      </ul>
    </section>
  </main>

  <footer class="colophon">
    <div class="colophon-inner">
      <p class="colophon-text">${escapeHtml(t.colophon)}</p>
    </div>
  </footer>
</body>
</html>`;
}

const INDEX_CSS = `
  *,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body {
    font-family: 'Source Serif 4', Georgia, serif;
    background: #f3f1ec;
    color: #1a1a1a;
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    font-size: 17px;
  }
  a { color: inherit; text-decoration: none; }

  .topbar {
    position: sticky;
    top: 0;
    background: rgba(243, 241, 236, 0.92);
    backdrop-filter: saturate(140%) blur(8px);
    -webkit-backdrop-filter: saturate(140%) blur(8px);
    border-bottom: 1px solid rgba(26, 26, 26, 0.08);
    z-index: 10;
  }
  .topbar-inner {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0.9rem 1.6rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  .kicker {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 0.72rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgba(26, 26, 26, 0.55);
  }
  .kicker-right { text-align: right; }

  .hero {
    padding: 9rem 1.6rem 7rem;
    border-bottom: 1px solid rgba(26, 26, 26, 0.08);
  }
  .hero-inner {
    max-width: 820px;
    margin: 0 auto;
  }
  .hero-mark {
    font-family: 'Playfair Display', Georgia, serif;
    font-weight: 900;
    font-size: clamp(6rem, 18vw, 13rem);
    line-height: 0.85;
    letter-spacing: -0.04em;
    margin-bottom: 1.4rem;
  }
  .hero-publication {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 0.78rem;
    letter-spacing: 0.32em;
    text-transform: uppercase;
    color: rgba(26, 26, 26, 0.6);
    margin-bottom: 2.2rem;
  }
  .hero-tagline {
    font-family: 'Playfair Display', Georgia, serif;
    font-weight: 400;
    font-style: italic;
    font-size: clamp(1.7rem, 3.6vw, 2.6rem);
    line-height: 1.18;
    letter-spacing: -0.005em;
    margin-bottom: 1.8rem;
    max-width: 18ch;
  }
  .hero-blurb {
    font-size: 1.08rem;
    color: rgba(26, 26, 26, 0.78);
    max-width: 56ch;
    margin-bottom: 3rem;
  }
  .hero-cue {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 0.78rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgba(26, 26, 26, 0.7);
    border-bottom: 1px solid rgba(26, 26, 26, 0.25);
    padding-bottom: 0.35rem;
    transition: color 200ms, border-color 200ms;
  }
  .hero-cue:hover {
    color: #1a1a1a;
    border-bottom-color: #1a1a1a;
  }
  .hero-cue-arrow { font-size: 0.95rem; }

  main > section + section {
    border-top: 1px solid rgba(26, 26, 26, 0.08);
  }
  .latest-section,
  .archive,
  .about,
  .contact {
    padding: 4.5rem 1.6rem;
    max-width: 1100px;
    margin: 0 auto;
  }

  .section-title {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 0.78rem;
    letter-spacing: 0.32em;
    text-transform: uppercase;
    color: rgba(26, 26, 26, 0.55);
    margin-bottom: 2.4rem;
    font-weight: 400;
  }

  .latest-kicker {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 0.72rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgba(26, 26, 26, 0.5);
    margin-bottom: 1rem;
  }
  .latest-card {
    background: #1a1a1a;
    color: #f3f1ec;
    border-radius: 4px;
    padding: 3rem 3rem 2.2rem;
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 2.5rem;
    align-items: center;
  }
  .latest-card-rank {
    font-family: 'Playfair Display', Georgia, serif;
    font-weight: 900;
    font-size: clamp(3.5rem, 8vw, 6rem);
    line-height: 0.85;
    letter-spacing: -0.03em;
  }
  .latest-card-body {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .latest-card-meta {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 0.78rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgba(243, 241, 236, 0.6);
  }
  .latest-card-tagline {
    font-family: 'Playfair Display', Georgia, serif;
    font-weight: 400;
    font-style: italic;
    font-size: 1.45rem;
    line-height: 1.25;
  }
  .latest-card-count {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 0.7rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgba(243, 241, 236, 0.5);
  }
  .latest-card-cta {
    display: inline-flex;
    align-items: center;
    gap: 0.7rem;
    padding: 0.8rem 1.4rem;
    border: 1px solid rgba(243, 241, 236, 0.4);
    border-radius: 999px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 0.78rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #f3f1ec;
    transition: background 220ms, color 220ms, border-color 220ms;
    white-space: nowrap;
  }
  .latest-card-cta:hover {
    background: #f3f1ec;
    color: #1a1a1a;
    border-color: #f3f1ec;
  }
  .latest-card-cta .arrow { font-size: 1rem; }

  .archive-list {
    list-style: none;
    border-top: 1px solid rgba(26, 26, 26, 0.12);
  }
  .archive-item { border-bottom: 1px solid rgba(26, 26, 26, 0.12); }
  .archive-link {
    display: grid;
    grid-template-columns: 6rem 1fr auto;
    gap: 2rem;
    align-items: baseline;
    padding: 1.4rem 0;
    transition: background 180ms;
  }
  .archive-link:hover { background: rgba(26, 26, 26, 0.03); }
  .archive-rank {
    font-family: 'Playfair Display', Georgia, serif;
    font-weight: 700;
    font-size: 1.6rem;
    letter-spacing: -0.02em;
  }
  .archive-meta { display: flex; flex-direction: column; gap: 0.3rem; }
  .archive-dates {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 0.78rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(26, 26, 26, 0.65);
  }
  .archive-tagline {
    font-family: 'Source Serif 4', Georgia, serif;
    font-style: italic;
    color: rgba(26, 26, 26, 0.78);
  }
  .archive-arrow {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 1.1rem;
    color: rgba(26, 26, 26, 0.5);
    transition: transform 200ms, color 200ms;
  }
  .archive-link:hover .archive-arrow {
    color: #1a1a1a;
    transform: translateX(4px);
  }
  .archive-empty {
    color: rgba(26, 26, 26, 0.6);
    font-style: italic;
  }

  .about-body {
    font-size: 1.08rem;
    color: rgba(26, 26, 26, 0.82);
    max-width: 62ch;
    margin-bottom: 2rem;
  }
  .about-cta {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 0.78rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    border-bottom: 1px solid rgba(26, 26, 26, 0.3);
    padding-bottom: 0.35rem;
    transition: border-color 200ms;
  }
  .about-cta:hover { border-bottom-color: #1a1a1a; }
  .about-cta .arrow { font-size: 0.95rem; }

  .contact-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-width: 36rem;
  }
  .contact-list li {
    display: grid;
    grid-template-columns: 6rem 1fr;
    gap: 1.4rem;
    align-items: baseline;
    padding-bottom: 0.9rem;
    border-bottom: 1px solid rgba(26, 26, 26, 0.1);
  }
  .contact-label {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 0.72rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgba(26, 26, 26, 0.55);
  }
  .contact-list a {
    font-family: 'Source Serif 4', Georgia, serif;
    border-bottom: 1px solid transparent;
    transition: border-color 200ms;
  }
  .contact-list a:hover { border-bottom-color: #1a1a1a; }

  .colophon {
    border-top: 1px solid rgba(26, 26, 26, 0.08);
    padding: 2.5rem 1.6rem;
    background: rgba(26, 26, 26, 0.03);
  }
  .colophon-inner {
    max-width: 1100px;
    margin: 0 auto;
  }
  .colophon-text {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 0.74rem;
    line-height: 1.7;
    letter-spacing: 0.06em;
    color: rgba(26, 26, 26, 0.55);
    max-width: 70ch;
  }

  @media (max-width: 720px) {
    body { font-size: 16px; }
    .hero { padding: 5rem 1.2rem 4rem; }
    .latest-section, .archive, .about, .contact { padding: 3rem 1.2rem; }
    .latest-card {
      grid-template-columns: 1fr;
      gap: 1.6rem;
      padding: 2rem 1.6rem;
    }
    .latest-card-cta { justify-self: start; }
    .archive-link {
      grid-template-columns: 4rem 1fr auto;
      gap: 1rem;
    }
  }
`;
