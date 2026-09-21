# Security Policy

## Supported Versions

Brussels Governance Monitor is a continuously deployed web application. There are
no versioned releases — the `main` branch is the only supported version, and
production tracks it automatically.

| Branch | Supported          |
| ------ | ------------------ |
| `main` | :white_check_mark: |
| other  | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT open a public issue.** Security issues must be reported privately.
2. **Email:** [contact@governance.brussels](mailto:contact@governance.brussels)
   (see also `/.well-known/security.txt`)
3. **Include:**
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to expect

- **Acknowledgement** within 48 hours
- **Assessment** within 7 days
- **Fix or mitigation** as soon as practical, depending on severity
- **Credit** in the fix commit (unless you prefer anonymity)

### Scope

In scope:

- Authentication and session handling on the admin area (`/{locale}/admin`, `/{locale}/review`)
- Authorization and CSRF on the API routes under `/api/`
- **Denial of service and cost-amplification** against any endpoint that sends
  email, writes to the repository, or calls a paid third-party API — in
  particular the chatbot at `/api/chat`
- Subscriber data exposure: enumeration, token forgery or replay, IDOR on
  subscription preferences
- Payment flow integrity (Stripe checkout and access granting)
- XSS via content injection (MDX, JSON-LD, chatbot output)
- Information disclosure (API keys, secrets, internal paths)
- Security headers and Content Security Policy misconfiguration
- Dependency vulnerabilities with exploitable impact

Out of scope:

- Vulnerabilities in third-party services themselves (GitHub, Cloudflare,
  Hetzner, Resend, Stripe, Upstash, Anthropic) — report those to the vendor
- Social engineering
- Issues requiring physical access to a device
- Volumetric network floods against the CDN edge

## Security Architecture

This section describes what actually runs, so that reports are calibrated
against the real attack surface.

- **Runtime**: Next.js 16 (App Router) running as a Node.js server from a
  standalone Docker image. **Not a static site.**
- **Hosting**: self-hosted on a Hetzner VPS (Nuremberg), behind Caddy as reverse
  proxy and Cloudflare as CDN and WAF. TLS terminates at Cloudflare.
  Migrated from Vercel on 2026-07-19; Vercel was abandoned on 2026-09-08.
- **Server surface**: ~35 API routes under `src/app/api/`, covering
  subscriptions, the weekly digest, an LLM chatbot, Stripe checkout, scheduled
  jobs and an authenticated admin area.
- **Authentication**: NextAuth v5 (Credentials provider, single admin account,
  bcrypt hash, JWT session). Admin pages and privileged API routes each enforce
  their own server-side session check; the middleware does **not** do it.
- **Storage**: SQLite on the VPS and Upstash Redis (chat telemetry, votes,
  preorder log). Subscriber records live in Resend.
- **Third parties reached from the server**: Resend (email), Stripe (payments),
  Anthropic (chatbot), Upstash (key-value store).
- **Content**: MDX compiled by Velite at build time, but **evaluated in the
  browser** by `src/components/mdx-content.tsx` (`new Function`), which is why
  the CSP still needs `unsafe-eval`.
- **Dependencies**: monitored via Dependabot (npm, GitHub Actions, Docker).
  GitHub Actions and the Docker base image are pinned by digest.
- **Headers**: set in `next.config.ts` (HSTS, CSP, X-Frame-Options,
  X-Content-Type-Options, Referrer-Policy, Permissions-Policy). Note that
  responses proxied through `rewrites()` (`/u/*`, Umami) carry the upstream's
  headers, not these.
- **Secrets**: none in the repository. Environment variables via `.env.local`
  (gitignored) and the VPS environment.

*Last reviewed: 2026-09-21.*
