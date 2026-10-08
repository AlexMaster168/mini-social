# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN npm install -g pnpm@12.10.1
WORKDIR /app

# ---------- build both apps ----------
FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# ---------- production runtime: API + static SPA ----------
FROM base AS runtime
ENV NODE_ENV=production \
    PORT=3000
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/
RUN pnpm install --frozen-lockfile --prod --filter @mini-social/server \
    && pnpm store prune
COPY --from=build /app/apps/server/dist apps/server/dist
COPY --from=build /app/apps/server/drizzle apps/server/drizzle
COPY --from=build /app/apps/web/dist apps/web/dist

USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- "http://localhost:${PORT}/api/health" || exit 1

# Migrations run automatically on start.
CMD ["node", "apps/server/dist/server.js"]
