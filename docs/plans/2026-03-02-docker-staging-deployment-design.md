# Docker Staging Deployment Design

**Date:** 2026-03-02
**Status:** Draft
**Branch:** TBD (new feature branch from `main`)

## Problem Statement

Admin3 currently deploys to Railway for UAT but has no staging environment that mirrors production. The staging server (Windows Server 2019) needs a fully containerized deployment with automated CI/CD triggered by pushes to a `staging` branch.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database | Local PostgreSQL in Docker | Self-contained, no external dependency |
| CI/CD trigger | GitHub Actions self-hosted runner | No inbound ports, free for private repos, direct Docker access |
| Frontend serving | Nginx container | Reverse proxy + static files + SSL in one container |
| Cache | Redis in Docker | Mirrors production (`production.py` uses Redis) |
| Email worker | Included | Full production-like stack (5 containers) |
| SSL | Self-signed certificate | Catches SSL-related bugs, easy to swap for real cert later |

## Architecture

### Staging Environment (Windows Server 2019)

```
┌─────────────────────────────────────────────────────┐
│  Windows Server 2019 (Staging)                      │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │  Docker Compose Stack                        │   │
│  │                                              │   │
│  │  ┌─────────┐  ┌─────────┐  ┌────────────┐   │   │
│  │  │ Nginx   │  │ Django  │  │ Email      │   │   │
│  │  │ :80/443 │→ │ :8000   │  │ Worker     │   │   │
│  │  │ (SSL)   │  │ Gunicorn│  │ (queue)    │   │   │
│  │  └─────────┘  └────┬────┘  └────────────┘   │   │
│  │                    │                         │   │
│  │  ┌─────────┐  ┌────┴────┐                    │   │
│  │  │ Redis   │  │Postgres │                    │   │
│  │  │ :6379   │  │ :5432   │                    │   │
│  │  └─────────┘  └─────────┘                    │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │  GitHub Actions Self-Hosted Runner           │   │
│  │  Listens for pushes to `staging` branch      │   │
│  │  Runs: docker compose pull && up -d          │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Development Environment (Windows 11)

Same `docker-compose.yml` with an override file adding:
- Volume-mounted source code for hot reload
- Django `runserver` instead of Gunicorn
- Separate Node container for React dev server (`npm start`)
- All ports exposed (5432, 6379, 8000, 3000)
- `DEBUG=True`

## Docker Compose Stack

### Services (5 production, 6 development)

| Service | Image | Ports | Networks | Purpose |
|---------|-------|-------|----------|---------|
| `db` | `postgres:15-alpine` | 5432 (dev only) | backend | Database with `acted`/`adm` schemas |
| `redis` | `redis:7-alpine` | 6379 (dev only) | backend | Cache (mirrors production.py) |
| `backend` | Custom (existing Dockerfile, modified) | 8000 (internal) | frontend, backend | Django/Gunicorn |
| `worker` | Same as backend | none | backend | Email queue processor |
| `nginx` | Custom (multi-stage: Node build + Nginx) | 80, 443 | frontend | Reverse proxy, SSL, static files |
| `frontend` | `node:20-alpine` (dev override only) | 3000 (dev only) | frontend | React dev server with hot reload |

### Networks

- **frontend**: `nginx` ↔ `backend` (and `frontend` in dev)
- **backend**: `backend` ↔ `db`, `redis`, `worker`

### Volumes

- `postgres_data`: Persistent database storage
- `redis_data`: Persistent cache
- `static_files`: Shared between backend (collectstatic) and nginx

### Database Initialization

PostgreSQL init script (`docker/init.sql`) runs on first boot:

```sql
CREATE SCHEMA IF NOT EXISTS acted;
CREATE SCHEMA IF NOT EXISTS adm;
```

## Nginx Configuration

### Routing

```
HTTPS :443
    │
    ▼
┌─────────────┐
│    Nginx     │
│              │
│  /api/*  ────→  backend:8000 (Gunicorn)
│  /admin/* ───→  backend:8000 (Gunicorn)
│  /static/* ──→  /usr/share/nginx/static/ (volume)
│  /*  ────────→  /usr/share/nginx/html/ (React build)
│              │
│  HTTP :80 ───→  301 redirect to HTTPS
└─────────────┘
```

### Key features

- Proxy headers: `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`
- Gzip compression for JS, CSS, JSON, HTML
- Client max body size: 10M
- Static file caching: 1 year for hashed assets
- Health check endpoint: `/health` returns 200 from Nginx directly

### Nginx Dockerfile (multi-stage)

```dockerfile
# Stage 1: Build React
FROM node:20-alpine AS frontend-build
COPY frontend/react-Admin3/ .
RUN npm ci && CI=false npm run build

# Stage 2: Nginx
FROM nginx:alpine
COPY --from=frontend-build /build /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/nginx.conf
```

### SSL

Self-signed certificate generated on first boot via `generate-cert.sh`. Valid 365 days. Mountable volume allows swapping for a real certificate later.

## CI/CD Pipeline

### Branch Strategy

```
main ──────── production (future)
uat ────────── Railway auto-deploy (existing, unchanged)
staging ────── Windows Server auto-deploy (new)
develop ────── feature branches merge here
```

### Workflow: `.github/workflows/deploy-staging.yml`

```
Push to `staging` branch
        │
        ▼
┌─────────────────────────┐
│  Job 1: test            │  (runs-on: ubuntu-latest)
│  - Backend tests        │
│  - Frontend tests       │
│  - Both must pass       │
└───────────┬─────────────┘
            │ needs: test
            ▼
┌─────────────────────────┐
│  Job 2: build-and-push  │  (runs-on: ubuntu-latest)
│  - Build backend image  │
│  - Build nginx+frontend │
│  - Push to GHCR tagged  │
│    with git SHA          │
└───────────┬─────────────┘
            │ needs: build-and-push
            ▼
┌─────────────────────────┐
│  Job 3: deploy          │  (runs-on: self-hosted)
│  - docker compose pull  │
│  - docker compose up -d │
│  - Health check /health │
│  - Rollback on failure  │
└─────────────────────────┘
```

### Image Strategy

- Images pushed to `ghcr.io/<org>/admin3-backend:<sha>` and `ghcr.io/<org>/admin3-nginx:<sha>`
- Also tagged as `ghcr.io/<org>/admin3-backend:staging` (rolling latest)
- Rollback: pull previous SHA-tagged image

### Self-Hosted Runner

- Installed as a Windows Service (survives reboots)
- Runs under a dedicated `github-runner` service account with Docker group membership
- Setup automated via `scripts/setup-runner.ps1`

## Django Staging Settings

### `staging.py` — between UAT and Production

| Concern | UAT (Railway) | Staging (Docker) | Production (IIS) |
|---------|---------------|-------------------|-------------------|
| Web Server | Gunicorn | Gunicorn | IIS + waitress |
| Database | Railway Postgres | Docker Postgres | AWS RDS Postgres |
| Cache | DatabaseCache | Redis (Docker) | Redis (server) |
| Static Files | WhiteNoise | Nginx volume | IIS static |
| SSL | Railway auto | Self-signed | Org certificate |
| Email | SendGrid | SMTP relay | SMTP relay |
| Logging | Console | File + Console | Rotating files |
| DEBUG | False | False | False |

### Key settings

- Inherits from `base.py`
- `ALLOWED_HOSTS` from env var (server IP + internal hostname)
- Redis cache: `redis://redis:6379/0` (Docker service name)
- Database: `db:5432` (Docker service name)
- WhiteNoise disabled (Nginx serves static files)
- File logging to Docker volume
- `SECURE_SSL_REDIRECT = True`

## Environment Files

| File | Purpose | Committed |
|------|---------|-----------|
| `backend/django_Admin3/.env.staging` | DB host, Redis host, container-internal names | Yes |
| `frontend/react-Admin3/.env.staging` | `REACT_APP_API_URL=https://<server-ip>` | Yes (template) |
| `.env` (root, for Compose) | `POSTGRES_PASSWORD`, `DJANGO_SECRET_KEY`, `GHCR_TOKEN` | No (`.env.example` committed) |

## Network Diagnostic Enhancements

The existing `scripts/network-diagnostic.ps1` needs 10 additional checks for the Docker + self-hosted runner architecture:

| # | Missing Check | Section | Severity |
|---|--------------|---------|----------|
| 1 | GitHub Actions runner URLs (`*.actions.githubusercontent.com`, `pipelines.actions.githubusercontent.com`) | Egress | FAIL if blocked |
| 2 | Docker Linux container mode detection | Docker | FAIL if Windows mode |
| 3 | Port conflicts for 80, 443, 5432, 6379 | Ingress | FAIL if occupied |
| 4 | DNS resolution (`registry-1.docker.io`, `auth.docker.io`) | Egress | FAIL if unresolvable |
| 5 | Real image pull test (`postgres:15-alpine` ~80MB) | Docker | WARN on slow/fail |
| 6 | Git clone/pull (HTTPS `ls-remote`) | Egress | FAIL if blocked |
| 7 | RAM recommendation raised to 16GB | System | WARN if < 16GB |
| 8 | TLS 1.2 enforcement check | Egress | FAIL if < TLS 1.2 |
| 9 | Docker Compose V2 version parse | Docker | FAIL if V1 |
| 10 | Disk I/O speed test (write 100MB) | System | WARN if slow |

Additional new section:

| # | Check | Section | Severity |
|---|-------|---------|----------|
| 11 | Runner service installed | Runner | INFO |
| 12 | Runner service running | Runner | WARN if stopped |
| 13 | Runner can reach GitHub API | Runner | FAIL if blocked |

Script runs in 3 stages based on what's installed: pre-Docker, post-Docker, post-runner.

## New Files

```
Admin3/
├── docker-compose.yml                          # 5-service production stack
├── docker-compose.override.yml                 # Dev overrides (hot reload, exposed ports)
├── .env.example                                # Root env template (DB passwords, secrets)
│
├── nginx/
│   ├── Dockerfile                              # Multi-stage: Node build → Nginx Alpine
│   ├── nginx.conf                              # Reverse proxy, SSL, static files
│   └── generate-cert.sh                        # Self-signed cert generator
│
├── backend/django_Admin3/
│   ├── django_Admin3/settings/staging.py       # New staging settings
│   └── .env.staging                            # Staging env vars
│
├── frontend/react-Admin3/
│   └── .env.staging                            # Staging API URL
│
├── docker/
│   └── init.sql                                # Creates acted + adm schemas
│
├── .github/workflows/
│   └── deploy-staging.yml                      # Self-hosted runner pipeline
│
└── scripts/
    ├── network-diagnostic.ps1                  # Enhanced (10 new checks)
    └── setup-runner.ps1                        # GitHub Actions runner installer
```

**Total: 13 new files, 1 modified file**

## Implementation Phases

### Phase 1: Docker Stack
1. `docker-compose.yml` — full 5-service stack
2. `nginx/` — Dockerfile, nginx.conf, cert generator
3. `staging.py` + `.env` files
4. `docker/init.sql` — schema initialization
5. Test: `docker compose up` locally

### Phase 2: CI/CD Pipeline
6. `deploy-staging.yml` — GitHub Actions workflow
7. `setup-runner.ps1` — runner installation script
8. GHCR image push configuration
9. Test: push to staging branch, verify auto-deploy

### Phase 3: Network & Server Setup
10. Enhanced `network-diagnostic.ps1`
11. Run diagnostics on Windows Server 2019
12. Install Docker Desktop + self-hosted runner on server
13. First staging deployment

### Phase 4: Development Environment
14. `docker-compose.override.yml` — dev overrides
15. Developer workflow documentation
16. End-to-end test on Windows 11

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Server network blocks Docker Hub/GHCR | Cannot pull images | Run network diagnostic first; fallback to `docker save/load` offline approach |
| Server RAM < 16GB | Containers OOM | Redis memory limit in Compose; reduce Gunicorn workers |
| Docker on Server 2019 Hyper-V performance | Slow container startup | Use Alpine-based images; pre-pull images |
| Self-hosted runner security | Code execution on server | Dedicated service account, restrict to `staging` branch only |
| SSL certificate warnings | Browser blocks in testing | Document how to accept self-signed cert; add to trusted store |
