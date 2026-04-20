import type { MagazineDraft } from './types';
import {
  escapeHtml,
  renderItemPage,
  renderBusinessCardPage,
  GOOGLE_FONTS_HREF,
  MAGAZINE_CSS,
  MAGAZINE_JS,
} from './template';

export function renderMagazine(draft: MagazineDraft): string {
  if (!draft.magazine) {
    throw new Error('Cannot render: magazine is undefined');
  }
  const { magazine, weekShort, week } = draft;
  const weekLabel = weekShort.replace(/^s/, 'S');
  const itemPages = magazine.items
    .map((item, i) => renderItemPage(item, i + 1, i % 2 === 0 ? 'light' : 'dark'))
    .join('\n');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>BGM — Digest ${escapeHtml(weekLabel)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="${GOOGLE_FONTS_HREF}" rel="stylesheet" />
<style>${MAGAZINE_CSS}</style>
</head>
<body>
  <div class="viewport">
    <div class="track" id="track">
      <section class="page dark">
        <div class="cover">
          <div class="cover-top">
            <span class="cover-issue">Digest ${escapeHtml(weekLabel)} · ${escapeHtml(week)}</span>
            <span class="cover-meta">Brussels Governance Monitor<br>Advice That SRL</span>
          </div>
          <div class="cover-center">
            <h1 class="cover-title">BGM</h1>
            <p class="cover-tagline">${escapeHtml(magazine.tagline)}</p>
          </div>
          <div class="cover-bottom">
            <span class="cover-foot">${magazine.items.length} signaux · lecture horizontale →</span>
          </div>
          <div class="cover-count">${String(magazine.items.length).padStart(2, '0')}</div>
        </div>
      </section>
${itemPages}
      <section class="page dark">
        <div class="back">
          <h2 class="back-line">${escapeHtml(magazine.closing_line)}</h2>
          <div class="back-meta">BGM · Digest ${escapeHtml(weekLabel)}</div>
        </div>
      </section>
${renderBusinessCardPage()}
    </div>
    <button class="nav-arrow prev" id="prev" aria-label="Page précédente">←</button>
    <button class="nav-arrow next" id="next" aria-label="Page suivante">→</button>
    <div class="dots" id="dots"></div>
  </div>
<script>${MAGAZINE_JS}</script>
</body>
</html>`;
}
