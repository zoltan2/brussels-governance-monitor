import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { getRedirectsConfig } from './src/lib/redirects-301';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  async redirects() {
    // 301 permanents pour la migration des slugs localisés (spec 2026-05-03 §3.4-3.5).
    // Table dans src/lib/redirects-301.ts. Initialement vide ; se remplit dossier par
    // dossier au fur et à mesure des migrations éditoriales.
    return getRedirectsConfig();
  },
  async rewrites() {
    // Proxy Umami through our own origin so ad blockers cannot identify it by CDN hostname.
    // Browser sees requests to /u/… (same-origin); Vercel forwards to cloud.umami.is.
    return [
      { source: '/u/script.js', destination: 'https://cloud.umami.is/script.js' },
      { source: '/u/api/:path*', destination: 'https://cloud.umami.is/api/:path*' },
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
              "connect-src 'self'",
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
