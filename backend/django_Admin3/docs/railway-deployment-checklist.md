# Railway UAT Deployment Checklist

Quick reference for deploying Admin3 to Railway with email queue support.

## Pre-Deployment

### 1. Environment Variables Setup

Copy these to Railway environment variables:

```bash
# Core Django Settings
DJANGO_SETTINGS_MODULE=django_Admin3.settings.uat
DJANGO_ENV=uat
DJANGO_SECRET_KEY=<generate-new-secret-key>
DEBUG=False

# Database (automatically provided by Railway)
DATABASE_URL=<railway-provides-this>

# Allowed Hosts & CORS
ALLOWED_HOSTS=<your-backend>.railway.app,healthcheck.railway.app
CORS_ALLOWED_ORIGINS=https://<your-frontend>.railway.app
CSRF_TRUSTED_ORIGINS=https://<your-frontend>.railway.app

# Frontend URL
FRONTEND_URL=https://<your-frontend>.railway.app

# Email SMTP (Gmail)
EMAIL_HOST_USER=<your-gmail>@gmail.com
EMAIL_HOST_PASSWORD=<gmail-app-password>
DEFAULT_FROM_EMAIL=noreply@acted.com

# Email Debugging (SET TO TRUE FOR UAT TESTING)
DEV_EMAIL_OVERRIDE=True
DEV_EMAIL_RECIPIENTS=your-test-email@example.com,another-tester@example.com

# Email Queue Settings
EMAIL_QUEUE_BATCH_SIZE=50
EMAIL_QUEUE_INTERVAL=30

# Administrate API
ADMINISTRATE_API_URL=https://api.getadministrate.com/graphql
ADMINISTRATE_INSTANCE_URL=bppacteduat.administrateapp.com
ADMINISTRATE_API_KEY=<your-key>
ADMINISTRATE_API_SECRET=<your-secret>
ADMINISTRATE_REST_API_URL=https://bppacteduat.administrateapp.com

# GetAddress.io
GETADDRESS_API_KEY=<your-key>
GETADDRESS_ADMIN_KEY=<your-admin-key>

# reCAPTCHA
RECAPTCHA_SITE_KEY=<your-site-key>
RECAPTCHA_SECRET_KEY=<your-secret-key>

# Payment Gateway (Opayo Test Mode)
USE_DUMMY_PAYMENT_GATEWAY=True
OPAYO_BASE_URL=https://sandbox.opayo.eu.elavon.com/hosted-payment-pages/vendor/v1/payment-pages
OPAYO_VENDOR_NAME=sandboxEC
OPAYO_INTEGRATION_KEY=<your-test-key>
OPAYO_INTEGRATION_PASSWORD=<your-test-password>
```

### 2. Gmail App Password Setup

**⚠️ REQUIRED BEFORE DEPLOYMENT**

1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Security → 2-Step Verification → Enable if not enabled
3. Security → 2-Step Verification → App passwords
4. Generate app password for "Mail"
5. Copy 16-character password (e.g., `abcd efgh ijkl mnop`)
6. Set `EMAIL_HOST_PASSWORD` in Railway to this password

**Test locally first:**
```bash
cd backend/django_Admin3
python manage.py shell

from django.core.mail import send_mail
send_mail('Test', 'Test email', 'noreply@acted.com', ['your-email@example.com'])
# Should return 1 (success)
```

### 3. Verify Procfile

Ensure `backend/django_Admin3/Procfile` contains:

```
web: gunicorn django_Admin3.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 60
worker: python manage.py process_email_queue --continuous --interval 30
```

## Deployment Steps

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Configure Railway email queue worker"
git push origin main  # or uat branch
```

### Step 2: Railway Initial Setup

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your Admin3 repository
4. Railway will auto-detect `Procfile` and create services

### Step 3: Configure Services

Railway should create two services automatically:
- **web** (main Django app)
- **worker** (email queue processor)

If not created automatically:
1. Click "New Service"
2. Choose "Empty Service"
3. Settings → Start Command: `python manage.py process_email_queue --continuous --interval 30`
4. Settings → Root Directory: `backend/django_Admin3`
5. Link same environment variables as web service

### Step 4: Add Environment Variables

1. Click on your web service
2. Go to "Variables" tab
3. Click "New Variable"
4. Add all variables from section 1 (Pre-Deployment)
5. **Share variables** with worker service:
   - Go to worker service → Variables
   - Click "Reference" → Select web service variables

### Step 5: Add PostgreSQL Database

1. In Railway project, click "+ New"
2. Select "Database" → "PostgreSQL"
3. Railway automatically sets `DATABASE_URL` for all services
4. Wait for database to provision (~30 seconds)

### Step 6: Run Migrations

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Run migrations
railway run python manage.py migrate

# Create cache table
railway run python manage.py createcachetable

# Create superuser (optional)
railway run python manage.py createsuperuser
```

### Step 7: Deploy

1. Railway automatically deploys on push to GitHub
2. Or manually trigger: Railway Dashboard → Service → "Deploy"
3. Watch deployment logs for errors

### Step 8: Verify Deployment

**Check Web Service:**
```bash
curl https://<your-backend>.railway.app/api/health/
# Should return: {"status": "healthy"}
```

**Check Worker Service:**
1. Railway Dashboard → worker service → "View Logs"
2. Look for:
   ```
   Starting continuous email queue processor...
   Batch size: 50, Interval: 30s
   ```

**Test Email:**
```bash
railway run python manage.py shell

from utils.services.email_service import EmailService
email_service = EmailService()
email_service.send_templated_email(
    template_name='order_confirmation',
    context={'order_number': 'TEST-001'},
    to_emails=['customer@example.com'],
    subject='Test Email',
    use_queue=True
)
# Check worker logs - should see email processed
```

## Post-Deployment Verification

### ✅ Checklist

- [ ] Web service is running (green status)
- [ ] Worker service is running (green status)
- [ ] Database is connected
- [ ] Health check endpoint works: `/api/health/`
- [ ] Admin panel accessible: `/admin/`
- [ ] Test email sends successfully
- [ ] Worker logs show queue processing every 30 seconds
- [ ] `DEV_EMAIL_OVERRIDE=True` (emails redirected to test recipients)
- [ ] Frontend can connect to backend API
- [ ] CORS is configured correctly
- [ ] HTTPS works (Railway auto-provides SSL)

### Monitor Logs

**Web Service Logs:**
```bash
railway logs --service web
```

**Worker Service Logs:**
```bash
railway logs --service worker
```

**Filter for Errors:**
```bash
railway logs --service worker | grep ERROR
```

## Troubleshooting

### Worker Not Starting

**Symptom:** Worker service shows "Crashed" or "Stopped"

**Check:**
```bash
railway logs --service worker

# Look for errors like:
# - ModuleNotFoundError: No module named 'utils'
# - django.core.exceptions.ImproperlyConfigured
```

**Solutions:**
1. Verify `ROOT_DIRECTORY` is set to `backend/django_Admin3`
2. Check `DJANGO_SETTINGS_MODULE` is set correctly
3. Ensure all dependencies in `requirements.txt` are installed
4. Verify `DATABASE_URL` is accessible by worker

### Emails Not Sending

**Check 1: SMTP Connection**
```bash
railway run python manage.py shell

from django.core.mail import send_mail
send_mail('Test', 'Test', 'noreply@acted.com', ['test@example.com'])
# If error: Check EMAIL_HOST_PASSWORD
```

**Check 2: Queue Processing**
```bash
railway run python manage.py shell

from utils.models import EmailQueue
pending = EmailQueue.objects.filter(status='pending')
print(f"Pending emails: {pending.count()}")
```

**Check 3: Worker Logs**
```bash
railway logs --service worker | tail -50
# Look for "Processing Results" messages
```

### Database Connection Issues

**Symptom:** `FATAL: password authentication failed`

**Solution:**
1. Railway Dashboard → Database → "Connect"
2. Copy `DATABASE_URL`
3. Add to both web and worker services
4. Redeploy

### High Memory Usage

**Symptom:** Worker crashes with OOM (Out of Memory)

**Solutions:**
1. Reduce batch size:
   ```bash
   EMAIL_QUEUE_BATCH_SIZE=25
   ```
2. Increase interval:
   ```bash
   EMAIL_QUEUE_INTERVAL=60
   ```
3. Upgrade Railway plan (more RAM)

## Maintenance

### View Queue Status

```bash
railway run python manage.py shell

from utils.services.queue_service import email_queue_service
stats = email_queue_service.get_queue_stats()
print(stats)
```

### Clear Failed Emails

```bash
railway run python manage.py shell

from utils.models import EmailQueue
EmailQueue.objects.filter(status='failed').delete()
```

### Restart Worker

Railway Dashboard:
1. Go to worker service
2. Click "Settings" → "Restart"

Or via CLI:
```bash
railway restart --service worker
```

### Update Environment Variables

1. Railway Dashboard → Service → Variables
2. Edit variable
3. Click "Update"
4. Service auto-restarts

## Scaling

### Increase Worker Performance

**Option 1: Faster Processing**
```bash
EMAIL_QUEUE_BATCH_SIZE=100
EMAIL_QUEUE_INTERVAL=10
```

**Option 2: Multiple Workers**
1. Duplicate worker service in Railway
2. Both workers process same queue
3. Database locking prevents duplicate sends

**Option 3: Priority Queues**
```bash
# High priority worker
worker-high: python manage.py process_email_queue --continuous --priority urgent --interval 10

# Normal priority worker
worker-normal: python manage.py process_email_queue --continuous --priority normal --interval 30
```

## Going Live (Production)

When ready to send real emails to customers:

1. **Disable email override:**
   ```bash
   DEV_EMAIL_OVERRIDE=False
   # Or remove variable entirely
   ```

2. **Update allowed hosts:**
   ```bash
   ALLOWED_HOSTS=<production-domain>.com,<your-backend>.railway.app
   ```

3. **Use production SMTP** (optional):
   - Consider SendGrid, AWS SES, or Mailgun for higher volume
   - Update `EMAIL_BACKEND` and SMTP settings accordingly

4. **Monitor email logs:**
   - Set up alerts for failed emails
   - Track bounce rates
   - Monitor spam complaints

5. **Backup strategy:**
   - Enable database backups in Railway
   - Export email logs periodically

## Support

- **Railway Docs:** https://docs.railway.app/
- **Django Docs:** https://docs.djangoproject.com/
- **Admin3 Setup Guide:** See `railway-email-queue-setup.md`

---

**Last Updated:** 2025-01-10
**Version:** 1.0
**Environment:** Railway UAT
