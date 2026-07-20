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

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
