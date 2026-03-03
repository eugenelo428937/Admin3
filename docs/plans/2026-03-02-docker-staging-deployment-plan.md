# Docker Staging Deployment — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deploy Admin3 (Django + React) to a Windows Server 2019 staging environment using Docker Compose with automated CI/CD, and provide a Docker-based local development environment.

**Architecture:** 5-container Docker Compose stack (PostgreSQL, Redis, Django/Gunicorn, email worker, Nginx) with a GitHub Actions self-hosted runner for auto-deployment on pushes to the `staging` branch. Nginx terminates SSL (self-signed) and serves the React SPA while proxying API requests to Django. Same compose file works for local dev with an override file.

**Tech Stack:** Docker Compose, Nginx, Gunicorn, PostgreSQL 15, Redis 7, GitHub Actions (self-hosted runner), Python 3.14, Node 20, Django 6.0, React 19.2

**Design doc:** `docs/plans/2026-03-02-docker-staging-deployment-design.md`

---

## Prerequisites

- Docker Desktop installed on Windows 11 (development)
- Docker Desktop (or Docker Engine) on Windows Server 2019 (staging) — to be installed
- Git repository: `Admin3` with branches `main`, `uat`, and new `staging`
- Existing files you'll reference:
  - `backend/django_Admin3/Dockerfile` — existing multi-stage Django build
  - `backend/django_Admin3/railway-start.sh` — existing startup script (web/worker mode)
  - `backend/django_Admin3/django_Admin3/settings/base.py` — env var loading logic
  - `backend/django_Admin3/django_Admin3/settings/uat.py` — closest reference for staging settings

---

## Task 1: Database Initialization Script

**Files:**
- Create: `docker/init.sql`

**Step 1: Create the init script**

This script runs automatically when the PostgreSQL container starts for the first time. It creates the two custom schemas that Admin3 models require.

```sql
-- docker/init.sql
-- Runs on first PostgreSQL container start via docker-entrypoint-initdb.d
-- Creates the schemas required by Admin3 Django models

CREATE SCHEMA IF NOT EXISTS acted;
CREATE SCHEMA IF NOT EXISTS adm;

-- Grant permissions to the default user (POSTGRES_USER from docker-compose)
GRANT ALL ON SCHEMA acted TO CURRENT_USER;
GRANT ALL ON SCHEMA adm TO CURRENT_USER;
```

**Step 2: Verify file exists**

Run: `cat docker/init.sql`

Expected: The SQL content above.

**Step 3: Commit**

```bash
git add docker/init.sql
git commit -m "feat(docker): add PostgreSQL init script for acted/adm schemas"
```

---

## Task 2: Add django-redis to Requirements

**Files:**
- Modify: `backend/django_Admin3/requirements.txt`

**Step 1: Add the dependency**

Add these two lines at the end of `requirements.txt` (alphabetical position doesn't matter for pip):

```
django-redis==5.4.0
```

Note: `django-redis` pulls in the `redis` Python package as a transitive dependency.

**Step 2: Verify installation works**

Run from `backend/django_Admin3/`:

```bash
pip install django-redis==5.4.0
```

Expected: Installs `django-redis` and `redis` packages successfully.

**Step 3: Commit**

```bash
git add backend/django_Admin3/requirements.txt
git commit -m "feat(deps): add django-redis for staging/production cache backend"
```

---

## Task 3: Add Staging Detection to base.py

**Files:**
- Modify: `backend/django_Admin3/django_Admin3/settings/base.py`

**Context:** `base.py` auto-detects `DJANGO_ENV` from `DJANGO_SETTINGS_MODULE` to load the correct `.env.{env}` file. It currently handles `uat`, `production`, `development`, `ci`, `test` but NOT `staging`. Without this change, `.env.staging` won't be loaded automatically.

**Step 1: Add staging detection**

Find this block in `base.py` (around line 20-30):

```python
    elif 'ci' in settings_module:        os.environ.setdefault('DJANGO_ENV', 'ci')
    elif 'test' in settings_module:      os.environ.setdefault('DJANGO_ENV', 'test')
```

Add a new `elif` before the `ci` check:

```python
    elif 'staging' in settings_module:   os.environ.setdefault('DJANGO_ENV', 'staging')
    elif 'ci' in settings_module:        os.environ.setdefault('DJANGO_ENV', 'ci')
    elif 'test' in settings_module:      os.environ.setdefault('DJANGO_ENV', 'test')
```

**Step 2: Verify the change**

Run: `grep -n 'staging' backend/django_Admin3/django_Admin3/settings/base.py`

Expected: Shows the new staging line.

**Step 3: Commit**

```bash
git add backend/django_Admin3/django_Admin3/settings/base.py
git commit -m "feat(settings): add staging environment detection to base.py"
```

---

## Task 4: Create Django Staging Settings

**Files:**
- Create: `backend/django_Admin3/django_Admin3/settings/staging.py`

**Context:** `staging.py` combines patterns from `uat.py` (security, middleware, WhiteNoise) and `production.py` (Redis cache). Database connects to the Docker PostgreSQL container via hostname `db`. Redis connects via hostname `redis`. Both hostnames are resolved by Docker's internal DNS.

**Step 1: Create staging.py**

```python
"""
Django settings for staging environment (Docker Compose).

Combines UAT security/middleware patterns with production Redis caching.
Connects to PostgreSQL and Redis via Docker service names.
"""
import os
import warnings

import dj_database_url
import environ

from .base import *  # noqa: F401, F403

env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, []),
    CORS_ALLOWED_ORIGINS=(list, []),
    CSRF_TRUSTED_ORIGINS=(list, []),
)

# --- Core ---
DEBUG = False
SECRET_KEY = env('DJANGO_SECRET_KEY')

ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['*'])

# --- Database ---
# Three-way: DATABASE_URL > DB_HOST env vars > build-time SQLite fallback
database_url = os.environ.get('DATABASE_URL')
db_host = os.environ.get('DB_HOST')

if database_url:
    DATABASES = {
        'default': dj_database_url.parse(
            database_url,
            conn_max_age=600,
            conn_health_checks=True,
            ssl_require=False,
        )
    }
elif db_host:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('DB_NAME', 'admin3'),
            'USER': os.environ.get('DB_USER', 'admin3'),
            'PASSWORD': os.environ.get('DB_PASSWORD', ''),
            'HOST': db_host,
            'PORT': os.environ.get('DB_PORT', '5432'),
            'OPTIONS': {'client_encoding': 'UTF8'},
            'CONN_MAX_AGE': 600,
            'CONN_HEALTH_CHECKS': True,
        }
    }
else:
    warnings.warn("No database configured — using in-memory SQLite (build-time only)")
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': ':memory:',
        }
    }

# --- Cache (Redis) ---
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': env('REDIS_URL', default='redis://redis:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# --- Middleware ---
# HealthCheckMiddleware first (exempts /api/health/ from SSL redirect)
# WhiteNoise after SecurityMiddleware (serves Django admin/DRF statics)
MIDDLEWARE = [
    'utils.middleware.HealthCheckMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# --- Security ---
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 0  # No HSTS for self-signed cert staging
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True

# --- CORS / CSRF ---
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[])
CSRF_TRUSTED_ORIGINS = env.list('CSRF_TRUSTED_ORIGINS', default=[])
CORS_ALLOW_CREDENTIALS = True

# --- Session cookies (same-origin since Nginx serves both) ---
SESSION_ENGINE = 'django.contrib.sessions.backends.db'
SESSION_COOKIE_AGE = 86400
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'  # Same origin (not cross-origin like Railway UAT)
SESSION_SAVE_EVERY_REQUEST = True
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SECURE = True

# --- Static files (WhiteNoise) ---
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATIC_URL = '/static/'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# --- Logging (console + file) ---
LOG_DIR = os.environ.get('LOG_DIR', '/app/logs')
os.makedirs(LOG_DIR, exist_ok=True)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{asctime}] {levelname} {name} {message}',
            'style': '{',
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': os.path.join(LOG_DIR, 'django.log'),
            'formatter': 'verbose',
            'encoding': 'utf-8',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console', 'file'],
            'level': 'WARNING',
            'propagate': False,
        },
    },
}

# --- Email ---
USE_INTERNAL_SMTP = env.bool('USE_INTERNAL_SMTP', default=True)
USE_SENDGRID = env.bool('USE_SENDGRID', default=False)

if USE_INTERNAL_SMTP:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = env('EMAIL_HOST', default='host.docker.internal')
    EMAIL_PORT = env.int('EMAIL_PORT', default=25)
    EMAIL_USE_TLS = env.bool('EMAIL_USE_TLS', default=False)
    EMAIL_USE_SSL = env.bool('EMAIL_USE_SSL', default=False)
    EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
    EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
elif USE_SENDGRID:
    EMAIL_BACKEND = 'anymail.backends.sendgrid.EmailBackend'
    ANYMAIL = {'SENDGRID_API_KEY': env('SENDGRID_API_KEY', default='')}
else:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = env('EMAIL_HOST', default='smtp.gmail.com')
    EMAIL_PORT = env.int('EMAIL_PORT', default=587)
    EMAIL_USE_TLS = True
    EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
    EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')

EMAIL_FROM_NAME = env('EMAIL_FROM_NAME', default='ActEd Sales')
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='no-reply@acted.co.uk')
DEFAULT_REPLY_TO_EMAIL = env('DEFAULT_REPLY_TO_EMAIL', default='acted@bpp.com')

DEV_EMAIL_OVERRIDE = env.bool('DEV_EMAIL_OVERRIDE', default=True)
DEV_EMAIL_RECIPIENTS = env.list('DEV_EMAIL_RECIPIENTS', default=[])
EMAIL_BCC_MONITORING = env.bool('EMAIL_BCC_MONITORING', default=False)
EMAIL_BCC_RECIPIENTS = env.list('EMAIL_BCC_RECIPIENTS', default=[])
EMAIL_QUEUE_BATCH_SIZE = env.int('EMAIL_QUEUE_BATCH_SIZE', default=50)
EMAIL_QUEUE_INTERVAL = env.int('EMAIL_QUEUE_INTERVAL', default=30)

# --- Frontend URL ---
FRONTEND_URL = env('FRONTEND_URL', default='https://localhost')

# --- Token expiry ---
TOKEN_EXPIRY_PASSWORD_RESET_HOURS = 24
TOKEN_EXPIRY_ACCOUNT_ACTIVATION_HOURS = 168
TOKEN_EXPIRY_EMAIL_VERIFICATION_HOURS = 24
TOKEN_EXPIRY_RESEND_ACTIVATION_HOURS = 168
PASSWORD_RESET_TIMEOUT_HOURS = float(env('PASSWORD_RESET_TIMEOUT_HOURS', default='24'))
PASSWORD_RESET_TIMEOUT = int(PASSWORD_RESET_TIMEOUT_HOURS * 3600)

# --- Administrate API (placeholders for build-time) ---
ADMINISTRATE_INSTANCE_URL = env('ADMINISTRATE_INSTANCE_URL', default='build-placeholder.example.com')
ADMINISTRATE_API_URL = env('ADMINISTRATE_API_URL', default='https://api.example.com/graphql')
ADMINISTRATE_API_KEY = env('ADMINISTRATE_API_KEY', default='build-placeholder')
ADMINISTRATE_API_SECRET = env('ADMINISTRATE_API_SECRET', default='build-placeholder')
ADMINISTRATE_REST_API_URL = env('ADMINISTRATE_REST_API_URL', default='https://build-placeholder.example.com')
ADMINISTRATE_AUTH_USER = env('ADMINISTRATE_AUTH_USER', default='build-placeholder@example.com')

# --- Third-party API keys ---
GETADDRESS_API_KEY = env('GETADDRESS_API_KEY', default='')
GETADDRESS_ADMIN_KEY = env('GETADDRESS_ADMIN_KEY', default='')
POSTCODER_API_KEY = env('POSTCODER_API_KEY', default='')
RECAPTCHA_SITE_KEY = env('RECAPTCHA_SITE_KEY', default='')
RECAPTCHA_SECRET_KEY = env('RECAPTCHA_SECRET_KEY', default='')
RECAPTCHA_MIN_SCORE = env.float('RECAPTCHA_MIN_SCORE', default=0.6)

# --- Payment (always test mode on staging) ---
OPAYO_TEST_MODE = True
USE_DUMMY_PAYMENT_GATEWAY = env.bool('USE_DUMMY_PAYMENT_GATEWAY', default=True)
OPAYO_BASE_URL = env('OPAYO_BASE_URL', default='https://sandbox.opayo.eu.elavon.com/hosted-payment-pages/vendor/v12/payment-pages')
OPAYO_INTEGRATION_KEY = env('OPAYO_INTEGRATION_KEY', default='')
OPAYO_INTEGRATION_PASSWORD = env('OPAYO_INTEGRATION_PASSWORD', default='')
OPAYO_VENDOR_NAME = env('OPAYO_VENDOR_NAME', default='')

# --- Fuzzy search ---
FUZZY_SEARCH_MIN_SCORE = env.int('FUZZY_SEARCH_MIN_SCORE', default=45)

# --- Startup diagnostic ---
print(f"[STAGING] ALLOWED_HOSTS: {ALLOWED_HOSTS}")
print(f"[STAGING] CORS_ALLOWED_ORIGINS: {CORS_ALLOWED_ORIGINS}")
print(f"[STAGING] Database host: {DATABASES['default'].get('HOST', 'N/A')}")
print(f"[STAGING] Cache: {CACHES['default']['LOCATION']}")
```

**Step 2: Verify syntax**

Run from `backend/django_Admin3/`:

```bash
python -c "import ast; ast.parse(open('django_Admin3/settings/staging.py').read()); print('Syntax OK')"
```

Expected: `Syntax OK`

**Step 3: Commit**

```bash
git add backend/django_Admin3/django_Admin3/settings/staging.py
git commit -m "feat(settings): add staging.py for Docker Compose deployment"
```

---

## Task 5: Create Backend Staging Environment File

**Files:**
- Create: `backend/django_Admin3/.env.staging`

**Context:** This file is loaded automatically by `base.py` when `DJANGO_ENV=staging`. It contains non-secret defaults. Secrets (DB password, Django secret key) are injected via Docker Compose environment variables which override these.

**Step 1: Create the env file**

```env
# backend/django_Admin3/.env.staging
# Non-secret staging defaults. Secrets injected via docker-compose environment.

DJANGO_SETTINGS_MODULE=django_Admin3.settings.staging
DJANGO_ENV=staging

# Database (overridden by docker-compose environment)
DB_HOST=db
DB_PORT=5432
DB_NAME=admin3_staging
DB_USER=admin3

# Redis
REDIS_URL=redis://redis:6379/1

# Hosts (override with actual server IP in docker-compose)
ALLOWED_HOSTS=*
CORS_ALLOWED_ORIGINS=https://localhost
CSRF_TRUSTED_ORIGINS=https://localhost
FRONTEND_URL=https://localhost

# Email (internal SMTP relay - update host for your network)
USE_INTERNAL_SMTP=True
USE_SENDGRID=False
EMAIL_HOST=host.docker.internal
EMAIL_PORT=25
EMAIL_USE_TLS=False
EMAIL_USE_SSL=False
EMAIL_FROM_NAME=ActEd Sales
DEFAULT_FROM_EMAIL=no-reply@acted.co.uk
DEFAULT_REPLY_TO_EMAIL=acted@bpp.com
DEV_EMAIL_OVERRIDE=True
DEV_EMAIL_RECIPIENTS=
EMAIL_BCC_MONITORING=False
EMAIL_QUEUE_BATCH_SIZE=50
EMAIL_QUEUE_INTERVAL=30

# Payment (always test mode)
USE_DUMMY_PAYMENT_GATEWAY=True

# Backend port (used by gunicorn via railway-start.sh)
BACKEND_PORT=8000
FRONTEND_PORT=443
```

**Step 2: Commit**

```bash
git add backend/django_Admin3/.env.staging
git commit -m "feat(config): add backend .env.staging for Docker Compose"
```

---

## Task 6: Create Frontend Staging Environment File

**Files:**
- Create: `frontend/react-Admin3/.env.staging`

**Context:** This file is copied as `.env.production.local` inside the Nginx Dockerfile during the React build stage. CRA reads `.env.production.local` during `npm run build`, which takes precedence over `.env.production`. Since Nginx serves both the React SPA and proxies API requests, `REACT_APP_API_BASE_URL` is empty (same-origin requests).

**Step 1: Create the env file**

```env
# frontend/react-Admin3/.env.staging
# Used during Docker build (copied as .env.production.local in Nginx Dockerfile)
# API is same-origin (Nginx proxies /api/ to Django) so base URL is empty.

REACT_APP_API_BASE_URL=
REACT_APP_API_AUTH_URL=/api/auth
REACT_APP_API_USER_URL=/api/users
REACT_APP_API_EXAM_SESSION_URL=/api/exam-sessions
REACT_APP_API_PRODUCT_URL=/api/products
REACT_APP_API_SUBJECT_URL=/api/subjects
REACT_APP_API_EXAM_SESSION_SUBJECT_URL=/api/exam-sessions-subjects
REACT_APP_API_CART_URL=/api/cart
REACT_APP_API_COUNTRIES_URL=/api/countries
REACT_APP_API_MARKING_URL=/api/marking
REACT_APP_API_TUTORIAL_URL=/api/tutorials
REACT_APP_API_PAGE_SIZE=20
REACT_APP_DISABLE_RECAPTCHA=true
REACT_APP_RECAPTCHA_SITE_KEY=
```

**Step 2: Commit**

```bash
git add frontend/react-Admin3/.env.staging
git commit -m "feat(config): add frontend .env.staging for Docker Compose build"
```

---

## Task 7: Create Nginx Configuration

**Files:**
- Create: `nginx/nginx.conf`

**Context:** Nginx serves three roles: SSL termination (self-signed cert), reverse proxy to Django, and static file server for the React SPA. Key routing:
- `/api/*` and `/admin/*` → proxy to Django (port 8000)
- `/static/admin/` and `/static/rest_framework/` → proxy to Django (WhiteNoise serves these)
- `/*` → React SPA with `try_files` fallback to `index.html`
- `/health` → returns 200 directly (for Docker health checks)

**Step 1: Create nginx.conf**

```nginx
# nginx/nginx.conf
# Nginx configuration for Admin3 staging (Docker Compose)

worker_processes auto;

events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log  /var/log/nginx/error.log warn;

    # Performance
    sendfile        on;
    tcp_nopush      on;
    tcp_nodelay     on;
    keepalive_timeout 65;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml application/xml+rss text/javascript;

    # Upload limit
    client_max_body_size 10m;

    # Django backend upstream
    upstream backend {
        server backend:8000;
    }

    # HTTP → HTTPS redirect
    server {
        listen 80;
        server_name _;

        # Health check on HTTP too (for Docker health check before SSL is ready)
        location /health {
            access_log off;
            return 200 'OK';
            add_header Content-Type text/plain;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    # HTTPS server
    server {
        listen 443 ssl;
        server_name _;

        # SSL configuration (self-signed cert generated on first boot)
        ssl_certificate     /etc/nginx/ssl/server.crt;
        ssl_certificate_key /etc/nginx/ssl/server.key;
        ssl_protocols       TLSv1.2 TLSv1.3;
        ssl_ciphers         HIGH:!aNULL:!MD5;
        ssl_session_cache   shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security headers
        add_header X-Frame-Options DENY always;
        add_header X-Content-Type-Options nosniff always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # Health check (no proxy, no SSL needed)
        location /health {
            access_log off;
            return 200 'OK';
            add_header Content-Type text/plain;
        }

        # Django API
        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 120s;
            proxy_connect_timeout 10s;
        }

        # Django admin
        location /admin/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Django static files (admin, DRF) — served by WhiteNoise via Django
        # Regex location takes priority over prefix /static/ below for these paths
        location ~ ^/static/(admin|rest_framework)/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_cache_valid 200 1h;
        }

        # React static assets (js, css, media) — long cache
        location /static/ {
            root /usr/share/nginx/html;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # React SPA — catch-all with fallback to index.html
        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;
        }
    }
}
```

**Step 2: Commit**

```bash
git add nginx/nginx.conf
git commit -m "feat(nginx): add reverse proxy config for staging Docker stack"
```

---

## Task 8: Create Self-Signed Certificate Generator

**Files:**
- Create: `nginx/generate-cert.sh`

**Context:** This script runs inside the Nginx container on first boot. It checks if SSL certificates exist and generates self-signed ones if not. Placed in `/docker-entrypoint.d/` which the official Nginx image executes automatically before starting Nginx.

**Step 1: Create the script**

```bash
#!/bin/sh
# nginx/generate-cert.sh
# Generates self-signed SSL certificate for staging.
# Runs automatically on Nginx container startup via /docker-entrypoint.d/

CERT_DIR=/etc/nginx/ssl
CERT_FILE="$CERT_DIR/server.crt"
KEY_FILE="$CERT_DIR/server.key"

if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
    echo "[cert] SSL certificate already exists, skipping generation."
    exit 0
fi

echo "[cert] Generating self-signed SSL certificate..."
mkdir -p "$CERT_DIR"

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -subj "/C=GB/ST=London/L=London/O=ActEd/OU=Development/CN=${SERVER_NAME:-staging.acted.local}"

echo "[cert] Self-signed certificate generated:"
echo "       Certificate: $CERT_FILE"
echo "       Key:         $KEY_FILE"
echo "       Valid for:   365 days"
echo "       CN:          ${SERVER_NAME:-staging.acted.local}"
```

**Step 2: Commit**

```bash
git add nginx/generate-cert.sh
git commit -m "feat(nginx): add self-signed SSL certificate generator"
```

---

## Task 9: Create Nginx Dockerfile

**Files:**
- Create: `nginx/Dockerfile`

**Context:** Multi-stage build. Stage 1 builds the React frontend using Node 20. Stage 2 creates the Nginx image with the React build output, nginx config, and cert generator. The build context is the project root (set in `docker-compose.yml`), so paths reference `frontend/react-Admin3/` and `nginx/`.

**Step 1: Create the Dockerfile**

```dockerfile
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
    CMD wget --no-check-certificate -q -O /dev/null http://localhost/health || exit 1
```

**Step 2: Commit**

```bash
git add nginx/Dockerfile
git commit -m "feat(nginx): add multi-stage Dockerfile for React build + Nginx"
```

---

## Task 10: Create Docker Compose Production Stack

**Files:**
- Create: `docker-compose.yml` (project root)

**Context:** 5 services, 2 networks, 2 volumes. Uses YAML anchors to avoid duplicating backend environment variables between the `backend` and `worker` services. Secrets are loaded from the root `.env` file (Docker Compose reads `.env` automatically). The existing `backend/django_Admin3/Dockerfile` and `railway-start.sh` are reused without modification.

**Step 1: Create docker-compose.yml**

```yaml
# docker-compose.yml
# Admin3 Docker Compose stack for staging and production-like environments.
#
# Usage:
#   Staging:     docker compose up -d
#   Development: docker compose up (auto-loads docker-compose.override.yml)
#   Infra only:  docker compose up db redis (for native Django/React dev)
#
# Secrets: Create a .env file in project root (see .env.example)

x-backend-env: &backend-env
  DJANGO_SETTINGS_MODULE: django_Admin3.settings.staging
  DJANGO_ENV: staging
  DJANGO_SECRET_KEY: ${DJANGO_SECRET_KEY:?Set DJANGO_SECRET_KEY in .env}
  DB_HOST: db
  DB_PORT: "5432"
  DB_NAME: ${POSTGRES_DB:-admin3_staging}
  DB_USER: ${POSTGRES_USER:-admin3}
  DB_PASSWORD: ${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in .env}
  REDIS_URL: redis://redis:6379/1
  ALLOWED_HOSTS: ${ALLOWED_HOSTS:-*}
  CORS_ALLOWED_ORIGINS: ${CORS_ALLOWED_ORIGINS:-https://localhost}
  CSRF_TRUSTED_ORIGINS: ${CSRF_TRUSTED_ORIGINS:-https://localhost}
  FRONTEND_URL: ${FRONTEND_URL:-https://localhost}
  # Email
  USE_INTERNAL_SMTP: ${USE_INTERNAL_SMTP:-False}
  EMAIL_HOST: ${EMAIL_HOST:-host.docker.internal}
  EMAIL_PORT: ${EMAIL_PORT:-25}
  EMAIL_USE_TLS: ${EMAIL_USE_TLS:-False}
  EMAIL_HOST_USER: ${EMAIL_HOST_USER:-}
  EMAIL_HOST_PASSWORD: ${EMAIL_HOST_PASSWORD:-}
  DEFAULT_FROM_EMAIL: ${DEFAULT_FROM_EMAIL:-no-reply@acted.co.uk}
  DEV_EMAIL_OVERRIDE: ${DEV_EMAIL_OVERRIDE:-True}
  DEV_EMAIL_RECIPIENTS: ${DEV_EMAIL_RECIPIENTS:-}
  # Payment
  USE_DUMMY_PAYMENT_GATEWAY: "True"

services:
  # ── PostgreSQL Database ──
  db:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-admin3_staging}
      POSTGRES_USER: ${POSTGRES_USER:-admin3}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in .env}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/init.sql:/docker-entrypoint-initdb.d/01-init-schemas.sql:ro
    networks:
      - backend
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-admin3}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ── Redis Cache ──
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    networks:
      - backend
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ── Django Backend (Gunicorn) ──
  backend:
    build:
      context: ./backend/django_Admin3
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      <<: *backend-env
      PORT: "8000"
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - frontend
      - backend
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health/')"]
      interval: 30s
      timeout: 10s
      start_period: 60s
      retries: 3

  # ── Email Worker ──
  worker:
    build:
      context: ./backend/django_Admin3
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      <<: *backend-env
      SERVICE_TYPE: worker
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - backend

  # ── Nginx (Reverse Proxy + React SPA) ──
  nginx:
    build:
      context: .
      dockerfile: nginx/Dockerfile
    restart: unless-stopped
    ports:
      - "${HTTP_PORT:-80}:80"
      - "${HTTPS_PORT:-443}:443"
    environment:
      SERVER_NAME: ${SERVER_NAME:-staging.acted.local}
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - frontend
    healthcheck:
      test: ["CMD", "wget", "-q", "-O", "/dev/null", "http://localhost/health"]
      interval: 30s
      timeout: 5s
      retries: 3

volumes:
  postgres_data:
  redis_data:

networks:
  frontend:
  backend:
```

**Step 2: Verify YAML syntax**

Run:

```bash
docker compose config --quiet
```

Expected: No errors (quiet means valid).

Note: This will fail if you don't have a `.env` file yet. That's fine — we create it in Task 11.

**Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "feat(docker): add Docker Compose stack with 5 services"
```

---

## Task 11: Create Root Environment Example

**Files:**
- Create: `.env.example` (project root)

**Context:** Docker Compose automatically reads `.env` from the project root for variable substitution in `docker-compose.yml`. This example file documents all required variables. Developers copy it to `.env` and fill in secrets.

**Step 1: Create .env.example**

```env
# .env.example
# Copy to .env and fill in values. Docker Compose reads this automatically.
# NEVER commit .env to git.

# ── Database ──
POSTGRES_DB=admin3_staging
POSTGRES_USER=admin3
POSTGRES_PASSWORD=change-me-to-a-strong-password

# ── Django ──
DJANGO_SECRET_KEY=change-me-generate-with-python-c-from-django.core.management.utils-import-get_random_secret_key-print-get_random_secret_key

# ── Server Identity ──
# Replace with the actual server IP or hostname
SERVER_NAME=staging.acted.local
ALLOWED_HOSTS=staging.acted.local,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=https://staging.acted.local,https://localhost
CSRF_TRUSTED_ORIGINS=https://staging.acted.local,https://localhost
FRONTEND_URL=https://staging.acted.local

# ── Ports (change if conflicts) ──
HTTP_PORT=80
HTTPS_PORT=443

# ── Email (internal SMTP relay) ──
USE_INTERNAL_SMTP=True
EMAIL_HOST=10.20.3.4
EMAIL_PORT=25
EMAIL_USE_TLS=False
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
DEFAULT_FROM_EMAIL=no-reply@acted.co.uk
DEV_EMAIL_OVERRIDE=True
DEV_EMAIL_RECIPIENTS=your-email@example.com

# ── Optional: Third-party API keys ──
# Uncomment and fill in if needed on staging
# GETADDRESS_API_KEY=
# RECAPTCHA_SITE_KEY=
# RECAPTCHA_SECRET_KEY=
# ADMINISTRATE_API_KEY=
# ADMINISTRATE_API_SECRET=
```

**Step 2: Verify .env is in .gitignore**

Run:

```bash
grep "^\.env$" .gitignore || echo ".env NOT in .gitignore — add it!"
```

If not present, add `.env` to `.gitignore`.

**Step 3: Commit**

```bash
git add .env.example
git commit -m "feat(config): add root .env.example for Docker Compose secrets"
```

---

## Task 12: Verify Stack Locally

**Files:** None (verification only)

**Step 1: Create local .env from example**

```bash
cp .env.example .env
```

Edit `.env` and set real values:
- `POSTGRES_PASSWORD=localdev123`
- `DJANGO_SECRET_KEY=` (generate with `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`)

**Step 2: Build and start the stack**

```bash
docker compose build
docker compose up -d
```

Expected: All 5 containers start. Check with:

```bash
docker compose ps
```

Expected output shows `db`, `redis`, `backend`, `worker`, `nginx` all running/healthy.

**Step 3: Verify health endpoints**

```bash
# Nginx health (HTTP)
curl -k http://localhost/health
# Expected: OK

# Nginx health (HTTPS)
curl -k https://localhost/health
# Expected: OK

# Django health (via Nginx proxy)
curl -k https://localhost/api/health/
# Expected: {"status": "ok"} or similar

# React SPA (via Nginx)
curl -k -s https://localhost/ | head -5
# Expected: HTML containing <div id="root">
```

**Step 4: Verify Django admin statics load**

Open in browser: `https://localhost/admin/`

Expected: Django admin login page with CSS properly loaded (not unstyled).

**Step 5: Check logs for errors**

```bash
docker compose logs backend --tail 20
docker compose logs nginx --tail 20
docker compose logs worker --tail 10
```

Expected: No errors. Backend shows `[STAGING]` diagnostic lines.

**Step 6: Stop and clean up**

```bash
docker compose down
```

---

## Task 13: Create GitHub Actions Deploy-Staging Workflow

**Files:**
- Create: `.github/workflows/deploy-staging.yml`

**Context:** Triggers on push to `staging` branch. Job 1 runs tests on GitHub-hosted runners (reuses existing test patterns from `deploy.yml`). Job 2 runs on the self-hosted runner on the Windows Server to build and deploy. Images are built on-server (no GHCR registry needed).

**Step 1: Create the workflow**

```yaml
# .github/workflows/deploy-staging.yml
# Auto-deploy to Windows Server 2019 staging on push to staging branch.
# Requires a self-hosted runner with labels: [self-hosted, windows, staging]

name: Deploy to Staging

on:
  push:
    branches: [staging]
  workflow_dispatch:

env:
  DOCKER_COMPOSE_FILE: docker-compose.yml

jobs:
  # ── Job 1: Run tests on GitHub-hosted runners ──
  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_admin3
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v4
        with:
          python-version: '3.14'
      - name: Install dependencies
        working-directory: ./backend/django_Admin3
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
      - name: Create schemas
        run: |
          PGPASSWORD=postgres psql -h localhost -U postgres -d test_admin3 -c "CREATE SCHEMA IF NOT EXISTS acted;"
          PGPASSWORD=postgres psql -h localhost -U postgres -d test_admin3 -c "CREATE SCHEMA IF NOT EXISTS adm;"
      - name: Run migrations
        working-directory: ./backend/django_Admin3
        run: python manage.py migrate --skip-checks --settings=django_Admin3.settings.ci
      - name: Run tests
        working-directory: ./backend/django_Admin3
        run: python manage.py test --settings=django_Admin3.settings.ci

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: './frontend/react-Admin3/package-lock.json'
      - name: Install dependencies
        working-directory: ./frontend/react-Admin3
        run: npm ci
      - name: Run tests
        working-directory: ./frontend/react-Admin3
        run: npm test -- --coverage --watchAll=false
      - name: Build
        working-directory: ./frontend/react-Admin3
        run: CI=false npm run build

  # ── Job 2: Deploy on self-hosted runner (Windows Server) ──
  deploy:
    needs: [test-backend, test-frontend]
    runs-on: [self-hosted, windows, staging]
    if: github.event_name == 'push' || github.event_name == 'workflow_dispatch'
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4

      - name: Verify Docker is running
        shell: bash
        run: docker info > /dev/null 2>&1 || (echo "Docker is not running!" && exit 1)

      - name: Build Docker images
        shell: bash
        run: docker compose -f $DOCKER_COMPOSE_FILE build --no-cache

      - name: Stop existing containers
        shell: bash
        run: docker compose -f $DOCKER_COMPOSE_FILE down --timeout 30

      - name: Start new containers
        shell: bash
        run: docker compose -f $DOCKER_COMPOSE_FILE up -d

      - name: Wait for services to be healthy
        shell: bash
        run: |
          echo "Waiting for services to start..."
          sleep 30

          # Check each service
          HEALTHY=true

          if ! docker compose -f $DOCKER_COMPOSE_FILE ps --format json | grep -q '"Health":"healthy"'; then
            echo "Warning: Some services may not be healthy yet"
          fi

          # Verify Nginx health endpoint
          for i in 1 2 3 4 5; do
            if curl -k -s -o /dev/null -w "%{http_code}" http://localhost/health | grep -q "200"; then
              echo "Nginx health check passed"
              break
            fi
            echo "Attempt $i: Nginx not ready, waiting 10s..."
            sleep 10
          done

          # Verify Django API health
          for i in 1 2 3 4 5; do
            if curl -k -s -o /dev/null -w "%{http_code}" https://localhost/api/health/ | grep -q "200"; then
              echo "Django API health check passed"
              break
            fi
            echo "Attempt $i: Django not ready, waiting 10s..."
            sleep 10
          done

      - name: Show deployment status
        if: always()
        shell: bash
        run: |
          echo "=== Container Status ==="
          docker compose -f $DOCKER_COMPOSE_FILE ps
          echo ""
          echo "=== Recent Backend Logs ==="
          docker compose -f $DOCKER_COMPOSE_FILE logs backend --tail 15
          echo ""
          echo "=== Recent Nginx Logs ==="
          docker compose -f $DOCKER_COMPOSE_FILE logs nginx --tail 10

      - name: Rollback on failure
        if: failure()
        shell: bash
        run: |
          echo "Deployment failed! Checking for previous images..."
          docker compose -f $DOCKER_COMPOSE_FILE logs --tail 50
          echo ""
          echo "To manually rollback, run:"
          echo "  docker compose -f $DOCKER_COMPOSE_FILE down"
          echo "  git checkout HEAD~1"
          echo "  docker compose -f $DOCKER_COMPOSE_FILE build"
          echo "  docker compose -f $DOCKER_COMPOSE_FILE up -d"

      - name: Clean up old Docker images
        shell: bash
        run: docker image prune -f --filter "until=168h"
```

**Step 2: Commit**

```bash
git add .github/workflows/deploy-staging.yml
git commit -m "feat(ci): add GitHub Actions workflow for staging auto-deployment"
```

---

## Task 14: Create Runner Setup Script

**Files:**
- Create: `scripts/setup-runner.ps1`

**Context:** PowerShell script that automates installing the GitHub Actions self-hosted runner as a Windows Service on the staging server. The runner token must be generated from GitHub Settings → Actions → Runners → New self-hosted runner.

**Step 1: Create the script**

```powershell
# scripts/setup-runner.ps1
# Installs GitHub Actions self-hosted runner as a Windows Service.
# Run as Administrator on the staging server.
#
# Prerequisites:
#   1. Docker Desktop installed and running
#   2. Git installed
#   3. Runner token from: GitHub repo → Settings → Actions → Runners → New self-hosted runner
#
# Usage:
#   .\setup-runner.ps1 -RepoUrl "https://github.com/OWNER/Admin3" -Token "AXXXXXXX..."

param(
    [Parameter(Mandatory=$true)]
    [string]$RepoUrl,

    [Parameter(Mandatory=$true)]
    [string]$Token,

    [string]$RunnerName = "staging-runner",
    [string]$Labels = "staging,windows",
    [string]$InstallDir = "C:\actions-runner"
)

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " GitHub Actions Runner Setup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check admin privileges
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: Run this script as Administrator" -ForegroundColor Red
    exit 1
}

# Check Docker
try {
    docker info | Out-Null
    Write-Host "[PASS] Docker is running" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Docker is not running. Start Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Determine latest runner version
Write-Host "`nDownloading latest runner..." -ForegroundColor Yellow
$latestRelease = Invoke-RestMethod -Uri "https://api.github.com/repos/actions/runner/releases/latest"
$version = $latestRelease.tag_name.TrimStart('v')
$downloadUrl = "https://github.com/actions/runner/releases/download/v${version}/actions-runner-win-x64-${version}.zip"
Write-Host "  Version: $version"
Write-Host "  URL: $downloadUrl"

# Create install directory
if (Test-Path $InstallDir) {
    Write-Host "  Runner directory exists, cleaning up..." -ForegroundColor Yellow
    # Stop existing service if running
    $svc = Get-Service -Name "actions.runner.*" -ErrorAction SilentlyContinue
    if ($svc) {
        Stop-Service $svc.Name -Force -ErrorAction SilentlyContinue
        & "$InstallDir\svc.cmd" uninstall 2>$null
    }
    Remove-Item "$InstallDir\*" -Recurse -Force
} else {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

# Download and extract
$zipPath = "$InstallDir\runner.zip"
Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath
Expand-Archive -Path $zipPath -DestinationPath $InstallDir -Force
Remove-Item $zipPath

# Configure runner
Write-Host "`nConfiguring runner..." -ForegroundColor Yellow
Push-Location $InstallDir
& .\config.cmd --url $RepoUrl --token $Token --name $RunnerName --labels $Labels --unattended --replace
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Runner configuration failed" -ForegroundColor Red
    Pop-Location
    exit 1
}

# Install as Windows Service
Write-Host "`nInstalling as Windows Service..." -ForegroundColor Yellow
& .\svc.cmd install
& .\svc.cmd start
Pop-Location

# Verify
Start-Sleep -Seconds 5
$service = Get-Service -Name "actions.runner.*" -ErrorAction SilentlyContinue
if ($service -and $service.Status -eq 'Running') {
    Write-Host "`n[PASS] Runner installed and running as service: $($service.Name)" -ForegroundColor Green
    Write-Host "  Name:   $RunnerName" -ForegroundColor Gray
    Write-Host "  Labels: $Labels" -ForegroundColor Gray
    Write-Host "  Dir:    $InstallDir" -ForegroundColor Gray
} else {
    Write-Host "`n[WARN] Service installed but may not be running. Check Services (services.msc)" -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " Setup Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "  1. Verify runner appears in GitHub: Settings > Actions > Runners"
Write-Host "  2. Create .env file in the repo directory on this server"
Write-Host "  3. Push to 'staging' branch to trigger first deployment"
```

**Step 2: Commit**

```bash
git add scripts/setup-runner.ps1
git commit -m "feat(scripts): add GitHub Actions self-hosted runner installer"
```

---

## Task 15: Enhance Network Diagnostic Script

**Files:**
- Modify: `scripts/network-diagnostic.ps1`

**Context:** The existing script checks system requirements, network egress, ingress, and Docker status. We need to add 10 checks identified in the design review plus a new "GitHub Actions Runner" section. All additions are appended to existing sections or added as new sections — existing checks remain unchanged.

**Step 1: Update the script header**

Change the synopsis from "Email System Docker deployment" to the broader scope:

Find:
```powershell
    Network diagnostic for Email System Docker deployment.
```

Replace with:
```powershell
    Network diagnostic for Admin3 Docker Compose staging deployment.
    Checks: system requirements, network egress/ingress, Docker status, GitHub Actions runner.
```

**Step 2: Update system requirements (RAM to 16GB, disk to 40GB)**

Find:
```powershell
if ($ram -ge 8) { Log "System" "RAM ($($ram)GB)" "PASS" "Minimum 8GB met" }
else { Log "System" "RAM ($($ram)GB)" "FAIL" "Need 8GB+, have $($ram)GB" }
```

Replace with:
```powershell
if ($ram -ge 16) { Log "System" "RAM ($($ram)GB)" "PASS" "Recommended 16GB met" }
elseif ($ram -ge 8) { Log "System" "RAM ($($ram)GB)" "WARN" "8GB minimum met, 16GB recommended for 5-container stack" }
else { Log "System" "RAM ($($ram)GB)" "FAIL" "Need 8GB+ (16GB recommended), have $($ram)GB" }
```

Find:
```powershell
if ($freeGB -ge 20) { Log "System" "Disk Free ($($freeGB)GB)" "PASS" "Minimum 20GB met" }
else { Log "System" "Disk Free ($($freeGB)GB)" "FAIL" "Need 20GB+, have $($freeGB)GB" }
```

Replace with:
```powershell
if ($freeGB -ge 40) { Log "System" "Disk Free ($($freeGB)GB)" "PASS" "Recommended 40GB met" }
elseif ($freeGB -ge 20) { Log "System" "Disk Free ($($freeGB)GB)" "WARN" "20GB minimum met, 40GB recommended for Docker images + build cache" }
else { Log "System" "Disk Free ($($freeGB)GB)" "FAIL" "Need 20GB+ (40GB recommended), have $($freeGB)GB" }
```

**Step 3: Add GitHub Actions runner URLs to egress checks**

After the existing `$endpoints` array (after the `ghcr.io` entry), add these endpoints:

```powershell
$endpoints += @(
    @{ Name = "GitHub Actions (pipelines)"; URL = "https://pipelines.actions.githubusercontent.com"; Port = 443 },
    @{ Name = "GitHub Actions (results)";   URL = "https://results-receiver.actions.githubusercontent.com"; Port = 443 },
    @{ Name = "GitHub API";                 URL = "https://api.github.com";     Port = 443 }
)
```

**Step 4: Add DNS resolution test after the egress section**

After the proxy detection block (after `Log "Egress" "HTTP Proxy"...`), add:

```powershell
# DNS resolution for Docker registries
$dnsHosts = @("registry-1.docker.io", "auth.docker.io", "ghcr.io", "github.com")
foreach ($h in $dnsHosts) {
    try {
        $resolved = [System.Net.Dns]::GetHostAddresses($h)
        Log "Egress" "DNS: $h" "PASS" "Resolved to $($resolved[0])"
    } catch {
        Log "Egress" "DNS: $h" "FAIL" "Cannot resolve: $($_.Exception.Message)"
    }
}

# TLS version check
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
    $tlsResponse = Invoke-WebRequest -Uri "https://www.howsmyssl.com/a/check" -UseBasicParsing -TimeoutSec 10
    $tlsInfo = $tlsResponse.Content | ConvertFrom-Json
    Log "Egress" "TLS Version" "PASS" "Using: $($tlsInfo.tls_version)"
} catch {
    Log "Egress" "TLS Version" "WARN" "Could not verify TLS: $($_.Exception.Message)"
}

# Git connectivity
$gitInstalled = Get-Command git -ErrorAction SilentlyContinue
if ($gitInstalled) {
    try {
        $gitResult = git ls-remote --exit-code https://github.com/octocat/Hello-World.git HEAD 2>&1
        if ($LASTEXITCODE -eq 0) { Log "Egress" "Git HTTPS" "PASS" "Can clone via HTTPS" }
        else { Log "Egress" "Git HTTPS" "FAIL" "git ls-remote failed" }
    } catch {
        Log "Egress" "Git HTTPS" "FAIL" $_.Exception.Message
    }
} else {
    Log "Egress" "Git HTTPS" "WARN" "Git not installed"
}
```

**Step 5: Add port conflict checks to ingress section**

After the existing port 8080 bind test, add:

```powershell
# Test ports needed by Docker Compose stack
$requiredPorts = @(
    @{ Port = 80;   Name = "HTTP (Nginx)" },
    @{ Port = 443;  Name = "HTTPS (Nginx)" },
    @{ Port = 5432; Name = "PostgreSQL" },
    @{ Port = 6379; Name = "Redis" }
)

foreach ($p in $requiredPorts) {
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $p.Port)
        $listener.Start()
        Log "Ingress" "Port $($p.Port) ($($p.Name))" "PASS" "Available"
        $listener.Stop()
    } catch {
        Log "Ingress" "Port $($p.Port) ($($p.Name))" "FAIL" "In use or blocked: $($_.Exception.Message)"
    }
}
```

**Step 6: Add Docker enhancements to the Docker section**

After the existing Docker checks (inside the `if ($docker)` block, after the container→SMTP test), add:

```powershell
    # Linux container mode detection
    $dockerInfo = docker info --format '{{.OSType}}' 2>&1
    if ($dockerInfo -eq "linux") {
        Log "Docker" "Container Mode" "PASS" "Linux containers (required)"
    } else {
        Log "Docker" "Container Mode" "FAIL" "Windows containers active. Switch to Linux containers in Docker Desktop settings."
    }

    # Docker Compose V2 check
    $composeVersionRaw = docker compose version --short 2>&1
    if ($composeVersionRaw -match '^(\d+)\.') {
        $majorVersion = [int]$Matches[1]
        if ($majorVersion -ge 2) {
            Log "Docker" "Compose V2" "PASS" "Version $composeVersionRaw"
        } else {
            Log "Docker" "Compose V2" "FAIL" "Need Compose V2+, have $composeVersionRaw"
        }
    }

    # Real image pull test
    Write-Host "`n  Testing real image pull (postgres:15-alpine, ~80MB)..." -ForegroundColor Gray
    $pullStart = Get-Date
    $pullResult = docker pull postgres:15-alpine 2>&1
    $pullDuration = ((Get-Date) - $pullStart).TotalSeconds
    if ($LASTEXITCODE -eq 0) {
        Log "Docker" "Image Pull (postgres:15-alpine)" "PASS" "Pulled in $([math]::Round($pullDuration, 1))s"
    } else {
        Log "Docker" "Image Pull (postgres:15-alpine)" "FAIL" "Pull failed: $pullResult"
    }

    # Disk I/O test
    $testFile = "$env:TEMP\docker-disk-test.bin"
    $ioStart = Get-Date
    $bytes = New-Object byte[] (100MB)
    [System.IO.File]::WriteAllBytes($testFile, $bytes)
    $ioDuration = ((Get-Date) - $ioStart).TotalSeconds
    $ioSpeed = [math]::Round(100 / $ioDuration, 1)
    Remove-Item $testFile -Force -ErrorAction SilentlyContinue
    if ($ioSpeed -ge 50) {
        Log "Docker" "Disk I/O (100MB write)" "PASS" "$ioSpeed MB/s"
    } else {
        Log "Docker" "Disk I/O (100MB write)" "WARN" "$ioSpeed MB/s (may be slow for Docker builds)"
    }
```

**Step 7: Add new Section 5: GitHub Actions Runner**

Before the `# ── Summary ──` section, add:

```powershell
# ── Section 5: GitHub Actions Runner ──

$runnerService = Get-Service -Name "actions.runner.*" -ErrorAction SilentlyContinue
if ($runnerService) {
    Log "Runner" "Service Installed" "PASS" $runnerService.Name
    if ($runnerService.Status -eq 'Running') {
        Log "Runner" "Service Running" "PASS" "Status: Running"
    } else {
        Log "Runner" "Service Running" "WARN" "Status: $($runnerService.Status) — start with: Start-Service '$($runnerService.Name)'"
    }
} else {
    Log "Runner" "Service Installed" "INFO" "Not installed yet. Run setup-runner.ps1 after Docker is configured."
}

# Runner → GitHub API connectivity
try {
    $ghApi = Invoke-WebRequest -Uri "https://api.github.com/meta" -TimeoutSec 10 -UseBasicParsing
    Log "Runner" "GitHub API Access" "PASS" "HTTP $($ghApi.StatusCode)"
} catch {
    Log "Runner" "GitHub API Access" "FAIL" $_.Exception.Message
}
```

**Step 8: Commit**

```bash
git add scripts/network-diagnostic.ps1
git commit -m "feat(scripts): enhance network diagnostic for Docker staging + CI/CD runner"
```

---

## Task 16: Create Docker Compose Development Override

**Files:**
- Create: `docker-compose.override.yml` (project root)

**Context:** Docker Compose automatically loads `docker-compose.override.yml` when running `docker compose up` without `-f` flags. This override replaces Gunicorn with Django's dev server, adds volume mounts for hot reload, adds a Node container for React dev server, and exposes all ports for debugging. Developers who only want DB + Redis can run `docker compose up db redis` instead.

**Step 1: Create docker-compose.override.yml**

```yaml
# docker-compose.override.yml
# Development overrides — auto-loaded by docker compose up.
# Adds hot reload, exposed ports, and React dev server.
#
# For staging deployment, use: docker compose -f docker-compose.yml up -d
# For infrastructure only:     docker compose up db redis

services:
  # ── Database: expose port for local tools (pgAdmin, DBeaver) ──
  db:
    ports:
      - "5432:5432"

  # ── Redis: expose port for local tools (RedisInsight) ──
  redis:
    ports:
      - "6379:6379"

  # ── Backend: dev server with hot reload ──
  backend:
    build:
      context: ./backend/django_Admin3
      dockerfile: Dockerfile
    command: >
      bash -c "
        python manage.py migrate --noinput &&
        python manage.py createcachetable 2>/dev/null;
        python manage.py runserver 0.0.0.0:8000
      "
    environment:
      DJANGO_SETTINGS_MODULE: django_Admin3.settings.staging
      DEBUG: "True"
      PORT: "8000"
    volumes:
      - ./backend/django_Admin3:/app
    ports:
      - "8000:8000"
    # Disable healthcheck for faster startup in dev
    healthcheck:
      disable: true

  # ── Worker: same source mount ──
  worker:
    volumes:
      - ./backend/django_Admin3:/app

  # ── Nginx: disabled in dev (use backend + frontend directly) ──
  nginx:
    profiles:
      - staging-only

  # ── Frontend: React dev server with hot reload ──
  frontend:
    image: node:20-alpine
    working_dir: /app
    command: sh -c "npm install && npm start"
    environment:
      REACT_APP_API_BASE_URL: http://localhost:8000
      REACT_APP_DISABLE_RECAPTCHA: "true"
    volumes:
      - ./frontend/react-Admin3:/app
      - frontend_node_modules:/app/node_modules
    ports:
      - "3000:3000"
    networks:
      - frontend

volumes:
  frontend_node_modules:
```

**Step 2: Verify override merges correctly**

```bash
docker compose config --services
```

Expected: Lists `db`, `redis`, `backend`, `worker`, `nginx`, `frontend` (6 services — nginx present but in `staging-only` profile).

**Step 3: Commit**

```bash
git add docker-compose.override.yml
git commit -m "feat(docker): add development override with hot reload and exposed ports"
```

---

## Task 17: Update .gitignore and Final Commit

**Files:**
- Modify: `.gitignore` (project root)

**Step 1: Ensure Docker and environment files are ignored**

Verify these entries exist in `.gitignore`. Add any that are missing:

```
# Docker
.env

# SSL certificates (generated at runtime)
nginx/ssl/
```

**Step 2: Final verification commit**

```bash
git add -A
git status
```

Verify no secrets or generated files are staged. Then:

```bash
git commit -m "feat(docker): complete Docker Compose staging deployment setup

- 5-service Docker stack: PostgreSQL, Redis, Django, email worker, Nginx
- Nginx with self-signed SSL, React SPA, and Django API proxy
- Django staging settings with Redis cache
- GitHub Actions CI/CD with self-hosted runner
- Development override with hot reload
- Enhanced network diagnostic script (10 new checks)"
```

---

## Post-Implementation: Server Setup Sequence

After all files are committed, deploy to the Windows Server 2019 staging environment:

1. **Run network diagnostic** (from the server):
   ```powershell
   .\scripts\network-diagnostic.ps1
   ```
   Fix any FAIL results before proceeding.

2. **Install Docker Desktop** on the server (download from docker.com). Switch to Linux containers.

3. **Re-run network diagnostic** (Docker checks will now run).

4. **Install self-hosted runner**:
   ```powershell
   .\scripts\setup-runner.ps1 -RepoUrl "https://github.com/OWNER/Admin3" -Token "AXXXXXX..."
   ```

5. **Create `.env` on server** in the repo directory (copy from `.env.example`, fill in real values).

6. **Create `staging` branch and push**:
   ```bash
   git checkout -b staging
   git push -u origin staging
   ```

7. **Verify auto-deployment** — check GitHub Actions for the workflow run, then access `https://<server-ip>/`.

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `docker compose up -d` | Start staging stack (no override) |
| `docker compose up` | Start dev stack (with override, hot reload) |
| `docker compose up db redis` | Start infra only (for native Django/React dev) |
| `docker compose down` | Stop all containers |
| `docker compose logs -f backend` | Follow backend logs |
| `docker compose exec backend python manage.py migrate` | Run migrations |
| `docker compose exec backend python manage.py test` | Run backend tests |
| `docker compose -f docker-compose.yml up -d` | Force staging mode (skip override) |
