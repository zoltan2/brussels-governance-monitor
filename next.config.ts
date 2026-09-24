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
      // /u/* → Umami analytics (self-hosted; bypasses ad blocker filter lists)
      { source: '/u/script.js', destination: 'https://analytics.governance.brussels/script.js' },
      { source: '/u/api/:path*', destination: 'https://analytics.governance.brussels/api/:path*' },
    ];
  },
  async headers() {
    return [
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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'", // unsafe-eval: Velite MDX new Function(); wasm-unsafe-eval: Pagefind WASM
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
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
