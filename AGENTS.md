# AGENTS.md

This file provides guidance to Codex when working in this repository. It is based on `CLAUDE.md` and the documentation under `docs/`.

## Project Overview

Admin3 is a Django REST API backend with a React frontend for the ActEd Online Store.

## Quick Start (Local)

Backend (Django, port 8888):

```bash
cd backend/django_Admin3
python manage.py makemigrations
python manage.py migrate
python manage.py runserver 8888
```

Frontend (React, port 3000):

```bash
cd frontend/react-Admin3
npm install
npm start
```

Verify:
- Backend: http://127.0.0.1:8888/
- Admin: http://127.0.0.1:8888/admin/
- Frontend: http://127.0.0.1:3000/

## Key Docs

- Overview: `docs/0-overview.md`
- Architecture: `docs/architecture.md`
- Tech stack: `docs/project_doc/1_Tech-Stack.md`
- Setup: `docs/project_doc/0_Setup.md`
- File structure: `docs/project_doc/2_File-Structure.md`
- Testing: `docs/testing/README.md`

## Development Rules

- Follow strict TDD (tests first, then implementation).
- Use `127.0.0.1` (not `localhost`) for local URLs.
- Backend server runs on port `8888`, frontend on `3000`.

## Useful Commands

Backend:

```bash
cd backend/django_Admin3
python manage.py test
```

Frontend:

```bash
cd frontend/react-Admin3
npm test
```
