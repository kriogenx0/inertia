# syntax = docker/dockerfile:1

# Builds the renderer (the React app) as a static site via vite.web.config.mjs,
# bypassing electron-vite entirely so this image never needs to install or
# download Electron itself.

ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .

ARG VITE_BACKEND_URL=http://localhost:3000
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}
RUN npm run build:web


FROM nginx:alpine AS web

COPY --from=build /app/dist-web /usr/share/nginx/html

EXPOSE 80
