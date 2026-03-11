# nginx/Dockerfile
# Multi-stage: builds React frontend, then creates Nginx image
# Build context: project root (set in docker-compose.yml)

# ── Stage 1: Build React frontend ──
FROM node:20-alpine AS frontend-build

WORKDIR /app

# Install dependencies first (layer caching)
COPY frontend/react-Admin3/package.json frontend/react-Admin3/package-lock.json ./
RUN npm ci --silent

# Copy source, config, and staging env
COPY frontend/react-Admin3/ ./
COPY frontend/react-Admin3/.env.staging .env.production

# Build for production (Vite reads .env.production)
RUN npm run build

# ── Stage 2: Nginx with React build + config ──
FROM nginx:alpine

# Remove default config
RUN rm -f /etc/nginx/conf.d/default.conf

# Install openssl for certificate generation
RUN apk add --no-cache openssl

# Copy nginx configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Copy certificate generator (runs on container startup)
# sed strips Windows CRLF line endings that break #!/bin/sh on Linux
COPY nginx/generate-cert.sh /docker-entrypoint.d/40-generate-cert.sh
RUN sed -i 's/\r$//' /docker-entrypoint.d/40-generate-cert.sh && \
    chmod +x /docker-entrypoint.d/40-generate-cert.sh

# Copy Vite build output (configured in vite.config.js: outDir: 'build')
COPY --from=frontend-build /app/build /usr/share/nginx/html

EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1/health || exit 1
