# Railway UAT Deployment - Quick Start

## 🎯 What You Need to Do

Since you created `ACTEDDBUAT01` inside Railway's Postgres service, you only need to configure the **backend service** to reference it.

## 🔧 Configuration (5 Minutes)

### 1. Go to Railway Dashboard
**URL:** https://railway.app/project/0d639b12-bc89-4b72-a8e4-260f92182870

### 2. Click on "admin3-backend" service

### 3. Click "Variables" tab

### 4. Add These Variables

#### **Database Connection** (Most Important!)
```
DATABASE_URL = postgresql://${{Postgres.PGUSER}}:${{Postgres.PGPASSWORD}}@${{Postgres.PGHOST}}:${{Postgres.PGPORT}}/ACTEDDBUAT01
```
⚠️ Replace `Postgres` with your actual Postgres service name if different

#### **Django Settings**
```
DJANGO_ENV = uat
DJANGO_SETTINGS_MODULE = django_Admin3.settings.uat
```

#### **Secret Key** (Generate First!)
Run this locally to generate:
```powershell
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```
Then add:
```
DJANGO_SECRET_KEY = <paste-generated-key>
```

#### **Domains**
```
ALLOWED_HOSTS = ${{RAILWAY_PUBLIC_DOMAIN}},healthcheck.railway.app
```

#### **Add All Other Variables**
See `RAILWAY_POSTGRES_CONFIG.md` for complete list (Administrate API, Email, etc.)

### 5. Deploy
```powershell
cd backend/django_Admin3
railway up --service admin3-backend
```

### 6. Run Migrations
```powershell
railway run --service admin3-backend python manage.py migrate
```

### 7. Test Health Endpoint
```powershell
curl https://<your-domain>/api/health/
```

Should return:
```json
{"status":"healthy","checks":{"database":"connected"},"environment":"uat"}
```

## 📋 Variable Reference Cheat Sheet

### Railway Built-in Variables
- `${{RAILWAY_PUBLIC_DOMAIN}}` - Your service's public domain
- `${{RAILWAY_ENVIRONMENT}}` - Current environment (production/staging)
- `${{RAILWAY_PROJECT_ID}}` - Your project ID

### Postgres Service Variables
- `${{Postgres.PGHOST}}` - Database host
- `${{Postgres.PGPORT}}` - Database port (5432)
- `${{Postgres.PGUSER}}` - Database username
- `${{Postgres.PGPASSWORD}}` - Database password
- `${{Postgres.PGDATABASE}}` - Default database name

## ✅ Checklist

- [ ] Generated Django SECRET_KEY
- [ ] Set DATABASE_URL with ACTEDDBUAT01
- [ ] Set DJANGO_ENV and DJANGO_SETTINGS_MODULE
- [ ] Set ALLOWED_HOSTS
- [ ] Added all API credentials (Administrate, Email, Opayo, reCAPTCHA)
- [ ] Deployed backend
- [ ] Ran migrations
- [ ] Tested health endpoint
- [ ] Database returns "connected"

## 🚨 Common Issues

### Health Check Fails
**Check:** Is DATABASE_URL correct?
```powershell
railway variables --service admin3-backend | grep DATABASE_URL
```

### Database Connection Error
**Fix:** Make sure ACTEDDBUAT01 exists in Postgres:
```powershell
railway connect Postgres
\l  # List databases
\q  # Quit
```

### ALLOWED_HOSTS Error
**Fix:** Add your Railway domain:
```
ALLOWED_HOSTS = admin3-backend-production.up.railway.app,healthcheck.railway.app
```

## 📚 Full Documentation

- **Detailed Guide:** `RAILWAY_POSTGRES_CONFIG.md`
- **Environment Setup:** `RAILWAY_ENV_SETUP_GUIDE.md`

## 🆘 Need Help?

1. Check Railway logs: `railway logs --service admin3-backend`
2. View variables: `railway variables --service admin3-backend`
3. Check health: `curl https://<domain>/api/health/`
