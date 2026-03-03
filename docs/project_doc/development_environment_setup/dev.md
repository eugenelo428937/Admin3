# Developement Environment Setup

1. Install docker destop. Download Docker Desktop Installer.exe [https://www.docker.com/products/docker-desktop/](docker)

2. wsl --update

3. setup repo

4. run local

5. run local docker
Docker Deployment — Local Machine
1. Prerequisites

Docker Desktop installed and running
2. Generate a secret key (one-time)


python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
3. Update your .env with the generated key and Docker-appropriate values:


# ── Database ──
DB_NAME=email_system
DB_USER=email_admin
DB_PASSWORD=CHANGE_ME_SECURE_PASSWORD
DB_HOST=127.0.0.1
DB_PORT=5432

# ── Django ──
DJANGO_SECRET_KEY=<paste-generated-key-here>
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

# ── SMTP ──
EMAIL_HOST=10.20.3.4
EMAIL_PORT=25

# ── Docker ──
EXPOSED_PORT=8080
Note: DB_HOST in .env is only used by your local dev server. Docker Compose overrides it to postgres (the container hostname) internally.

4. Build and start (from project root)


docker compose up --build -d
This builds and starts 4 services:

Service	What it does
postgres	PostgreSQL 16, data persisted in pgdata volume
django	Gunicorn serving the API on port 8888 (internal)
queue-worker	Runs process_email_queue every 30s
nginx	React SPA + reverse proxy on port 8080 (exposed)



5. Run migrations (first time only)


docker compose exec django python manage.py migrate
6. Create a superuser (first time only)


docker compose exec django python manage.py createsuperuser
7. Access the app

URL	What
http://localhost:8080	React frontend
http://localhost:8080/api/email/	API
http://localhost:8080/django-admin/	Django admin
8. Useful commands


docker compose logs -f          # Follow all logs
docker compose logs django      # Django logs only
docker compose ps               # Check service status
docker compose down             # Stop everything
docker compose down -v          # Stop + delete database volume
docker compose up --build -d    # Rebuild after code changes

---

## 9. When to rebuild vs restart

### `docker compose up -d` — no rebuild needed

Use this when you only changed **runtime configuration** (values injected when the container starts):

| What changed | Example |
|---|---|
| `.env` values | `DB_NAME`, `DB_PASSWORD`, `DJANGO_ALLOWED_HOSTS` |
| `docker-compose.yml` settings | ports, commands, healthcheck, depends_on |
| Restarting stopped containers | Containers crashed or were stopped |

These values are read fresh each time a container starts — they are **not** baked into the image.

### `docker compose up --build -d` — rebuild required

Use this when you changed **files that are copied into the image** during build:

| What changed | Which service to rebuild |
|---|---|cd ..
| Python code in `backend/` | `django`, `queue-worker` |
| `backend/requirements.txt` | `django`, `queue-worker` |
| React code in `react_ams/src/` | `nginx` |
| `react_ams/package.json` | `nginx` |
| `react_ams/nginx.conf` | `nginx` |

You can also rebuild a single service: `docker compose build nginx && docker compose up -d`

### `docker compose down -v` + `up` — volume reset required

Use this when you changed **Postgres initialization settings**. Postgres only creates the database and user on first startup with an empty volume:

| What changed | Why `-v` is needed |
|---|---|
| `DB_NAME` (database name) | Postgres won't create a new DB on an existing volume |
| `DB_USER` (database owner) | Same — user is created only on init |
| `DB_PASSWORD` | Same — password is set only on init |

**Warning:** `down -v` deletes all data in the database. Run `migrate` and `createsuperuser` again after.

### Quick rule of thumb

```
Changed a file inside a container?  -->  --build
Changed .env or compose settings?   -->  no build needed
Changed Postgres DB/user/password?  -->  down -v, then up
```