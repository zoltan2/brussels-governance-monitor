# syntax=docker/dockerfile:1
# Image Docker autonome pour le staging Hetzner (Next.js standalone).
# Multi-stage : deps -> builder -> runner. Base node:22-slim partout (aligne
# le runtime sur le dev local Node 22, évite les surprises musl d'Alpine).
#
# L'image de base est épinglée PAR EMPREINTE depuis le 21/09/2026. L'étiquette
# `22-slim` est réécrite à chaque publication amont : deux builds du même commit
# ne produisaient pas la même image, et une compromission de l'étiquette se
# serait propagée au déploiement suivant. Dependabot met l'empreinte à jour
# (écosystème `docker` ajouté dans .github/dependabot.yml).

# ---- deps : dépendances complètes (dev incluses) pour le build ----
FROM node:22-slim@sha256:48e4b67d85f87bd551df43704e24d252f56cc5f8e9718841aace50f19948f0f9 AS deps
WORKDIR /app
# npm ci a besoin du lockfile. On installe TOUT (velite/pagefind/tsx sont en
# devDependencies et sont requis par le script `build`), donc pas de --omit=dev.
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder : exécute le script `build` EXISTANT verbatim ----
FROM node:22-slim@sha256:48e4b67d85f87bd551df43704e24d252f56cc5f8e9718841aace50f19948f0f9 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `npm run build` = velite --clean && next build && node scripts/pagefind-build.mjs,
# qui génère l'index Pagefind dans public/pagefind. Cet index n'est pas suivi par
# git (depuis le 2026-09-11) : c'est cette génération qui produit l'index servi.
# next build télécharge la police Inter via next/font/google -> réseau requis
# pendant le build (OK en build Docker standard). Pagefind écrit dans
# public/pagefind APRÈS next build : c'est pourquoi le runner copie public.
ENV NEXT_TELEMETRY_DISABLED=1
# SELF_HOST=1 dès le build : next.config.ts le lit pour basculer sur
# `output: 'standalone'` et `images.unoptimized` (pas de sharp dans le runner).
# La variable doit donc exister AU BUILD, et pas seulement au runtime.
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
FROM node:22-slim@sha256:48e4b67d85f87bd551df43704e24d252f56cc5f8e9718841aace50f19948f0f9 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Même valeur qu'au build : next.config.ts est relu au démarrage du serveur
# standalone et doit y résoudre la même configuration qu'à la compilation.
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

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
