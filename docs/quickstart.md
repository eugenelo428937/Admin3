# Admin3 Quickstart

## Prerequisites

- **Node.js** >= 20.0.0, **npm** >= 9.0.0
- **Python** 3.14+
- **PostgreSQL** (backend database)

---

## Frontend (React + Vite)

```bash
cd frontend/react-Admin3
```

### Install Dependencies

```bash
npm install
```

### Start Dev Server

```bash
npm run dev          # Start Vite dev server on http://localhost:3000
```

The dev server proxies `/api` requests to the Django backend
at `http://127.0.0.1:8888`.

### Frontend Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start dev server (port 3000) |
| `npm start` | Alias for `npm run dev` |
| `npm run build` | Production build (outputs to `build/`) |
| `npm run preview` | Preview production build locally |
| `npm test` | Run all tests once (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | ESLint check |
| `npm run lint:fix` | ESLint auto-fix |
| `npm run storybook` | Start Storybook on port 6006 |

### Running Specific Frontend Tests

```bash
# Single file
npx vitest run src/components/__tests__/Home.test.js

# Pattern match
npx vitest run --reporter=verbose src/components/__tests__/Cart

# Watch a specific file
npx vitest src/components/__tests__/Home.test.js
```

---

## Backend (Django)

```bash
cd backend/django_Admin3
```

### Backend Setup

```bash
# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate        # macOS/Linux
# .\.venv\Scripts\activate       # Windows PowerShell

pip install -r requirements.txt
```

### Start Django Server

```bash
python manage.py runserver 8888
```

### Backend Commands

| Command | Description |
| --- | --- |
| `python manage.py runserver 8888` | Start Django dev server |
| `python manage.py test` | Run all Django tests |
| `python manage.py makemigrations` | Create new migrations |
| `python manage.py migrate` | Apply migrations |
| `python manage.py createsuperuser` | Create admin user |
| `python manage.py import_subjects` | Import subjects |
| `python manage.py sync_course_templates` | Sync course templates |
| `python manage.py process_email_queue` | Process queued emails |

### Running Specific Backend Tests

```bash
# Specific app
python manage.py test apps.catalog

# With pytest (used in CI)
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test \
  python -m pytest apps/catalog/ -v
```

---

## Running Both Together

Open two terminals:

```bash
# Terminal 1 - Backend
cd backend/django_Admin3 && python manage.py runserver 8888

# Terminal 2 - Frontend
cd frontend/react-Admin3 && npm run dev
```

Then open <http://localhost:3000> in your browser.

---

## Environment Files

| File | Purpose |
| --- | --- |
| `frontend/react-Admin3/.env` | Frontend env vars |
| `frontend/react-Admin3/.env.uat` | UAT environment overrides |
| `backend/django_Admin3/.env` | Backend secrets and config |

Start the UAT frontend with: `npm run start:uat`
