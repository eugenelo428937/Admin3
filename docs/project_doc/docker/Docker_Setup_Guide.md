# Admin3 Docker Setup Guide

This guide covers how to build and run the Admin3 Docker Compose stack for both **staging deployment** (Windows Server 2019) and **local development** (Windows 11 with Docker Desktop).

---

## Architecture Overview

The stack runs 5 containers on two isolated Docker networks:

```
                        Internet / LAN
                              |
                    +---------+---------+
                    |   Nginx (:80/443) |   frontend network
                    |   React SPA +     |
                    |   Reverse Proxy   |
                    +--------+----------+
                             |
               +-------------+-------------+
               |                           |
      +--------+--------+       +---------+---------+
      |  Backend (:8888) |       |   Worker (email)  |   backend network
      |  Django/Gunicorn  |       |   process_email   |
      +--------+----------+       +--------+----------+
               |                           |
        +------+------+            +-------+-------+
        | PostgreSQL   |            |    Redis      |
        | (:5432)      |            |    (:6379)    |
        +--------------+            +---------------+
```

| Service    | Image               | Role                                      |
|------------|----------------------|-------------------------------------------|
| **db**     | postgres:17-alpine   | PostgreSQL with `acted` and `adm` schemas  |
| **redis**  | redis:7-alpine       | Cache backend (django-redis)               |
| **backend**| Custom (Gunicorn)    | Django REST API on port 8888               |
| **worker** | Custom (same image)  | Email queue processor                      |
| **nginx**  | Custom (nginx:alpine)| Reverse proxy, SSL termination, React SPA  |

---

## Prerequisites

- **Docker Desktop** installed and running (Linux containers mode)
- **Git** for cloning the repository
- Minimum **8 GB RAM** (16 GB recommended for 5-container stack)
- Minimum **20 GB free disk** (40 GB recommended for images + build cache)

### Verify Docker Installation

```powershell
docker --version           # Docker Engine 24+
docker compose version     # Docker Compose V2+
docker info --format '{{.OSType}}'  # Must show "linux"
```

---

## 1. Environment Configuration

### Create the `.env` File

```bash
cp .env.example .env
```

Edit `.env` and set the **required** secrets:

```ini
# ── Database ──
POSTGRES_DB=ACTEDDBSTAGE01
POSTGRES_USER=actedadmin
POSTGRES_PASSWORD=<your-strong-password>

# ── Redis ──
REDIS_PASSWORD=<your-redis-password>

# ── Django ──
DJANGO_SECRET_KEY=<generate-with-command-below>

# ── Server Identity ──
SERVER_NAME=staging.acted.local
ALLOWED_HOSTS=staging.acted.local,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=https://staging.acted.local,https://localhost
CSRF_TRUSTED_ORIGINS=https://staging.acted.local,https://localhost
FRONTEND_URL=https://staging.acted.local
```

### Generate a Django Secret Key

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Or without Django installed:

```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

### Environment Variables Reference

| Variable                | Required | Default                     | Description                          |
|-------------------------|----------|-----------------------------|--------------------------------------|
| `POSTGRES_DB`           | No       | `ACTEDDBSTAGE01`            | Database name                        |
| `POSTGRES_USER`         | No       | `actedadmin`                | Database user                        |
| `POSTGRES_PASSWORD`     | **Yes**  | -                           | Database password (fails without it) |
| `REDIS_PASSWORD`        | No       | `changeme`                  | Redis authentication password        |
| `DJANGO_SECRET_KEY`     | **Yes**  | -                           | Django cryptographic key             |
| `SERVER_NAME`           | No       | `staging.acted.local`       | Nginx server name for SSL cert       |
| `ALLOWED_HOSTS`         | No       | `*`                         | Django allowed hosts (CSV)           |
| `CORS_ALLOWED_ORIGINS`  | No       | `https://localhost`         | CORS origins (CSV)                   |
| `CSRF_TRUSTED_ORIGINS`  | No       | `https://localhost`         | CSRF trusted origins (CSV)           |
| `FRONTEND_URL`          | No       | `https://localhost`         | Frontend URL for emails/redirects    |
| `HTTP_PORT`             | No       | `80`                        | Host HTTP port                       |
| `HTTPS_PORT`            | No       | `443`                       | Host HTTPS port                      |
| `USE_INTERNAL_SMTP`     | No       | `False`                     | Use internal SMTP relay              |
| `EMAIL_HOST`            | No       | `host.docker.internal`      | SMTP server address                  |
| `DEV_EMAIL_OVERRIDE`    | No       | `True`                      | Redirect all emails to dev recipient |
| `DEV_EMAIL_RECIPIENTS`  | No       | -                           | Override email recipient (CSV)       |

---

## 2. Staging Deployment (Full Stack)

Staging runs all 5 containers with Nginx serving the React SPA and proxying API requests to Django.

### Build All Images

```bash
docker compose -f docker-compose.yml build
```

This builds:
- **backend/worker**: Python 3.14 slim with Django dependencies
- **nginx**: Multi-stage build (Node 20 builds React, then copies to nginx:alpine)

### Start the Stack

```bash
docker compose -f docker-compose.yml up -d
```

Startup order (enforced by health checks):
1. **db** starts, waits for `pg_isready`
2. **redis** starts, waits for `PING` response
3. **backend** + **worker** start after db and redis are healthy
4. **nginx** starts after backend is healthy

### Verify Health

```bash
# Container status with health
docker compose -f docker-compose.yml ps

# Expected output: all services show "healthy"
# NAME      SERVICE   STATUS          PORTS
# admin3-db-1       db        running (healthy)
# admin3-redis-1    redis     running (healthy)
# admin3-backend-1  backend   running (healthy)
# admin3-worker-1   worker    running (healthy)
# admin3-nginx-1    nginx     running (healthy)   0.0.0.0:80->80, 0.0.0.0:443->443
```

### Test Endpoints

```bash
# Nginx health (HTTP)
curl http://localhost/health
# Expected: OK

# Django API health (HTTPS)
curl https://localhost/api/health/
# Expected: {"status": "ok"}
# (use -k flag if using self-signed certs instead of mkcert)

# React SPA
curl https://localhost/
# Expected: HTML page
```

### View Logs

```bash
# All services
docker compose -f docker-compose.yml logs -f

# Specific service
docker compose -f docker-compose.yml logs backend --tail 50
docker compose -f docker-compose.yml logs nginx --tail 20
docker compose -f docker-compose.yml logs worker --tail 20
```

### Stop the Stack

```bash
# Stop containers (preserves data volumes)
docker compose -f docker-compose.yml down

# Stop and remove all data (full reset)
docker compose -f docker-compose.yml down -v
```

---

## 3. Development Mode (Hot Reload)

Development uses `docker-compose.override.yml` (auto-loaded) which adds:
- Django `runserver` with source code volume mount (hot reload)
- React dev server on port 3000 with hot reload
- Exposed database (5432) and Redis (6379) ports for local tools
- Nginx disabled (access backend and frontend directly)

### Start Development Stack

```bash
# Full dev stack (all services + React dev server)
docker compose up

# Or just infrastructure (run Django/React natively on host)
docker compose up db redis
```

### Development Ports

| Service    | URL                    | Purpose                                    |
|------------|------------------------|--------------------------------------------|
| Backend    | http://localhost:8888  | Django API (runserver)                     |
| Frontend   | http://localhost:3000  | React dev server                           |
| PostgreSQL | localhost:5433         | Direct DB access (pgAdmin, avoids local PG conflict) |
| Redis      | localhost:6379         | Direct Redis access                        |

### Infrastructure-Only Mode

If you prefer running Django and React natively on your host (faster iteration):

```bash
# Start only database and Redis
docker compose up db redis
```

Then in separate terminals:

```bash
# Terminal 1: Django backend
cd backend/django_Admin3
.\.venv\Scripts\activate
python manage.py runserver 8888

# Terminal 2: React frontend
cd frontend/react-Admin3
npm start
```

---

## 4. Common Operations

### Rebuild a Single Service

```bash
docker compose -f docker-compose.yml build backend
docker compose -f docker-compose.yml up -d backend
```

### Run Django Management Commands

```bash
# Run migrations
docker compose -f docker-compose.yml exec backend python manage.py migrate

# Create superuser
docker compose -f docker-compose.yml exec backend python manage.py createsuperuser

# Collect static files
docker compose -f docker-compose.yml exec backend python manage.py collectstatic --noinput

# Open Django shell
docker compose -f docker-compose.yml exec backend python manage.py shell
```

### Access Container Shell

```bash
docker compose -f docker-compose.yml exec backend bash
docker compose -f docker-compose.yml exec db psql -U actedadmin -d ACTEDDBSTAGE01
docker compose -f docker-compose.yml exec redis redis-cli
```

### Database Backup and Restore

```bash
# Backup
docker compose -f docker-compose.yml exec db pg_dump -U actedadmin ACTEDDBSTAGE01 > backup.sql

# Restore
docker compose -f docker-compose.yml exec -T db psql -U actedadmin ACTEDDBSTAGE01 < backup.sql
```

### Clean Up Docker Resources

```bash
# Remove old images (older than 7 days)
docker image prune -f --filter "until=168h"

# Remove all unused resources
docker system prune -f

# Check disk usage
docker system df
```

---

## 5. SSL Certificates

### Local Development (mkcert — recommended)

The stack uses [mkcert](https://github.com/FiloSottile/mkcert)
locally-trusted certificates by default. These are bind-mounted
into the nginx container from the project root:

```yaml
# docker-compose.yml nginx volumes:
- ./localhost+1.pem:/etc/nginx/ssl/server.crt:ro
- ./localhost+1-key.pem:/etc/nginx/ssl/server.key:ro
```

**Setup (one-time):**

```bash
# Install mkcert and create local CA
brew install mkcert   # macOS
mkcert -install       # trust the CA in your system/browsers

# Generate cert for localhost + 127.0.0.1
cd /path/to/Admin3
mkcert localhost 127.0.0.1
# Creates: localhost+1.pem and localhost+1-key.pem
```

Browsers will show a **trusted padlock** with no security warning.

### Self-Signed Fallback (staging servers)

If mkcert certs are not present, the nginx container
auto-generates a self-signed certificate on first boot using
`nginx/generate-cert.sh`. Browsers will show a security warning
— click "Advanced" → "Proceed" to accept.

### Replace with Real Certificate

Mount your cert files into the nginx container:

```yaml
# In docker-compose.yml, under nginx.volumes:
volumes:
  - ./certs/server.crt:/etc/nginx/ssl/server.crt:ro
  - ./certs/server.key:/etc/nginx/ssl/server.key:ro
```

---

## 6. Network Architecture

The stack uses two isolated Docker networks:

| Network      | Services                    | Purpose                            |
|--------------|-----------------------------|------------------------------------|
| **frontend** | nginx, backend              | HTTP traffic between proxy and API |
| **backend**  | backend, worker, db, redis  | Internal services (no port expose) |

- **db** and **redis** are only accessible from the backend network (not exposed to the host in staging mode)
- **nginx** is the only service with published ports (80, 443)
- **worker** shares the backend network for database and Redis access

---

## 7. File Structure

```
Admin3/
  .dockerignore               # Prevents secrets from entering build context
  .env                        # Secrets (git-ignored, create from .env.example)
  .env.example                # Template for .env
  docker-compose.yml          # Staging stack (5 services)
  docker-compose.override.yml # Dev overrides (auto-loaded)
  docker/
    init.sql                  # PostgreSQL schema init (acted, adm)
  nginx/
    Dockerfile                # Multi-stage: React build + Nginx
    nginx.conf                # Reverse proxy + SPA config
    generate-cert.sh          # Self-signed SSL cert generator
  backend/django_Admin3/
    Dockerfile                # Python backend image
    .env.staging              # Non-secret staging defaults
    django_Admin3/settings/
      staging.py              # Django staging settings
  frontend/react-Admin3/
    .env.staging              # React build env (empty API URL = same-origin)
```

---

## 8. Troubleshooting

### Container won't start

```bash
# Check logs for the failing service
docker compose -f docker-compose.yml logs <service-name>

# Check if port is already in use
netstat -ano | findstr :80
netstat -ano | findstr :443
```

### Database connection refused

- Ensure the `db` container is healthy: `docker compose ps db`
- Check if `.env` has `POSTGRES_PASSWORD` set
- The backend waits for `db` health check before starting

### Redis connection refused

- Ensure `REDIS_PASSWORD` in `.env` matches what Redis is configured with
- Check Redis logs: `docker compose logs redis`

### Nginx 502 Bad Gateway

- Backend isn't ready yet. Check: `docker compose logs backend`
- Ensure backend health check passes: `curl http://localhost:8888/api/health/` (from inside the container)

### Build fails for nginx (React)

- The nginx Dockerfile uses the project root as build context
- Check `.dockerignore` isn't excluding needed files
- Ensure `frontend/react-Admin3/package-lock.json` exists

### "Set POSTGRES_PASSWORD in .env" error

- Docker Compose uses `${VAR:?message}` syntax for required variables
- Create `.env` from `.env.example` and fill in all required values

---

## 9. CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/deploy-staging.yml`) automates deployment:

1. **Push to `staging` branch** triggers the pipeline
2. **Job 1**: Run backend tests on GitHub-hosted Ubuntu runner
3. **Job 2**: Run frontend tests and build on GitHub-hosted runner
4. **Job 3**: Deploy on self-hosted Windows runner:
   - `docker compose build` (with layer caching)
   - `docker compose down`
   - `docker compose up -d`
   - Health check verification (fails job if unhealthy)
   - Automatic rollback instructions on failure

### Self-Hosted Runner Setup

Run `scripts/setup-runner.ps1` on the Windows Server to install the GitHub Actions runner:

```powershell
.\scripts\setup-runner.ps1 `
  -RepoUrl "https://github.com/your-org/Admin3" `
  -Token "<runner-registration-token>" `
  -Labels "staging"
```

See `scripts/setup-runner.ps1` for full parameters.

---

## 10. Network Diagnostics

Before deploying to a new server, run the network diagnostic script to verify requirements:

```powershell
# Run as Administrator
.\scripts\network-diagnostic.ps1
```

This checks:
- System requirements (RAM, disk, Hyper-V, Containers feature)
- Network egress (Docker Hub, npm, PyPI, GitHub, SMTP relay, DNS, TLS, Git)
- Network ingress (firewall, port availability for 80/443/5432/6379)
- Docker status (version, Compose V2, Linux mode, image pull, disk I/O)
- GitHub Actions runner (service status, GitHub API connectivity)

Results are saved to `network-diagnostic-results-<timestamp>.txt`.

---

## 11. LAN Access for Staging (Company Network Only)

The staging machine runs Docker containers inside WSL2. By default, the app is only accessible on the host at `127.0.0.1:8443`. This section covers exposing it to other machines on the company LAN without any public internet exposure.

### Prerequisites

- The staging machine is domain-joined (DomainAuthenticated network profile)
- Docker containers are running inside WSL2
- The app is accessible locally at `https://127.0.0.1:8443/home`

### Step 1: Docker — Bind to All Interfaces

Ensure the container port is bound to `0.0.0.0` (all interfaces), not just `127.0.0.1`.

In `docker-compose.yml`:

```yaml
services:
  nginx:
    ports:
      - "0.0.0.0:8443:443"    # Binds to all interfaces
```

Verify with:

```powershell
docker ps --format "table {{.Names}}\t{{.Ports}}"
# Should show: 0.0.0.0:8443->443/tcp (NOT 127.0.0.1:8443->443/tcp)
```

### Step 2: WSL2 — Port Forwarding from Host to WSL

WSL2 runs in a lightweight VM with its own network. Windows auto-forwards localhost ports but **not** external LAN traffic. A port proxy bridges this gap.

**Create the port proxy** (run as Administrator in PowerShell):

```powershell
# Find WSL2's internal IP
wsl hostname -I
# Example output: 172.28.144.1

# Create port forwarding rule
netsh interface portproxy add v4tov4 `
  listenport=8443 `
  listenaddress=0.0.0.0 `
  connectport=8443 `
  connectaddress=<WSL_IP>
```

Replace `<WSL_IP>` with the IP from `wsl hostname -I`.

**Verify:**

```powershell
netsh interface portproxy show all
```

**Important:** WSL2's IP can change on reboot. To automate, create a startup script:

```powershell
# Save as C:\Scripts\wsl-portforward.ps1
$wslIp = (wsl hostname -I).Trim()
netsh interface portproxy delete v4tov4 listenport=8443 listenaddress=0.0.0.0 2>$null
netsh interface portproxy add v4tov4 `
  listenport=8443 `
  listenaddress=0.0.0.0 `
  connectport=8443 `
  connectaddress=$wslIp
Write-Host "Port 8443 forwarded to WSL at $wslIp"
```

Add this to **Task Scheduler** to run at logon (with "Run with highest privileges" enabled).

### Step 3: Windows Firewall — Allow LAN Only

This is the key security step. The firewall rule restricts access to the company subnet only.

#### Determine Your Company Subnet

Run on the staging machine:

```powershell
# Show network adapters with IP and prefix length
Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -ne '127.0.0.1' } |
  Format-Table InterfaceAlias, IPAddress, PrefixLength
```

**How to identify the correct adapter:**

| Adapter                          | IP Range        | What It Is                     |
|----------------------------------|-----------------|--------------------------------|
| **Ethernet** (or Wi-Fi)         | Corporate IP    | Your LAN adapter — use this    |
| vEthernet (WSL ...)             | `172.x.x.x`    | WSL2 virtual bridge — ignore   |
| Local Area Connection / Bluetooth| `169.254.x.x`  | APIPA (no DHCP) — ignore       |

Look for the **Ethernet** or **Wi-Fi** adapter with a non-`169.254.x.x` IP. That is your corporate LAN address.

**Current staging machine values:**

| Adapter    | IP           | PrefixLength | RemoteAddress (CIDR) |
|------------|--------------|--------------|----------------------|
| Ethernet   | `7.32.1.138` | 24           | **`7.32.1.0/24`**    |

To calculate CIDR: zero out the host portion of the IP and append `/PrefixLength`.
For example, `7.32.1.138` with prefix `24` → keep first 3 octets, zero the last → `7.32.1.0/24`.

#### Create the Firewall Rule

```powershell
# Run as Administrator
New-NetFirewallRule `
  -DisplayName "Admin3 Staging (LAN Only)" `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort 8443 `
  -RemoteAddress 7.32.1.0/24 `
  -Action Allow `
  -Profile Domain
```

> To use a different subnet, replace `7.32.1.0/24` with your CIDR range.

> **Note:** The `-Profile Domain` is used because the staging machine is domain-joined
> (DomainAuthenticated). This ensures the rule only applies when connected to the
> corporate domain network. If the machine were not domain-joined, use `-Profile Private`.

**Verify the rule:**

```powershell
Get-NetFirewallRule -DisplayName "Admin3 Staging*" | Format-Table DisplayName, Enabled, Profile, Action
```

**To remove later:**

```powershell
Remove-NetFirewallRule -DisplayName "Admin3 Staging (LAN Only)"
```

### Step 4: Verify Network Profile

Confirm the staging machine's network profile:

```powershell
Get-NetConnectionProfile
```

Expected output for a domain-joined machine:

```
Name             : acted.local
InterfaceAlias   : Ethernet
NetworkCategory  : DomainAuthenticated
```

`DomainAuthenticated` means the machine is joined to an Active Directory domain. The firewall rule with `-Profile Domain` will be active on this network.

### Step 5: Access from Other Machines

Find the staging machine's LAN IP:

```powershell
# On the staging machine
ipconfig | findstr "IPv4"
```

**Current staging IP:** `7.32.1.138`

Other machines on the LAN access the app at:

```
https://7.32.1.138:8443/home
```

> **SSL certificate warning:** Browsers will show a certificate warning because the
> self-signed cert was issued for `localhost`/`127.0.0.1`, not the LAN IP. Users can
> click "Advanced" → "Proceed" to accept. To eliminate this, regenerate the cert to
> include the LAN IP or hostname (see Section 5: SSL Certificates).

### Step 6: Update ALLOWED_HOSTS and CORS (if needed)

If Django returns `400 Bad Request` when accessed by LAN IP, add the staging machine's IP to `.env`:

```ini
ALLOWED_HOSTS=staging.acted.local,localhost,127.0.0.1,7.32.1.138
CORS_ALLOWED_ORIGINS=https://staging.acted.local,https://localhost,https://7.32.1.138:8443
CSRF_TRUSTED_ORIGINS=https://staging.acted.local,https://localhost,https://7.32.1.138:8443
```

Then restart the backend:

```bash
docker compose -f docker-compose.yml restart backend
```

### Security Summary

| Layer              | What It Does                                        |
|--------------------|-----------------------------------------------------|
| Docker ports       | Binds to `0.0.0.0` so traffic can reach the container |
| WSL2 port proxy    | Forwards external traffic from Windows host to WSL VM |
| Windows Firewall   | Restricts inbound to company subnet only (Domain profile) |
| No router exposure | No port forwarding on the office router = no public access |
