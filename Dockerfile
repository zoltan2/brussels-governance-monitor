# syntax=docker/dockerfile:1
# Image Docker autonome pour le staging Hetzner (Next.js standalone).
# Multi-stage : deps -> builder -> runner. Base node:22-slim partout (aligne
# le runtime sur le dev local Node 22, évite les surprises musl d'Alpine).

# ---- deps : dépendances complètes (dev incluses) pour le build ----
FROM node:22-slim AS deps
WORKDIR /app
# npm ci a besoin du lockfile. On installe TOUT (velite/pagefind/tsx sont en
# devDependencies et sont requis par le script `build`), donc pas de --omit=dev.
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder : exécute le script `build` EXISTANT verbatim ----
FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `npm run build` = velite --clean && next build && pagefind --site
# .next/server/app --output-path public/pagefind (cf. package.json, inchangé).
# next build télécharge la police Inter via next/font/google -> réseau requis
# pendant le build (OK en build Docker standard). Pagefind écrit dans
# public/pagefind APRÈS next build : c'est pourquoi le runner copie public.
ENV NEXT_TELEMETRY_DISABLED=1
# SELF_HOST=1 dès le build : layout.tsx lit process.env.SELF_HOST, donc la
# variable doit exister AU BUILD pour que <Analytics /> ne soit pas compilé
# dans le bundle (pas seulement absent au runtime).
ENV SELF_HOST=1
# NEXT_PUBLIC_* est inliné par Next.js au build, pas lu au runtime : le
# .env du VPS ne suffit pas, chat-widget.tsx checke cette variable côté
# client et ne rend rien si elle n'est pas 'true' à la compilation.
ENV NEXT_PUBLIC_CHATBOT_ENABLED=true
# Sans ça, les pages générées statiquement au build (canonical, OG, hreflang)
# figent le fallback code 'http://localhost:3000' — cassé en prod. Le domaine
# de staging n'a pas besoin de sa propre valeur : son robots.txt reste
# noindex (voir robots.ts), et un canonical qui pointe vers le domaine
# canonique est justement le comportement correct si une page de staging
# fuitait quand même dans un crawl.
ENV NEXT_PUBLIC_SITE_URL=https://governance.brussels
# layout.tsx only renders the Umami <script> when this var is truthy at
# build time — without it here, tracking is silently absent from every
# statically-generated page (cf. tech_nextjs_public_env_build_time_selfhost).
ENV NEXT_PUBLIC_UMAMI_WEBSITE_ID=e42598c7-0c04-4c2f-b7c3-e1c5e0b2b6bc
RUN npm run build
# Runner de migrations B-Sides, bundlé en scripts autonomes : le runner final
# n'a ni tsx ni devDependencies. esbuild est une devDependency épinglée
# (package.json) installée par `npm ci` ci-dessus — npx ne va donc rien
# chercher sur le réseau ici.
RUN npx esbuild scripts/bsides/migrate.ts scripts/bsides/seed-admin.ts \
      scripts/bsides/verify-admin.ts \
      --bundle --platform=node --target=node22 --outdir=dist \
      --external:node:*

# ---- runner : image finale minimale, .next/standalone + assets explicites ----
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# SELF_HOST=1 -> le layout ne rend pas <Analytics /> (Vercel Web Analytics).
ENV SELF_HOST=1
# Écoute sur toutes les interfaces du conteneur, port 3000.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Commit dont cette image est issue, exposé par /api/health. C'est le seul
# moyen de savoir QUELLE version le VPS sert : le déploiement est asynchrone,
# un timer systemd tire l'image toutes les 5 minutes, donc un job GitHub ne
# peut pas déduire de son propre succès que la prod est à jour.
# Déclaré ici, dans le runner, et pas dans le builder : sinon chaque commit
# invaliderait le cache de npm ci et de next build.
ARG BUILD_SHA=unknown
ENV BUILD_SHA=${BUILD_SHA}

# Utilisateur non-root.
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# Sortie standalone : server.js + node_modules tracés.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Les TROIS copies sans lesquelles la prod est cassée :
#   public (incl. public/pagefind) -> sinon recherche Pagefind morte
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
#   .next/static -> sinon assets/JS cassés
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
#   src/assets/fonts -> sinon la route OG plante en ENOENT (readFile sur un
#   chemin dynamique process.cwd()/src/assets/fonts non tracé par standalone).
COPY --from=builder --chown=nextjs:nodejs /app/src/assets/fonts ./src/assets/fonts

# Migrations B-Sides. Le tracing de Next ne suit que le JavaScript : sans ce
# COPY, les .sql seraient absents de l'image et le runner ne trouverait rien.
# Glob restreint aux .sql : le dossier source contient aussi les .test.ts
# colocalisés (002_identity.test.ts, 003_domain.test.ts), qui n'ont rien à
# faire dans l'image de production.
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/bsides/migrations/*.sql ./migrations/
COPY --from=builder --chown=nextjs:nodejs /app/dist/migrate.js ./migrate.js
COPY --from=builder --chown=nextjs:nodejs /app/dist/seed-admin.js ./seed-admin.js
COPY --from=builder --chown=nextjs:nodejs /app/dist/verify-admin.js ./verify-admin.js

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
