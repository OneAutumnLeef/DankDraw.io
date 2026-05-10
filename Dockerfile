# syntax=docker/dockerfile:1.7

# ─── Build stage ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Cache-friendly: copy manifests first.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/client/package.json apps/client/
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile

# Source.
COPY apps/ apps/
COPY packages/ packages/

# Build the client (server runs from source via tsx — no compile step).
RUN pnpm --filter @dankdraw/client build

# ─── Runtime stage ────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

# dumb-init reaps zombies + forwards signals so SIGTERM actually shuts down.
RUN apk add --no-cache dumb-init && addgroup -S app && adduser -S app -G app

# Copy the entire built workspace. node_modules contains the workspace
# symlinks pnpm set up — keep them intact so @dankdraw/shared resolves.
COPY --from=builder --chown=app:app /app /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV CLIENT_DIST=/app/apps/client/dist

EXPOSE 3000
USER app
WORKDIR /app/apps/server
ENTRYPOINT ["dumb-init", "--"]
CMD ["node_modules/.bin/tsx", "src/index.ts"]
