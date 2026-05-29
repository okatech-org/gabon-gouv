# syntax=docker/dockerfile:1
#
# Image multi-app pour le monorepo Gabon Connect.
# On build UNE app Next.js (sortie "standalone") puis on l'exécute sur Cloud Run.
#
# Exemple :
#   docker build \
#     --build-arg APP=citizen-web \
#     --build-arg NEXT_PUBLIC_CONVEX_URL=https://xxx.convex.cloud \
#     -t citizen-web .
#
# APP doit valoir : citizen-web | admin-web | platform-web

# ---------------------------------------------------------------------------
# 1. Dépendances — on installe tout le graphe workspace (bun + lockfile gelé).
#    On ne copie que les package.json pour maximiser le cache de couche.
# ---------------------------------------------------------------------------
FROM oven/bun:1.2.17 AS deps
WORKDIR /repo
COPY package.json bun.lock ./
COPY apps/citizen-web/package.json apps/citizen-web/package.json
COPY apps/admin-web/package.json apps/admin-web/package.json
COPY apps/platform-web/package.json apps/platform-web/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/backend/package.json packages/backend/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
RUN bun install --frozen-lockfile

# ---------------------------------------------------------------------------
# 2. Build — turbo construit uniquement l'app ciblée (et ses deps internes).
#    Les variables NEXT_PUBLIC_* sont inlinées au BUILD : on les passe en
#    build-args (sinon elles seront vides dans le bundle client).
# ---------------------------------------------------------------------------
FROM oven/bun:1.2.17 AS builder
ARG APP
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_CONVEX_URL
ARG NEXT_PUBLIC_BETTER_AUTH_URL
ARG NEXT_PUBLIC_CITIZEN_WEB_URL
ENV NEXT_PUBLIC_CONVEX_URL=$NEXT_PUBLIC_CONVEX_URL \
    NEXT_PUBLIC_BETTER_AUTH_URL=$NEXT_PUBLIC_BETTER_AUTH_URL \
    NEXT_PUBLIC_CITIZEN_WEB_URL=$NEXT_PUBLIC_CITIZEN_WEB_URL \
    NEXT_TELEMETRY_DISABLED=1

RUN bunx turbo build --filter=${APP}

# ---------------------------------------------------------------------------
# 3. Runtime — image Node minimale, on n'embarque que la sortie standalone.
#    standalone N'inclut PAS .next/static ni public : on les copie à la main.
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runner
ARG APP
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=8080 \
    APP=${APP}
WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# La sortie standalone reproduit l'arborescence depuis la racine du monorepo :
#   /app/apps/${APP}/server.js  +  /app/node_modules  +  /app/packages/...
COPY --from=builder --chown=nextjs:nodejs /repo/apps/${APP}/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/${APP}/.next/static ./apps/${APP}/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/${APP}/public ./apps/${APP}/public

USER nextjs
EXPOSE 8080

# Cloud Run injecte PORT ; Next standalone l'écoute via la variable d'env.
CMD ["sh", "-c", "node apps/$APP/server.js"]
