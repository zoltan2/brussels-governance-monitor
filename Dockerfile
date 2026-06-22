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
