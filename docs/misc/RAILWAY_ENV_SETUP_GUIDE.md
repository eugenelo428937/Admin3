# Railway UAT Environment Setup Guide

## Overview
This guide will help you configure environment variables for your Railway UAT deployment using the new ACTEDDBUAT01 database.

## Prerequisites

**Database Information:**
- Database Name: `ACTEDDBUAT01`
- User: `actedadmin`
- Password: `Act3d@dm1n0EEoo`
- Port: `5432` (default PostgreSQL)
- **Host: `<YOU_NEED_TO_PROVIDE_THIS>`**

## Step 1: Generate a Secure Django Secret Key

Run this command to generate a secure secret key:

```powershell
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Save this key - you'll need it for the `DJANGO_SECRET_KEY` variable.

## Step 2: Get Your Railway Domains

1. Go to your Railway project: https://railway.app/project/0d639b12-bc89-4b72-a8e4-260f92182870
2. Click on **admin3-backend** service
3. Go to **Settings** tab
4. Find **Domains** section - copy the Railway-provided domain (e.g., `admin3-backend-production.up.railway.app`)
5. Do the same for your frontend service

## Step 3: Format Your DATABASE_URL

Replace `<YOUR_DB_HOST>` with your actual database host:

```
postgresql://actedadmin:Act3d@dm1n0EEoo@<YOUR_DB_HOST>:5432/ACTEDDBUAT01
```

**Common Host Values:**
- Local Railway Postgres: `postgres.railway.internal`
- External Server: `your-server-ip` or `your-db-hostname.com`
- AWS RDS: `your-instance.region.rds.amazonaws.com`
- Azure: `your-server.postgres.database.azure.com`

## Step 4: Set Environment Variables

### Method A: Railway Web Dashboard (Recommended)

1. Go to https://railway.app/project/0d639b12-bc89-4b72-a8e4-260f92182870
2. Click **admin3-backend** service
3. Click **Variables** tab
4. Click **+ New Variable** for each of the following:

#### Core Django Settings
```
DJANGO_ENV = uat
DJANGO_SETTINGS_MODULE = django_Admin3.settings.uat
DJANGO_SECRET_KEY = <paste-your-generated-secret-key>
```

#### Database Configuration
```
DATABASE_URL = postgresql://actedadmin:Act3d@dm1n0EEoo@<YOUR_DB_HOST>:5432/ACTEDDBUAT01
```

#### Security Settings
```
ALLOWED_HOSTS = admin3-backend-production.up.railway.app,healthcheck.railway.app
CORS_ALLOWED_ORIGINS = https://admin3-frontend-production.up.railway.app
CSRF_TRUSTED_ORIGINS = https://admin3-frontend-production.up.railway.app
```

#### Frontend URL
```
FRONTEND_URL = https://admin3-frontend-production.up.railway.app
```

#### Administrate API Settings
```
ADMINISTRATE_INSTANCE_URL = <your-value>
ADMINISTRATE_API_URL = <your-value>
ADMINISTRATE_API_KEY = <your-value>
ADMINISTRATE_API_SECRET = <your-value>
ADMINISTRATE_REST_API_URL = <your-value>
GETADDRESS_API_KEY = <your-value>
```

#### Email Configuration
```
EMAIL_HOST_USER = <your-gmail-address>
EMAIL_HOST_PASSWORD = <your-gmail-app-password>
DEFAULT_FROM_EMAIL = noreply@acted.com
```

#### Opayo Payment Gateway (Test Mode)
```
OPAYO_VENDOR_NAME = <your-vendor-name>
OPAYO_INTEGRATION_KEY = <your-integration-key>
OPAYO_INTEGRATION_PASSWORD = <your-integration-password>
```

#### reCAPTCHA Settings
```
RECAPTCHA_SITE_KEY = <your-site-key>
RECAPTCHA_SECRET_KEY = <your-secret-key>
RECAPTCHA_MIN_SCORE = 0.5
```

5. Click **Deploy** to apply changes

### Method B: Railway CLI

1. Edit `railway-env-setup.ps1` and replace all `<placeholders>`
2. Run from PowerShell:
   ```powershell
   cd C:\Code\Admin3
   .\railway-env-setup.ps1
   ```

## Step 5: Deploy to Railway

After setting environment variables:

```powershell
cd backend/django_Admin3
railway up --service admin3-backend
```

Or push to GitHub and Railway will auto-deploy (if GitHub integration is set up).

## Step 6: Verify Deployment

### Check Health Endpoint
```powershell
curl https://<your-railway-domain>/api/health/
```

Expected response:
```json
{
  "status": "healthy",
  "checks": {
    "database": "connected"
  },
  "environment": "uat",
  "debug": false,
  "python_version": "3.14.x"
}
```

### Check Django Admin
```
https://<your-railway-domain>/admin/
```

### Check Logs
```powershell
railway logs --service admin3-backend
```

## Troubleshooting

### Health Check Fails
- Check DATABASE_URL is correct
- Verify database host is accessible from Railway
- Check Railway logs: `railway logs --service admin3-backend`

### Database Connection Issues
- Verify firewall rules allow Railway IP ranges
- Check PostgreSQL `pg_hba.conf` allows external connections
- Test connection string locally first

### ALLOWED_HOSTS Error
- Make sure ALLOWED_HOSTS includes your Railway domain
- Include `healthcheck.railway.app`

### CORS Errors
- Verify CORS_ALLOWED_ORIGINS matches your frontend domain
- Include the protocol (`https://`)
- Check CSRF_TRUSTED_ORIGINS is also set

## Security Checklist

- [ ] Django SECRET_KEY is unique and random
- [ ] DEBUG is False (handled by uat.py)
- [ ] ALLOWED_HOSTS is properly configured
- [ ] DATABASE_URL password is secure
- [ ] Email credentials are app-specific passwords (not your main password)
- [ ] All API keys are from production/test accounts (not hardcoded test values)
- [ ] SSL is enabled (handled by Railway + uat.py settings)

## Next Steps

1. Set all required environment variables
2. Deploy backend to Railway
3. Run migrations: `railway run python manage.py migrate --noinput`
4. Create superuser: `railway run python manage.py createsuperuser`
5. Configure frontend to use Railway backend URL
6. Test end-to-end functionality

## Support

If you encounter issues:
1. Check Railway logs: `railway logs --service admin3-backend`
2. Review deployment logs in Railway dashboard
3. Test health endpoint: `curl https://<domain>/api/health/`
