# syntax=docker/dockerfile:1
# Build context is the repo root so the workspace lockfile is available.

# ---------- dependencies ----------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN npm ci

# ---------- build ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY apps/api ./apps/api
RUN npm run prisma:generate --workspace=api \
  && npm run build --workspace=api

# ---------- runtime ----------
FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
# Production dependencies only. The prisma CLI is a runtime dependency here because the
# container applies pending migrations before it starts serving.
RUN npm ci --omit=dev --workspace=api --include-workspace-root \
  && npm cache clean --force

COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY apps/api/prisma ./apps/api/prisma
RUN npx prisma generate --schema apps/api/prisma/schema.prisma

COPY apps/api/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh && chown -R nestjs:nodejs /app

USER nestjs
EXPOSE 4000
ENTRYPOINT ["./docker-entrypoint.sh"]
