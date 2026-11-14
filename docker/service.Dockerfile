# ============================================================
# Dockerfile ÚNICO para todos los servicios del monorepo.
#
#   docker build -f docker/service.Dockerfile --build-arg SERVICE=iam-service -t iam-service .
#
# builder: instala el workspace completo y usa `pnpm deploy` para armar una
#          carpeta autocontenida SOLO con el servicio + sus deps de producción
#          (incluye @plantilla/shared ya copiado, no como symlink).
# runner:  imagen mínima, usuario no-root, dumb-init para señales (SIGTERM de ECS).
# ============================================================

FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /repo

# ── STAGE 1: builder ─────────────────────────────────────────
FROM base AS builder
ARG SERVICE

# Manifests primero → cache de capas mientras no cambien dependencias
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages ./packages
COPY services ./services

RUN if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; else pnpm install; fi
RUN pnpm --filter "@plantilla/${SERVICE}" deploy --prod --legacy /out

# ── STAGE 2: runner ──────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache dumb-init

WORKDIR /app
COPY --from=builder /out ./
COPY docker/entrypoint.sh /entrypoint.sh

RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app
ENV NODE_ENV=production HOME=/tmp

EXPOSE 4000

# Healthcheck sin curl: fetch nativo de Node 20
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--", "sh", "/entrypoint.sh"]
