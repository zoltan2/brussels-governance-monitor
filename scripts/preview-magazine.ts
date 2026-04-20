/**
 * preview-magazine.ts
 *
 * Reads the latest `content/digest/2026-wNN.fr.mdx` that contains a `magazine:`
 * frontmatter block and generates a self-contained HTML preview in `.preview/magazine.html`.
 *
 * Usage:
 *   npx tsx scripts/preview-magazine.ts
 *
 * Output:
 *   .preview/magazine.html   ← open in any browser
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import matter from 'gray-matter';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MagazineItem {
  category?: string;
  headline: string;
  path?: string;
  stat: string;
  stat_label: string;
  pill?: string;
  description: string;
  howto: string;
}

interface MagazineBlock {
  tagline: string;
  closing_line: string;
  items: MagazineItem[];
}

interface DigestFrontmatter {
  week: string;
  lang: string;
  title: string;
  generated_at: string;
  magazine?: MagazineBlock;
}

// ─── Find latest FR digest with magazine block ────────────────────────────────

function findLatestFrDigest(contentDir: string): { file: string; data: DigestFrontmatter } {
  const digestDir = join(contentDir, 'digest');
  const files = readdirSync(digestDir)
    .filter((f) => f.endsWith('.fr.mdx'))
    .sort() // lexicographic sort: 2026-w16 > 2026-w15 etc.
    .reverse();

  for (const file of files) {
    const raw = readFileSync(join(digestDir, file), 'utf-8');
    const { data } = matter(raw);
    if ((data as DigestFrontmatter).magazine) {
      return { file, data: data as DigestFrontmatter };
    }
  }

  throw new Error('No FR digest with a magazine: block found in content/digest/');
}

// ─── HTML generation ──────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function weekLabel(week: string): string {
  // "2026-w16" → "Semaine 16 · 2026"
  const m = week.match(/^(\d{4})-w(\d+)$/);
  if (!m) return week;
  return `Semaine ${parseInt(m[2], 10)} · ${m[1]}`;
}

function generateItemPage(item: MagazineItem, rank: number, total: number, dark: boolean): string {
  const bg = dark ? '#111' : '#fafafa';
  const fg = dark ? '#f0f0f0' : '#111';
  const dividerColor = dark ? 'rgba(240,240,240,0.1)' : 'rgba(17,17,17,0.1)';
  const ruleFg = dark ? 'rgba(240,240,240,0.25)' : 'rgba(17,17,17,0.25)';
  const calloutBg = dark ? 'rgba(240,240,240,0.06)' : 'rgba(17,17,17,0.05)';
  const calloutBorder = dark ? 'rgba(240,240,240,0.35)' : 'rgba(17,17,17,0.35)';
  const fgMuted = dark ? 'rgba(240,240,240,0.5)' : 'rgba(17,17,17,0.5)';
  const fgBody = dark ? 'rgba(240,240,240,0.85)' : 'rgba(17,17,17,0.85)';
  const pillBorder = dark ? 'rgba(240,240,240,0.45)' : 'rgba(17,17,17,0.45)';

  const pageNum = String(rank + 1).padStart(2, '0');

  return `
    <section class="page" style="background:${bg};color:${fg};">
      <div class="item-grid">
        <!-- Left column -->
        <div class="left-col">
          <div class="ghost-rank" style="color:${fg};">${rank}</div>
          ${item.category ? `<div class="category-tag" style="color:${fgMuted};">${escapeHtml(item.category)}</div>` : ''}
          <h2 class="headline" style="color:${fg};">${escapeHtml(item.headline)}</h2>
          ${item.path ? `<div class="item-path" style="color:${fgMuted};">${escapeHtml(item.path)}</div>` : ''}
          <hr class="thin-rule" style="border-color:${ruleFg};" />
          <p class="description" style="color:${fgBody};">${escapeHtml(item.description)}</p>
        </div>
        <!-- Right column -->
        <div class="right-col" style="border-left:1px solid ${dividerColor};">
          <div class="stat-number" style="color:${fg};">${escapeHtml(item.stat)}</div>
          <div class="stat-label" style="color:${fgMuted};">${escapeHtml(item.stat_label)}</div>
          ${item.pill ? `<div class="pill" style="border-color:${pillBorder};color:${fgMuted};">${escapeHtml(item.pill)}</div>` : ''}
          <div class="callout" style="background:${calloutBg};border-left:4px solid ${calloutBorder};">
            <div class="callout-label" style="color:${fgMuted};">COMMENT LIRE CE SIGNAL</div>
            <p class="callout-text" style="color:${fgBody};">${escapeHtml(item.howto)}</p>
          </div>
        </div>
      </div>
      <div class="page-meta" style="color:${fgMuted};">BGM Magazine · P.${pageNum} / ${String(total + 2).padStart(2, '0')}</div>
    </section>`;
}

function generateHtml(data: DigestFrontmatter): string {
  const mag = data.magazine!;
  const items = mag.items;
  const totalPages = items.length + 2; // cover + items + back

  const coverPage = `
    <section class="page" style="background:#111;color:#f0f0f0;">
      <div class="cover-content">
        <div class="cover-issue" style="color:rgba(240,240,240,0.4);font-family:'IBM Plex Mono',monospace;font-size:clamp(11px,0.85vw,14px);letter-spacing:.15em;text-transform:uppercase;">
          Brussels Governance Monitor &nbsp;·&nbsp; ${escapeHtml(weekLabel(data.week))}
        </div>
        <h1 class="cover-title">COMMIT</h1>
        <p class="cover-tagline">${escapeHtml(mag.tagline)}</p>
        <div class="cover-ghost-count" style="color:rgba(240,240,240,0.05);">${items.length}</div>
      </div>
      <div class="page-meta" style="color:rgba(240,240,240,0.3);">BGM Magazine · P.01 / ${String(totalPages).padStart(2, '0')}</div>
    </section>`;

  const itemPages = items
    .map((item, i) => generateItemPage(item, i + 1, items.length, i % 2 === 0))
    .join('');

  const backPage = `
    <section class="page" style="background:#111;color:#f0f0f0;">
      <div class="back-content">
        <p class="back-closing">${escapeHtml(mag.closing_line)}</p>
        <p class="back-tagline" style="color:rgba(240,240,240,0.45);font-family:'Source Serif 4',serif;font-style:italic;font-size:clamp(15px,1.4vw,22px);margin-top:2vh;">${escapeHtml(mag.tagline)}</p>
        <div class="back-meta" style="color:rgba(240,240,240,0.3);font-family:'IBM Plex Mono',monospace;font-size:clamp(10px,0.75vw,13px);letter-spacing:.12em;text-transform:uppercase;margin-top:4vh;">
          Brussels Governance Monitor &nbsp;·&nbsp; ${escapeHtml(data.title)}
        </div>
      </div>
      <div class="page-meta" style="color:rgba(240,240,240,0.3);">BGM Magazine · P.${String(totalPages).padStart(2, '0')} / ${String(totalPages).padStart(2, '0')}</div>
    </section>`;

  const dots = Array.from({ length: totalPages }, (_, i) =>
    `<div class="dot" data-page="${i}"></div>`,
  ).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>BGM Magazine — ${escapeHtml(weekLabel(data.week))}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Source+Serif+4:ital,wght@0,300;0,400;0,600;1,300;1,400&family=IBM+Plex+Mono:wght@300;400;500&display=swap" rel="stylesheet" />
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html, body {
    width: 100%; height: 100%;
    overflow: hidden;
    background: #111;
  }

  /* ── Track ── */
  #track {
    display: flex;
    width: 100%;
    height: 100vh;
    transition: transform .6s cubic-bezier(.77,0,.18,1);
    will-change: transform;
  }

  /* ── Pages ── */
  .page {
    position: relative;
    flex: 0 0 100vw;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    padding: 6vh 5vw 10vh;
  }

  /* ── Cover ── */
  .cover-content {
    display: flex;
    flex-direction: column;
    justify-content: center;
    height: 100%;
    position: relative;
  }
  .cover-issue {
    margin-bottom: 3vh;
  }
  .cover-title {
    font-family: 'Playfair Display', serif;
    font-weight: 900;
    font-size: clamp(72px, 16vw, 220px);
    line-height: 0.92;
    letter-spacing: -.02em;
    color: #f0f0f0;
  }
  .cover-tagline {
    font-family: 'Source Serif 4', serif;
    font-style: italic;
    font-weight: 300;
    font-size: clamp(16px, 1.6vw, 26px);
    color: rgba(240,240,240,0.7);
    margin-top: 3vh;
    max-width: 55vw;
  }
  .cover-ghost-count {
    position: absolute;
    bottom: -4vh;
    right: 0;
    font-family: 'Playfair Display', serif;
    font-weight: 900;
    font-size: clamp(120px, 28vw, 380px);
    line-height: 1;
    pointer-events: none;
    user-select: none;
  }

  /* ── Item grid ── */
  .item-grid {
    display: grid;
    grid-template-columns: 55fr 45fr;
    gap: 0 3vw;
    height: 100%;
    align-items: start;
    padding-top: 2vh;
  }
  .left-col {
    position: relative;
    padding-right: 1vw;
    display: flex;
    flex-direction: column;
    gap: 1.6vh;
  }
  .right-col {
    padding-left: 3vw;
    display: flex;
    flex-direction: column;
    gap: 2vh;
  }

  .ghost-rank {
    position: absolute;
    top: -3vh;
    left: -1vw;
    font-family: 'Playfair Display', serif;
    font-weight: 900;
    font-size: clamp(80px, 18vw, 260px);
    line-height: 1;
    opacity: 0.05;
    pointer-events: none;
    user-select: none;
    z-index: 0;
  }

  .category-tag {
    font-family: 'IBM Plex Mono', monospace;
    font-size: clamp(10px, 0.85vw, 13px);
    letter-spacing: .22em;
    text-transform: uppercase;
    position: relative;
    z-index: 1;
  }

  .headline {
    font-family: 'Playfair Display', serif;
    font-weight: 700;
    font-size: clamp(32px, 5.2vw, 80px);
    line-height: 1.05;
    position: relative;
    z-index: 1;
  }

  .item-path {
    font-family: 'IBM Plex Mono', monospace;
    font-size: clamp(10px, 0.95vw, 14px);
    letter-spacing: .05em;
    position: relative;
    z-index: 1;
  }

  .thin-rule {
    border: none;
    border-top: 1.5px solid;
    width: 3vw;
    margin: 0;
    position: relative;
    z-index: 1;
  }

  .description {
    font-family: 'Source Serif 4', serif;
    font-weight: 300;
    font-size: clamp(15px, 1.5vw, 22px);
    line-height: 1.65;
    position: relative;
    z-index: 1;
  }

  .stat-number {
    font-family: 'Playfair Display', serif;
    font-weight: 900;
    font-size: clamp(48px, 6.8vw, 100px);
    line-height: 1;
  }

  .stat-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: clamp(10px, 0.8vw, 13px);
    letter-spacing: .18em;
    text-transform: uppercase;
    margin-top: -.5vh;
  }

  .pill {
    display: inline-block;
    font-family: 'IBM Plex Mono', monospace;
    font-size: clamp(10px, 0.8vw, 13px);
    letter-spacing: .08em;
    border: 1px solid;
    padding: .3em .7em;
    border-radius: 2px;
    width: fit-content;
  }

  .callout {
    padding: 1.6vh 1.4vw;
    border-radius: 2px;
  }
  .callout-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: clamp(9px, 0.78vw, 12px);
    letter-spacing: .18em;
    text-transform: uppercase;
    margin-bottom: 1vh;
  }
  .callout-text {
    font-family: 'Source Serif 4', serif;
    font-weight: 400;
    font-size: clamp(13px, 1.35vw, 19px);
    line-height: 1.65;
  }

  /* ── Back cover ── */
  .back-content {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    height: 100%;
  }
  .back-closing {
    font-family: 'Playfair Display', serif;
    font-weight: 700;
    font-size: clamp(28px, 5vw, 72px);
    color: #f0f0f0;
    line-height: 1.1;
  }

  /* ── Page meta ── */
  .page-meta {
    position: absolute;
    bottom: 2.5vh;
    left: 5vw;
    font-family: 'IBM Plex Mono', monospace;
    font-size: clamp(9px, 0.72vw, 12px);
    letter-spacing: .12em;
    text-transform: uppercase;
  }

  /* ── Navigation dots ── */
  #dots {
    position: fixed;
    bottom: 2.5vh;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 8px;
    z-index: 100;
    mix-blend-mode: difference;
  }
  .dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #f0f0f0;
    opacity: .3;
    cursor: pointer;
    transition: opacity .25s, transform .25s;
  }
  .dot.active { opacity: 1; transform: scale(1.35); }

  /* ── Arrow hints ── */
  .arrow {
    position: fixed;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(240,240,240,0.08);
    border: 1px solid rgba(240,240,240,0.15);
    color: #f0f0f0;
    width: 40px; height: 40px;
    border-radius: 50%;
    cursor: pointer;
    z-index: 100;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
    transition: background .2s, opacity .3s;
  }
  .arrow:hover { background: rgba(240,240,240,0.18); }
  #arrow-prev { left: 1.5vw; }
  #arrow-next { right: 1.5vw; }
  .arrow.hidden { opacity: 0; pointer-events: none; }
</style>
</head>
<body>
<div id="track">
  ${coverPage}
  ${itemPages}
  ${backPage}
</div>

<div id="dots">${dots}</div>
<button class="arrow hidden" id="arrow-prev" aria-label="Page précédente">&#8592;</button>
<button class="arrow" id="arrow-next" aria-label="Page suivante">&#8594;</button>

<script>
(function () {
  const track = document.getElementById('track');
  const dots = Array.from(document.querySelectorAll('.dot'));
  const btnPrev = document.getElementById('arrow-prev');
  const btnNext = document.getElementById('arrow-next');
  const total = ${totalPages};
  let current = 0;
  let locked = false;

  function go(n) {
    if (n < 0 || n >= total) return;
    current = n;
    track.style.transform = 'translateX(-' + (current * 100) + 'vw)';
    dots.forEach((d, i) => d.classList.toggle('active', i === current));
    btnPrev.classList.toggle('hidden', current === 0);
    btnNext.classList.toggle('hidden', current === total - 1);
  }

  go(0);

  // Dot clicks
  dots.forEach((d, i) => d.addEventListener('click', () => go(i)));

  // Arrow buttons
  btnPrev.addEventListener('click', () => go(current - 1));
  btnNext.addEventListener('click', () => go(current + 1));

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') go(current + 1);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') go(current - 1);
  });

  // Wheel / trackpad
  let wheelTimer;
  document.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (locked) return;
    locked = true;
    if (e.deltaX > 30 || e.deltaY > 30) go(current + 1);
    if (e.deltaX < -30 || e.deltaY < -30) go(current - 1);
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => { locked = false; }, 700);
  }, { passive: false });

  // Touch swipe
  let touchStartX = 0;
  document.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  document.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) go(current + (dx < 0 ? 1 : -1));
  }, { passive: true });
})();
</script>
</body>
</html>`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const root = resolve(process.cwd());
  const contentDir = join(root, 'content');
  const previewDir = join(root, '.preview');

  const { data } = findLatestFrDigest(contentDir);
  const mag = data.magazine!;
  const weekMatch = data.week.match(/^(\d{4})-w(\d+)$/);
  const weekShort = weekMatch ? `s${parseInt(weekMatch[2], 10)}` : data.week;

  const html = generateHtml(data);

  mkdirSync(previewDir, { recursive: true });
  const outPath = join(previewDir, 'magazine.html');
  writeFileSync(outPath, html, 'utf-8');

  console.log(`[magazine] Preview for ${weekShort} (${mag.items.length} items) → ${outPath}`);

  // Attempt to open in browser (best-effort, non-blocking)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { execSync } = require('child_process') as typeof import('child_process');
    execSync(`open "${outPath}"`, { stdio: 'ignore' });
  } catch {
    // Silently ignore if open fails (CI, non-macOS, etc.)
  }
}

main();
