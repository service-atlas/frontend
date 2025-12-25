# syntax=docker/dockerfile:1

# Multi-stage build for Nuxt 4 (Nitro node server)
# Pass backend URL at runtime with either NUXT_PUBLIC_API_URL (preferred)
# or API_URL (used as default in nuxt.config.ts).

FROM node:24-alpine AS build
WORKDIR /app

# Enable pnpm via Corepack
ENV COREPACK_INTEGRITY_KEYS=0
RUN corepack enable

# Install deps first (better layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Copy the rest and build
COPY . .
RUN pnpm build


FROM node:24-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup -S nodejs && adduser -S node -G nodejs

# Copy Nitro output
COPY --from=build /app/.output ./.output

USER node
EXPOSE 3000

# Note: at runtime you can override the public runtime config using env vars:
# - NUXT_PUBLIC_API_URL=https://api.example.com
# `API_URL` is also read in nuxt.config.ts as a default.
CMD ["node", ".output/server/index.mjs"]
