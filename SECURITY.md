# Security Policy

## Supported Versions

Brussels Governance Monitor is a statically generated site (Next.js SSG).
There are no versioned releases — the `main` branch is the only supported version.

| Branch | Supported          |
| ------ | ------------------ |
| `main` | :white_check_mark: |
| other  | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT open a public issue.** Security issues must be reported privately.
2. **Email:** [security@governance.brussels](mailto:security@governance.brussels)
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

The following are in scope:

- Security headers misconfiguration
- XSS via content injection (MDX, JSON data)
- Information disclosure (API keys, secrets, internal paths)
- Dependency vulnerabilities with exploitable impact

The following are **out of scope**:

- Vulnerabilities in third-party services (Vercel, GitHub, Umami)
- Social engineering attacks
- Denial of service (the site is statically hosted on a CDN)
- Issues that require physical access to a device

## Security Architecture

- **Static site**: no server-side runtime, no database, no user authentication
- **Content**: MDX compiled at build time (no dynamic execution)
- **Dependencies**: monitored via Dependabot
- **Headers**: security headers configured in `next.config.ts` (CSP, X-Frame-Options, etc.)
- **Secrets**: zero secrets in the codebase — environment variables via `.env.local` (gitignored)
