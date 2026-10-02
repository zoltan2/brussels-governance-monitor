import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { getRedirectsConfig } from './src/lib/redirects-301';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Self-host Docker (SELF_HOST=1, posé par le Dockerfile AU BUILD) : image
// autonome `.next/standalone` + images non optimisées (pas de sharp dans le
// runner). Sur Vercel, SELF_HOST est absent → ces clés restent undefined et le
// comportement de prod (build Vercel, optimisation d'images) est INCHANGÉ.
const selfHostConfig: NextConfig =
  process.env.SELF_HOST === '1'
    ? { output: 'standalone', images: { unoptimized: true } }
    : {};

const nextConfig: NextConfig = {
  ...selfHostConfig,
  // Les données de Velite sont LUES SUR DISQUE à l'exécution (src/lib/collections-velite.ts),
  // plus importées : un import les recopiait dans deux modules serveur de 20 Mo et
  // remplissait le tas de Node (41 arrêts mémoire le 01/10/2026). La sortie autonome
  // ne contient que les fichiers tracés. Turbopack trace déjà cette lecture de
  // lui-même (build sans cette ligne essayé le 02/10/2026 : `.velite/` était recopié
  // en entier) ; la ligne rend la copie indépendante de cette détection, qui tient
  // à la forme du `path.join` dans le module. Sans la copie, chaque page régénérée
  // lèverait une erreur : `scripts/controle-apres-build.ts` vérifie qu'elle est là
  // et complète, et fait échouer le build de l'image sinon.
  outputFileTracingIncludes: { '/*': ['./.velite/*.json'] },
  poweredByHeader: false,
  async redirects() {
    // Redirections permanentes de toute page publiée dont l'URL change (spec
    // 2026-05-03 §3.4-3.5). Table dans src/lib/redirects-301.ts, ordre conservé :
    // Next applique la première entrée qui correspond. Contrôlée en CI par
    // scripts/content-lint/slug-redirects.ts.
    return getRedirectsConfig();
  },
  async rewrites() {
    // Proxy routes: browser sees same-origin requests, Vercel forwards to external services.
    // MANDATORY: every prefix used here MUST also be listed in src/lib/proxy-paths.ts
    // so the i18n middleware (src/proxy.ts) bypasses locale-prefixing for these paths.
    // Forgetting that step causes a 307 redirect loop that silently drops all proxied requests.
    return [
      // /u/* → Umami analytics (self-hosted; bypasses ad blocker filter lists).
      // Seul le traceur est reecrit. Les evenements (`POST /u/api/send`) passent
      // par le relais `src/app/u/api/send/route.ts`, qui ne transmet ni cookie ni
      // en-tete superflu. L'ancienne reecriture `/u/api/:path*` exposait toute
      // l'API d'Umami (connexion, administration) sous ce domaine et y relayait
      // les cookies du site (revue red team du 28/09/2026). Verrouille par
      // src/lib/analytics-host.test.ts.
      // En production, Caddy intercepte `/u/*` AVANT l'application : ce bloc ne
      // sert qu'au developpement et a un deploiement sans Caddy.
      { source: '/u/script.js', destination: 'https://analytics.governance.brussels/script.js' },
    ];
  },
  async headers() {
    return [
      // Sondage lecteurs : une page par session, jamais mise en cache, jamais
      // indexée (src/app/[locale]/sondage/page.tsx).
      ...['/fr/sondage', '/nl/enquete'].map((source) => ({
        source,
        headers: [
          { key: 'Cache-Control', value: 'private, no-store' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      })),
      {
        source: '/(.*)',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // 'unsafe-eval' reste INDISPENSABLE en production : les fiches rendent
              // leur MDX dans le NAVIGATEUR (`src/components/mdx-content.tsx` est
              // 'use client' et appelle `new Function(code)` via `renderMdx`).
              // Le reserver aux routes des fiches ne marche pas : la CSP est celle
              // du document CHARGE, et une navigation cote client de l'accueil vers
              // une fiche garde la politique de l'accueil, donc la fiche planterait.
              // Le retirer suppose de rendre ce MDX cote serveur, comme les
              // dossiers (`DossierMdxContent`). Verifie par `next start` le 28/09.
              // 'wasm-unsafe-eval' : Pagefind (WASM).
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self'",
              // Les deux jeux quotidiens sont joués NATIVEMENT dans le panneau de jeux
              // (src/components/stuut-game.tsx, amai-game.tsx) et lisent l'API de chaque
              // jeu. `'self'` est une correspondance EXACTE de schéma, hôte et port : un
              // sous-domaine n'en fait pas partie, d'où les deux origines explicites.
              // Sans elles, les jeux afficheraient leur écran d'erreur sans que rien ne
              // casse ailleurs (src/lib/csp-jeux.test.ts verrouille la liste).
              "connect-src 'self' https://stuut.governance.brussels https://amai.governance.brussels",
              // Plus aucun cadre n'est encadré par le site : pas de frame-src, les
              // cadres retombent sur `default-src 'self'`.
              // Ci-dessous : qui peut nous encadrer, NOUS. À ne pas confondre avec ce
              // que nous encadrons lors d'un prochain durcissement.
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              'upgrade-insecure-requests',
              // Violations journalisees par src/app/api/csp-report/route.ts (sans
              // donnee personnelle). `report-uri` SEUL, volontairement : des qu'une
              // politique porte aussi `report-to`, Chromium ignore `report-uri` et
              // passe par la Reporting API, dont aucun rapport n'est arrive lors de
              // l'essai sous `next start` le 28/09 (90 s d'attente), alors que
              // `report-uri` seul a livre le sien aussitot. La route lit les deux
              // formats si l'on ajoute `report-to` plus tard.
              'report-uri /api/csp-report',
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
