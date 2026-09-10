# syntax = docker/dockerfile:1
#
# Multi-stage build mirroring backend/Dockerfile's shape: a throw-away build
# stage installs dependencies and compiles TypeScript, the final stage only
# carries the production node_modules + compiled dist/, running as a
# non-root user.
FROM node:22-slim AS base
WORKDIR /app

FROM base AS build
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM base

ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist

# node:22-slim already ships a non-root `node` user at uid/gid 1000 (unlike
# backend/Dockerfile's ruby:slim base, which has neither) — creating another
# one at the same uid/gid fails outright (exit code 4, "already in use").
USER node

EXPOSE 1234
CMD ["node", "dist/index.js"]
