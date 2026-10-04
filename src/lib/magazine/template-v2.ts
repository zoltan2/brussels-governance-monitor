/**
 * Feuille de style du gabarit v2 du magazine (maquette de Zoltán du 27/09/2026),
 * avec les corrections actées ce jour-là : palette du site (ardoise, bleu foncé,
 * blanc, ambre ; jamais rouge ni vert), lecture verticale par feuilles, sommaire,
 * sources par sujet, nuance titrée. Les couleurs sont des jetons : les changer
 * ici change tout le magazine.
 */
export const MAGAZINE_V2_CSS = `
:root{
  --paper:#ffffff;--paper-2:#f8fafc;--ink:#0f172a;--ink-2:#334155;--muted:#64748b;--line:#e2e8f0;
  --accent:#b45309;--accent-soft:#fef3c7;--dark:#172554;--dark-2:#1e3a8a;--on-dark:#f8fafc;--on-dark-muted:#cbd5e1;
  --serif:'Source Serif 4',Georgia,'Times New Roman',serif;--display:'Playfair Display',Georgia,serif;--sans:'Inter',Arial,Helvetica,sans-serif;--mono:'IBM Plex Mono',ui-monospace,monospace;
  --measure:38rem;--gutter:clamp(1rem,4vw,3rem);
  color-scheme:light;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
body{margin:0;background:var(--paper-2);color:var(--ink);font-family:var(--serif);font-size:1.0625rem;line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:inherit}
.skip{position:absolute;left:-999px;top:0;background:var(--accent);color:#fff;padding:.5rem 1rem;font-family:var(--sans)}
.skip:focus{left:1rem;top:1rem;z-index:10}
.site-nav{position:sticky;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.75rem var(--gutter);background:rgba(255,255,255,.92);backdrop-filter:blur(6px);border-bottom:1px solid var(--line);font-family:var(--sans);font-size:.875rem}
.brand{display:flex;align-items:baseline;gap:.75rem;text-decoration:none}
.brand strong{font-family:var(--display);font-size:1.25rem;letter-spacing:.02em}
.brand span{color:var(--muted)}
.site-nav ul{list-style:none;display:flex;gap:1.25rem;margin:0;padding:0}
.site-nav a{text-decoration:none;color:var(--ink-2)}
.site-nav a:hover,.site-nav a:focus-visible{color:var(--accent);text-decoration:underline}
.sheet{padding:clamp(2.5rem,7vh,5rem) var(--gutter);border-bottom:1px solid var(--line)}
.sheet .inner{max-width:72rem;margin:0 auto}
.sheet.dark{background:var(--dark);color:var(--on-dark);border-color:var(--dark-2)}
.sheet.dark .muted,.sheet.dark .eyebrow{color:var(--on-dark-muted)}
.eyebrow{font-family:var(--sans);font-size:.75rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin:0 0 .75rem}
.muted{color:var(--muted)}
.cover h1{font-family:var(--display);font-weight:700;font-size:clamp(2.25rem,6vw,4.5rem);line-height:1.05;margin:0 0 1rem;max-width:18ch}
.cover .intro{font-size:clamp(1.125rem,2vw,1.5rem);max-width:var(--measure);margin:0 0 2rem;color:var(--on-dark-muted)}
.cover-meta{display:flex;flex-wrap:wrap;gap:1rem 2rem;font-family:var(--sans);font-size:.875rem;color:var(--on-dark-muted);margin-bottom:2.5rem}
.cover-numbers{display:grid;grid-template-columns:repeat(auto-fit,minmax(14rem,1fr));gap:1.5rem;margin:2.5rem 0 0;padding:0;list-style:none}
.cover-number{border-top:2px solid var(--accent);padding-top:.75rem}
.cover-number .n{font-family:var(--display);font-size:clamp(2rem,4vw,3rem);line-height:1;display:block;margin:.25rem 0}
.cover-number small{font-family:var(--sans);font-size:.875rem;color:var(--on-dark-muted)}
.button{display:inline-block;font-family:var(--sans);font-weight:600;text-decoration:none;padding:.7rem 1.1rem;border-radius:.375rem;background:var(--accent);color:#fff;border:1px solid var(--accent)}
.button.secondary{background:transparent;color:inherit;border-color:currentColor}
.button:hover,.button:focus-visible{filter:brightness(1.08);text-decoration:underline}
.toc h2{font-family:var(--display);font-size:clamp(1.5rem,3vw,2.25rem);margin:0 0 .25rem}
.toc-list{list-style:none;margin:1.5rem 0 0;padding:0;display:grid;gap:0;border-top:1px solid var(--line)}
.toc-list li{border-bottom:1px solid var(--line)}
.toc-link{display:grid;grid-template-columns:3rem 1fr auto;gap:1rem;align-items:baseline;padding:1rem 0;text-decoration:none}
.toc-link:hover .toc-title,.toc-link:focus-visible .toc-title{text-decoration:underline;color:var(--accent)}
.toc-rank{font-family:var(--mono);color:var(--muted)}
.toc-short{font-family:var(--sans);font-size:.75rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);display:block}
.toc-stat{font-family:var(--display);font-size:1.5rem;white-space:nowrap}
.story .inner{display:grid;grid-template-columns:minmax(0,1fr);gap:2rem}
@media(min-width:900px){.story .inner{grid-template-columns:minmax(0,1.4fr) minmax(16rem,.8fr);gap:3rem}}
.story h2{font-family:var(--display);font-size:clamp(1.75rem,3.6vw,2.75rem);line-height:1.12;margin:0 0 .75rem;max-width:22ch}
.lead{font-size:1.25rem;line-height:1.5;color:var(--ink-2);margin:0 0 1.25rem;max-width:var(--measure)}
.sheet.dark .lead{color:var(--on-dark-muted)}
.body-text{max-width:var(--measure);margin:0 0 1.25rem}
.story .actions{margin:1.25rem 0 2rem}
.sources{font-family:var(--sans);font-size:.875rem;border-top:1px solid var(--line);padding-top:1rem;max-width:var(--measure)}
.sheet.dark .sources{border-color:var(--dark-2)}
.sources h3{font-size:.75rem;letter-spacing:.12em;text-transform:uppercase;margin:0 0 .75rem;color:var(--muted)}
.sources ul{list-style:none;margin:0;padding:0}
.sources li{margin:0 0 .75rem}
.sources a{word-break:break-all}
.kind{display:inline-block;font-size:.7rem;letter-spacing:.08em;text-transform:uppercase;padding:.1rem .4rem;border:1px solid currentColor;border-radius:.25rem;margin-right:.5rem;vertical-align:middle}
.consulted{color:var(--muted);margin:.5rem 0 0}
.stat-panel{align-self:start;background:var(--paper);border:1px solid var(--line);border-radius:.5rem;padding:1.5rem}
.sheet.dark .stat-panel{background:var(--dark-2);border-color:var(--dark-2)}
.status{font-family:var(--sans);font-size:.75rem;letter-spacing:.1em;text-transform:uppercase;margin:0 0 .5rem;display:flex;flex-wrap:wrap;gap:.5rem;align-items:center}
.status .badge{background:var(--accent-soft);color:var(--accent);padding:.15rem .5rem;border-radius:.25rem;letter-spacing:.06em}
.sheet.dark .status .badge{background:rgba(254,243,199,.15);color:#fde68a}
.status .detail{color:var(--muted);text-transform:none;letter-spacing:0;font-size:.8125rem}
.stat{font-family:var(--display);font-size:clamp(2.5rem,5vw,3.75rem);line-height:1;margin:.25rem 0 .5rem}
.stat-label{font-family:var(--sans);font-size:.9375rem;margin:0 0 1rem;color:var(--ink-2)}
.sheet.dark .stat-label{color:var(--on-dark-muted)}
.facts{list-style:none;margin:0;padding:0;font-family:var(--sans);font-size:.875rem;border-top:1px solid var(--line)}
.sheet.dark .facts{border-color:rgba(255,255,255,.15)}
.facts li{padding:.5rem 0;border-bottom:1px solid var(--line)}
.sheet.dark .facts li{border-color:rgba(255,255,255,.15)}
.nuance{margin-top:1.5rem;padding-top:1.25rem;border-top:2px solid var(--accent)}
.nuance .eyebrow{color:var(--accent)}
.nuance-title{font-family:var(--display);font-size:1.25rem;margin:0 0 .5rem}
.nuance p{margin:0;font-size:.9375rem}
.story-foot{grid-column:1 / -1;display:flex;justify-content:space-between;gap:1rem;font-family:var(--sans);font-size:.8125rem;color:var(--muted);margin-top:1rem}
.story-foot a{text-decoration:none}
.story-foot a:hover,.story-foot a:focus-visible{text-decoration:underline}
.howto h2,.closing h2{font-family:var(--display);font-size:clamp(1.5rem,3vw,2.25rem);margin:0 0 1rem}
.howto ol{max-width:var(--measure);padding-left:1.25rem}
.howto li{margin-bottom:.5rem}
.closing-grid{display:grid;gap:2rem}
@media(min-width:800px){.closing-grid{grid-template-columns:1fr 1fr}}
.closing p{max-width:var(--measure)}
.footerline{font-family:var(--sans);font-size:.8125rem;color:var(--on-dark-muted);border-top:1px solid var(--dark-2);padding-top:1rem;margin-top:2rem}
.footerline a{color:inherit}
.cover-tagline{font-family:var(--serif);font-style:italic;font-size:1.0625rem;color:var(--on-dark-muted);max-width:var(--measure);margin:0 0 1.75rem}
.site-note{font-family:var(--sans);font-size:.8125rem;margin:0}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.card-inner{max-width:46rem}
.card-manifesto{font-family:var(--display);font-style:italic;font-size:clamp(1.25rem,2.4vw,1.75rem);line-height:1.4;margin:0 0 1.25rem}
.card-signature{font-family:var(--sans);font-weight:600;letter-spacing:.04em;margin:0 0 1.5rem;padding-top:1rem;border-top:2px solid var(--accent);display:inline-block}
.card-publication{margin:0 0 .75rem;line-height:1.5}
.card-offer{font-family:var(--sans);font-size:.9375rem;color:var(--on-dark-muted);margin:0 0 1rem}
.card-contact{font-family:var(--sans);font-size:.9375rem;margin:0}
.card-contact a{color:#fde68a;text-decoration:none}
.card-contact a:hover,.card-contact a:focus-visible{text-decoration:underline}
.a-lundi{font-family:var(--display);font-style:italic;font-size:1.5rem;margin:.5rem 0 1.25rem}
.closing .footerline{color:var(--muted);border-color:var(--line)}
@media(max-width:760px){.toc-link{grid-template-columns:2.25rem 1fr}.toc-stat{grid-column:2;font-size:1.25rem}.site-nav ul{gap:.75rem}}
@media print{.site-nav,.skip,.story-foot,.actions{display:none}.sheet{break-inside:avoid;border:0;padding:1.5rem 0}.sheet.dark{background:#fff;color:#000}.print-url::after{content:" (" attr(href) ")";font-size:.8em}}
`;
