# nginx/Dockerfile
# Multi-stage: builds React frontend, then creates Nginx image
# Build context: project root (set in docker-compose.yml)

# ── Stage 1: Build React frontend ──
FROM node:20-alpine AS frontend-build

WORKDIR /app

# Install dependencies first (layer caching)
COPY frontend/react-Admin3/package.json frontend/react-Admin3/package-lock.json ./
RUN npm ci --silent

# Copy source and staging env
COPY frontend/react-Admin3/ ./
COPY frontend/react-Admin3/.env.staging .env.production.local

# Build for production (CRA reads .env.production.local)
RUN CI=false npm run build

# ── Stage 2: Nginx with React build + config ──
FROM nginx:alpine

# Remove default config
RUN rm -f /etc/nginx/conf.d/default.conf

# Install openssl for certificate generation
RUN apk add --no-cache openssl

# Copy nginx configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Copy certificate generator (runs on container startup)
COPY nginx/generate-cert.sh /docker-entrypoint.d/40-generate-cert.sh
RUN chmod +x /docker-entrypoint.d/40-generate-cert.sh

# Copy React build output
COPY --from=frontend-build /app/build /usr/share/nginx/html

EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1/health || exit 1
