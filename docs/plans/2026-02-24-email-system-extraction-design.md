# Email System Extraction — Standalone Docker Deployment

**Date:** 2026-02-24
**Status:** Approved
**Target:** Windows Server 2019 (DMZ)

## Summary

Extract the email system (Django backend + React admin frontend) from Admin3 into a standalone Docker-based service deployed on Windows Server 2019. The service handles email template management, queuing, and sending via an internal SMTP relay.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Approach | Monorepo Docker extraction | Clean separation; React admin UI is significantly better than Django admin for MJML editing and queue management |
| Database | New PostgreSQL container | Self-contained; no dependency on Admin3 DB |
| Staff FK | Inline Staff model in email app | Self-contained; simple name/email fields managed via email admin UI |
| Auth (admin) | Django session auth | Standard browser-based login |
| Auth (API) | API key in `X-API-Key` header | Simple, stateless, auditable |
| Network security | Nginx IP whitelist + dedicated port | DMZ server; internal network/VPN users only |
| Microsoft SSO | Future enhancement | Additive; can layer on via `django-auth-adfs` after initial deployment |

## Architecture

### Container Stack (Docker Compose — 4 services)

```
┌─────────────────────────────────────────────────────┐
│  Windows Server 2019 (DMZ)                          │
│                                                      │
│  ┌─── Docker Compose ────────────────────────────┐  │
│  │                                                │  │
│  │  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │  │
│  │  │  Nginx   │  │  Django  │  │ PostgreSQL  │ │  │
│  │  │  + React │──│  API     │──│ (data vol)  │ │  │
│  │  │  :8080   │  │  :8000   │  │  :5432      │ │  │
│  │  └──────────┘  └──────────┘  └─────────────┘ │  │
│  │                 ┌──────────┐                   │  │
│  │                 │  Queue   │                   │  │
│  │                 │  Worker  │                   │  │
│  │                 └──────────┘                   │  │
│  └───────┼──────────────┼────────────────────────┘  │
│          │              │                            │
│     Port 8080      10.20.3.4:25                     │
│     (exposed)      (SMTP relay)                     │
└──────────┼───────────────────────────────────────────┘
           │
    Internal Network / VPN
    ┌──────┴───────┐
    │ User laptops │  → Browser: admin UI
    │ Other systems│  → API: queue/status endpoints
    └──────────────┘
```

- **Nginx**: Reverse proxy + React static files + IP whitelist
- **Django**: API server via Gunicorn (3 workers)
- **Queue Worker**: Same Django image, runs `process_email_queue --continuous`
- **PostgreSQL**: 16-alpine with named volume for persistence

### API Surfaces

**Admin UI (browser, session auth):**
```
/api/email/settings/              CRUD
/api/email/templates/             CRUD + preview, mjml-shell, signature-mjml
/api/email/queue/                 List, Retrieve + duplicate, resend
/api/email/attachments/           CRUD + multipart upload
/api/email/placeholders/          CRUD
/api/email/content-rules/         CRUD
/api/email/closing-salutations/   CRUD
```

**Integration API (machine, API key auth):**
```
POST /api/v1/send/                Queue an email
GET  /api/v1/status/{queue_id}/   Check email status
GET  /api/v1/status/?tag=<tag>    Query by tag
GET  /api/v1/health/              Health check (DB + SMTP)
```

**Send request example:**
```json
POST /api/v1/send/
{
  "template": "order_confirmation",
  "to": ["user@example.com"],
  "context": { "order_id": "ORD-12345" },
  "priority": "high",
  "tags": ["order-123"]
}
```

## Repository Structure

```
acted-email-system/
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example
├── .github/workflows/build-deploy.yml
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── manage.py
│   └── email_project/
│       ├── settings/{base,development,production}.py
│       ├── urls.py
│       ├── wsgi.py
│       └── email_system/
│           ├── models/
│           │   ├── template.py
│           │   ├── queue.py
│           │   ├── log.py
│           │   ├── settings.py
│           │   ├── placeholder.py
│           │   ├── content_rule.py
│           │   ├── closing_salutation.py
│           │   └── staff.py           # NEW inline Staff model
│           ├── services/
│           │   ├── email_service.py
│           │   ├── queue_service.py
│           │   └── content_insertion.py
│           ├── serializers.py
│           ├── views.py
│           ├── views_integration.py    # NEW v1 send/status endpoints
│           ├── urls.py
│           ├── admin/
│           ├── backends/custom_backends.py
│           ├── management/commands/process_email_queue.py
│           ├── permissions.py          # IsSuperUser + API key auth
│           └── migrations/0001_initial.py  # Fresh migration
│
├── frontend/
│   ├── Dockerfile                     # Multi-stage: npm build → nginx
│   ├── nginx.conf
│   ├── package.json
│   └── src/
│       ├── App.tsx
│       ├── config.ts
│       ├── services/{httpService,emailService}.ts
│       ├── components/email/          # All 8 modules (32 files)
│       └── types/email/               # All type definitions
│
└── scripts/
    ├── network-diagnostic.ps1
    └── deploy.ps1
```

## Extraction Changes

### Code That Changes

| Area | Change |
|------|--------|
| Staff model | New `email_system.Staff` with `id`, `name`, `email`, `is_active` fields |
| ClosingSalutationStaff FK | Re-pointed from `tutorials.Staff` → `email_system.Staff` |
| IsSuperUser permission | Copied into `email_system/permissions.py` |
| Migrations | Fresh `0001_initial` (no utils or tutorials dependencies) |
| httpService | Simplified — API key support instead of CSRF/cookie auth |
| AdminLayout | Email-only sidebar, standalone login page |
| Config | Single `REACT_APP_API_URL` env var |

### Code That Copies As-Is

- All 32 frontend components and 13 ViewModels
- `emailService.ts` (22 API methods)
- `email_service.py` (1149 lines)
- `queue_service.py` (671 lines)
- `content_insertion.py`
- Custom CRAM-MD5 email backend
- `process_email_queue` management command
- All type definitions

## Network Investigation (Phase 0)

PowerShell diagnostic script checks:

1. **Docker feasibility**: Windows version, Hyper-V, disk space, RAM
2. **Network egress**: HTTPS to hub.docker.com, npmjs.org, pypi.org, github.com; TCP to 10.20.3.4:25
3. **Network ingress**: Firewall rules, port binding test, IP/interfaces, proxy config
4. **Docker runtime**: Install, hello-world, compose, container→host SMTP test

**Fallback if no internet:**
- Pre-build images on dev machine
- Transfer via `docker save`/`docker load` (tarball)
- Manual deployment via `deploy.ps1 -Offline`

## CI/CD

**With GitHub access:** GitHub Actions → build → push to ghcr.io → server pulls
**Without GitHub access:** GitHub Actions → build → artifact tarball → manual transfer → `docker load`

## Monitoring

| Concern | Solution |
|---------|----------|
| Queue backlog | `GET /api/v1/health/` returns queue depth |
| Failed emails | Admin UI queue page + resend button |
| Disk space | Volume monitoring + `docker system prune` scheduled task |
| Logs | `docker-compose logs` + optional forwarding |
| Backups | Scheduled `pg_dump` to host filesystem |

## Future Enhancements

- Microsoft SSO via `django-auth-adfs` (Azure AD integration)
- Webhook notifications on send failure
- Email analytics dashboard
- Rate limiting per API key
