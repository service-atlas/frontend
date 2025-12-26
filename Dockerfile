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
# Copy only package.json (and workspace file if needed). We intentionally
# do NOT copy pnpm-lock.yaml to avoid mismatch when using npm locally.
COPY package.json pnpm-workspace.yaml ./
RUN pnpm install --no-frozen-lockfile

# Copy the rest and build
COPY . .
RUN pnpm build


FROM node:24-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# The official Node image already provides a non-root user named `node`.
# We'll use it and ensure copied files are owned by this user.

# Copy Nitro output and set ownership so the `node` user can read/execute
COPY --from=build --chown=node:node /app/.output ./.output

USER node
EXPOSE 3000

# Note: at runtime you can override the public runtime config using env vars:
# - NUXT_PUBLIC_API_URL=https://api.example.com
# `API_URL` is also read in nuxt.config.ts as a default.
CMD ["node", ".output/server/index.mjs"]
