import type { MagazineItem } from './types';
import { AUTHOR } from './author';

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderItemPage(item: MagazineItem, rank: number, theme: 'light' | 'dark'): string {
  const statClass = item.stat.length > 4 ? 'stat-num small' : 'stat-num';
  const pathHref = item.path ? `${AUTHOR.siteBase}${item.path}` : null;
  const linkAttrs = `target="_blank" rel="noopener noreferrer"`;

  const pathEl = item.path
    ? `<a class="path path--link" href="${escapeHtml(pathHref!)}" ${linkAttrs}>${escapeHtml(item.path)}</a>`
    : '';
  const pillEl = item.pill
    ? item.path
      ? `<a class="pill pill--link" href="${escapeHtml(pathHref!)}" ${linkAttrs}>${escapeHtml(item.pill)}</a>`
      : `<div class="pill">${escapeHtml(item.pill)}</div>`
    : '';

  return `
      <section class="page ${theme}">
        <div class="item">
          <div class="ghost-rank">${String(rank).padStart(2, '0')}</div>
          <div class="col-left">
            ${item.category ? `<div class="category-tag">${escapeHtml(item.category)}</div>` : ''}
            <h2 class="headline">${escapeHtml(item.headline)}</h2>
            ${pathEl}
            <div class="rule"></div>
            <p class="desc">${escapeHtml(item.description)}</p>
          </div>
          <div class="col-right">
            <div class="stat-block">
              <div class="${statClass}">${escapeHtml(item.stat)}</div>
              <div class="stat-label">${escapeHtml(item.stat_label)}</div>
            </div>
            ${pillEl}
            <div class="callout">
              <div class="callout-label">Comment lire ce dossier</div>
              <p class="callout-text">${escapeHtml(item.howto)}</p>
            </div>
          </div>
        </div>
        <div class="page-meta">BGM · ${escapeHtml(item.category ?? '')} · P.${String(rank + 1).padStart(2, '0')}</div>
      </section>`;
}

export function renderBusinessCardPage(): string {
  return `
      <section class="page dark card-page">
        <div class="card">
          <p class="card-manifesto">${escapeHtml(AUTHOR.manifesto)}</p>
          <p class="card-signature">— ${escapeHtml(AUTHOR.name)}</p>
          <div class="card-rule"></div>
          <div class="card-publication">
            <div class="card-publication-name">${escapeHtml(AUTHOR.publication)}</div>
            <div class="card-publisher">${escapeHtml(AUTHOR.publisher)}</div>
          </div>
          <div class="card-offer">${escapeHtml(AUTHOR.offer)}</div>
          <div class="card-contact">
            <a href="mailto:${escapeHtml(AUTHOR.email)}">${escapeHtml(AUTHOR.email)}</a>
            <span class="card-contact-sep">·</span>
            <a href="${escapeHtml(AUTHOR.linkedinUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(AUTHOR.linkedinHandle)}</a>
          </div>
        </div>
        <div class="page-meta">BGM · Colophon</div>
      </section>`;
}

export const GOOGLE_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Source+Serif+4:ital,wght@0,300;0,400;0,600;1,300;1,400&family=IBM+Plex+Mono:wght@300;400;500&display=swap';

export const MAGAZINE_CSS = `
  *,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; width: 100%; overflow: hidden; }
  body {
    font-family: 'Source Serif 4', Georgia, serif;
    background: #f3f1ec;
    color: #1a1a1a;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .viewport { width: 100vw; height: 100vh; overflow: hidden; position: relative; }
  .track {
    display: flex;
    width: 100%;
    height: 100%;
    transition: transform 700ms cubic-bezier(.77,0,.175,1);
    will-change: transform;
  }
  .page {
    flex: 0 0 100vw;
    height: 100vh;
    position: relative;
    padding: 8vh 7vw 10vh 7vw;
    overflow: hidden;
  }

  .page.light { background: #f3f1ec; color: #1a1a1a; }
  .page.dark  { background: #111110; color: #e9e6df; }

  /* COVER */
  .cover { display: flex; flex-direction: column; justify-content: space-between; height: 100%; }
  .cover-top { display: flex; justify-content: space-between; align-items: flex-start; }
  .cover-issue { font-family: 'IBM Plex Mono', monospace; font-weight: 400; font-size: .9vw; letter-spacing: .22em; text-transform: uppercase; opacity: .4; }
  .cover-meta { font-family: 'IBM Plex Mono', monospace; font-size: .78vw; letter-spacing: .2em; text-transform: uppercase; opacity: .35; text-align: right; line-height: 1.6; }
  .cover-center { display: flex; flex-direction: column; justify-content: center; flex: 1; }
  .cover-title {
    font-family: 'Playfair Display', serif;
    font-weight: 900;
    font-size: 16vw;
    line-height: .88;
    letter-spacing: -.03em;
    margin-left: -.5vw;
  }
  .cover-tagline {
    font-family: 'Source Serif 4', serif;
    font-style: italic;
    font-weight: 400;
    font-size: 2vw;
    opacity: .7;
    margin-top: 3vh;
    max-width: 60%;
  }
  .cover-bottom { display: flex; justify-content: space-between; align-items: flex-end; }
  .cover-count {
    position: absolute;
    right: 5vw;
    bottom: 2vh;
    font-family: 'Playfair Display', serif;
    font-weight: 900;
    font-size: 28vw;
    line-height: .8;
    opacity: .05;
    pointer-events: none;
  }
  .cover-foot {
    font-family: 'IBM Plex Mono', monospace;
    font-size: .8vw;
    letter-spacing: .22em;
    text-transform: uppercase;
    opacity: .45;
  }

  /* ITEM PAGE */
  .item { display: grid; grid-template-columns: 55fr 45fr; height: 100%; gap: 0; position: relative; }
  .col-left {
    padding-right: 4vw;
    display: flex;
    flex-direction: column;
    justify-content: center;
    position: relative;
    z-index: 2;
  }
  .col-right {
    padding-left: 4vw;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4vh;
    border-left: 1px solid currentColor;
    position: relative;
  }
  .page.light .col-right { border-left-color: rgba(26,26,26,.1); }
  .page.dark  .col-right { border-left-color: rgba(233,230,223,.1); }

  .ghost-rank {
    position: absolute;
    top: 50%;
    left: -2vw;
    transform: translateY(-50%);
    font-family: 'Playfair Display', serif;
    font-weight: 900;
    font-size: 34vw;
    line-height: 1;
    opacity: .05;
    pointer-events: none;
    z-index: 1;
    letter-spacing: -.04em;
  }

  .category-tag {
    font-family: 'IBM Plex Mono', monospace;
    font-weight: 500;
    font-size: .85vw;
    letter-spacing: .22em;
    text-transform: uppercase;
    opacity: .5;
    margin-bottom: 2.5vh;
  }
  .headline {
    font-family: 'Playfair Display', serif;
    font-weight: 700;
    font-size: 5.2vw;
    line-height: 1.05;
    letter-spacing: -.02em;
    margin-bottom: 2.5vh;
  }
  .path {
    font-family: 'IBM Plex Mono', monospace;
    font-weight: 400;
    font-size: .95vw;
    opacity: .45;
    margin-bottom: 3vh;
    letter-spacing: -.01em;
  }
  a.path--link {
    color: inherit;
    text-decoration: none;
    display: block;
    transition: opacity .2s ease;
  }
  a.path--link:hover {
    opacity: .75;
    text-decoration: underline;
    text-underline-offset: 4px;
    text-decoration-thickness: 1px;
  }
  a.pill--link {
    color: inherit;
    text-decoration: none;
    display: inline-block;
    transition: opacity .2s ease, transform .2s ease;
  }
  a.pill--link:hover {
    opacity: 1;
    transform: translateY(-1px);
  }
  .rule {
    width: 3vw;
    height: 1.5px;
    background: currentColor;
    opacity: .35;
    margin-bottom: 3.5vh;
  }
  .desc {
    font-family: 'Source Serif 4', serif;
    font-weight: 300;
    font-size: max(17px, 1.5vw);
    line-height: 1.65;
    opacity: .85;
    max-width: 38vw;
    letter-spacing: .003em;
  }

  .stat-block { display: flex; flex-direction: column; }
  .stat-num {
    font-family: 'Playfair Display', serif;
    font-weight: 900;
    font-size: 6.8vw;
    line-height: 1;
    letter-spacing: -.03em;
    margin-bottom: 1.5vh;
  }
  .stat-num.small { font-size: 5.4vw; }
  .stat-label {
    font-family: 'IBM Plex Mono', monospace;
    font-weight: 400;
    font-size: .8vw;
    letter-spacing: .22em;
    text-transform: uppercase;
    opacity: .4;
  }
  .pill {
    font-family: 'IBM Plex Mono', monospace;
    font-weight: 400;
    font-size: .8vw;
    letter-spacing: .22em;
    text-transform: uppercase;
    border: 1px solid currentColor;
    padding: .9vh 1.2vw;
    align-self: flex-start;
  }
  .page.light .pill { opacity: .55; }
  .page.dark  .pill { opacity: .45; }

  .callout {
    border-left: 4px solid currentColor;
    padding: 2.5vh 2vw;
    max-width: 36vw;
  }
  .page.light .callout { background: rgba(26,26,26,.05); }
  .page.dark  .callout { background: rgba(233,230,223,.06); }
  .callout-label {
    font-family: 'IBM Plex Mono', monospace;
    font-weight: 500;
    font-size: .78vw;
    letter-spacing: .22em;
    text-transform: uppercase;
    opacity: .45;
    margin-bottom: 1.5vh;
  }
  .callout-text {
    font-family: 'Source Serif 4', serif;
    font-weight: 400;
    font-size: max(15px, 1.35vw);
    line-height: 1.65;
    opacity: .8;
  }

  .page-meta {
    position: absolute;
    bottom: 3vh;
    left: 7vw;
    font-family: 'IBM Plex Mono', monospace;
    font-size: .72vw;
    letter-spacing: .22em;
    text-transform: uppercase;
    opacity: .35;
  }

  /* BACK COVER */
  .back { display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; height: 100%; }
  .back-line {
    font-family: 'Playfair Display', serif;
    font-weight: 700;
    font-style: italic;
    font-size: 8vw;
    line-height: 1.05;
    letter-spacing: -.02em;
    margin-bottom: 4vh;
  }
  .back-tag {
    font-family: 'Source Serif 4', serif;
    font-weight: 300;
    font-style: italic;
    font-size: 1.6vw;
    opacity: .6;
    margin-bottom: 12vh;
    max-width: 50%;
  }
  .back-meta {
    font-family: 'IBM Plex Mono', monospace;
    font-size: .85vw;
    letter-spacing: .24em;
    text-transform: uppercase;
    opacity: .4;
  }

  /* BUSINESS CARD PAGE */
  .card-page {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  .card {
    max-width: 52vw;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4vh;
  }
  .card-manifesto {
    font-family: 'Source Serif 4', serif;
    font-style: italic;
    font-weight: 300;
    font-size: max(17px, 1.6vw);
    line-height: 1.65;
    opacity: .88;
  }
  .card-signature {
    font-family: 'Source Serif 4', serif;
    font-style: italic;
    font-weight: 400;
    font-size: max(15px, 1.25vw);
    opacity: .7;
    margin-top: -1.5vh;
  }
  .card-rule {
    width: 8vw;
    height: 1px;
    background: currentColor;
    opacity: .3;
  }
  .card-publication-name {
    font-family: 'Playfair Display', serif;
    font-weight: 700;
    font-size: max(18px, 1.5vw);
    line-height: 1.3;
    letter-spacing: -.01em;
  }
  .card-publisher {
    font-family: 'Source Serif 4', serif;
    font-weight: 300;
    font-size: max(14px, 1.05vw);
    opacity: .7;
    margin-top: .6vh;
  }
  .card-offer {
    font-family: 'IBM Plex Mono', monospace;
    font-weight: 400;
    font-size: max(11px, .82vw);
    letter-spacing: .16em;
    text-transform: uppercase;
    opacity: .55;
    line-height: 1.9;
    max-width: 48vw;
  }
  .card-contact {
    font-family: 'IBM Plex Mono', monospace;
    font-weight: 400;
    font-size: max(11px, .8vw);
    letter-spacing: .08em;
    opacity: .6;
  }
  .card-contact a {
    color: inherit;
    text-decoration: none;
    transition: opacity .2s ease;
  }
  .card-contact a:hover {
    opacity: 1;
    text-decoration: underline;
    text-underline-offset: 3px;
    text-decoration-thickness: 1px;
  }
  .card-contact-sep {
    margin: 0 1vw;
    opacity: .5;
  }

  /* NAV */
  .dots {
    position: fixed;
    bottom: 3.5vh;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 10px;
    z-index: 50;
    mix-blend-mode: difference;
  }
  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #888;
    transition: all .3s ease;
    cursor: pointer;
    border: none;
    padding: 0;
  }
  .dot.active { background: #fff; width: 22px; border-radius: 3px; }

  .nav-arrow {
    position: fixed;
    top: 50%;
    transform: translateY(-50%);
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    cursor: pointer;
    z-index: 40;
    mix-blend-mode: difference;
    color: #fff;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 22px;
    opacity: .5;
    transition: opacity .25s ease;
  }
  .nav-arrow:hover { opacity: 1; }
  .nav-arrow.prev { left: 2vw; }
  .nav-arrow.next { right: 2vw; }
  .nav-arrow.hidden { opacity: 0; pointer-events: none; }

  @media (max-width: 900px) {
    .item { grid-template-columns: 1fr; }
    .col-right { border-left: none; border-top: 1px solid currentColor; padding-left: 0; padding-top: 4vh; margin-top: 4vh; }
    .page.light .col-right { border-top-color: rgba(26,26,26,.1); }
    .page.dark  .col-right { border-top-color: rgba(233,230,223,.1); }
    .headline { font-size: 9vw; }
    .stat-num { font-size: 13vw; }
    .stat-num.small { font-size: 10vw; }
    .desc { max-width: 100%; font-size: 17px; }
    .callout { max-width: 100%; }
    .callout-text { font-size: 15px; }
    .cover-title { font-size: 22vw; }
    .cover-tagline { font-size: 4.5vw; max-width: 100%; }
    .back-line { font-size: 14vw; }
    .back-tag { font-size: 4vw; max-width: 80%; }
    .ghost-rank { font-size: 60vw; opacity: .04; }
    .category-tag, .path, .stat-label, .pill, .callout-label, .cover-issue, .cover-meta, .cover-foot, .page-meta, .back-meta { font-size: 11px; }
    .card { max-width: 86vw; gap: 3vh; }
    .card-manifesto { font-size: 16px; }
    .card-signature { font-size: 14px; }
    .card-publication-name { font-size: 22px; }
    .card-publisher { font-size: 13px; }
    .card-offer { font-size: 11px; max-width: 86vw; }
    .card-contact { font-size: 11px; }
    .card-contact-sep { margin: 0 8px; }
  }

  @media print {
    @page { size: A4 landscape; margin: 0; }
    html, body { overflow: visible !important; height: auto !important; }
    .viewport, .track { overflow: visible !important; height: auto !important; transform: none !important; display: block !important; }
    .page { flex: none !important; width: 100% !important; height: 100vh !important; page-break-after: always; page-break-inside: avoid; }
    .dots, .nav-arrow { display: none !important; }
  }
`;

export const MAGAZINE_JS = `
(() => {
  const track = document.getElementById('track');
  const pages = track.querySelectorAll('.page');
  const total = pages.length;
  const dotsEl = document.getElementById('dots');
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');
  let idx = 0;
  let lock = false;

  for (let i = 0; i < total; i++) {
    const b = document.createElement('button');
    b.className = 'dot' + (i === 0 ? ' active' : '');
    b.setAttribute('aria-label', 'Aller à la page ' + (i + 1));
    b.addEventListener('click', () => go(i));
    dotsEl.appendChild(b);
  }
  const dots = dotsEl.querySelectorAll('.dot');

  function go(i) {
    idx = Math.max(0, Math.min(total - 1, i));
    track.style.transform = 'translateX(-' + (idx * 100) + 'vw)';
    dots.forEach((d, n) => d.classList.toggle('active', n === idx));
    prevBtn.classList.toggle('hidden', idx === 0);
    nextBtn.classList.toggle('hidden', idx === total - 1);
    lock = true;
    setTimeout(() => { lock = false; }, 720);
  }

  prevBtn.addEventListener('click', () => go(idx - 1));
  nextBtn.addEventListener('click', () => go(idx + 1));

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); go(idx + 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); go(idx - 1); }
    else if (e.key === 'Home') { go(0); }
    else if (e.key === 'End') { go(total - 1); }
  });

  let wheelAcc = 0;
  window.addEventListener('wheel', (e) => {
    if (lock) return;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    wheelAcc += delta;
    if (wheelAcc > 30) { go(idx + 1); wheelAcc = 0; }
    else if (wheelAcc < -30) { go(idx - 1); wheelAcc = 0; }
  }, { passive: true });

  let touchStartX = 0;
  window.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  window.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) { dx < 0 ? go(idx + 1) : go(idx - 1); }
  }, { passive: true });

  prevBtn.classList.add('hidden');
})();
`;
