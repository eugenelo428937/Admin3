# Railway Environment Variables - Quick Reference

Copy-paste template for Railway UAT environment setup.

## Required Variables

```bash
# Django Core
DJANGO_SETTINGS_MODULE=django_Admin3.settings.uat
DJANGO_ENV=uat
DJANGO_SECRET_KEY=your-secret-key-here-minimum-50-chars
DEBUG=False

# Security & CORS
ALLOWED_HOSTS=your-backend.railway.app,healthcheck.railway.app
CORS_ALLOWED_ORIGINS=https://your-frontend.railway.app
CSRF_TRUSTED_ORIGINS=https://your-frontend.railway.app

# Frontend
FRONTEND_URL=https://your-frontend.railway.app

# Email SMTP (Gmail)
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-16-char-app-password
DEFAULT_FROM_EMAIL=noreply@acted.com

# Administrate API
ADMINISTRATE_API_URL=https://api.getadministrate.com/graphql
ADMINISTRATE_INSTANCE_URL=bppacteduat.administrateapp.com
ADMINISTRATE_API_KEY=your-api-key
ADMINISTRATE_API_SECRET=your-api-secret
ADMINISTRATE_REST_API_URL=https://bppacteduat.administrateapp.com

# GetAddress.io
GETADDRESS_API_KEY=your-getaddress-key
GETADDRESS_ADMIN_KEY=your-admin-key
```

## Email Monitoring Variables

**⚠️ RECOMMENDED FOR UAT TESTING**

### BCC Monitoring (Recommended)

Sends emails to real users + BCC copy to you.

```bash
# Enable BCC monitoring for UAT
EMAIL_BCC_MONITORING=True

# Comma-separated list of monitoring email addresses
EMAIL_BCC_RECIPIENTS=monitor1@example.com,monitor2@example.com
```

**How it works:**
- User gets their email normally
- You get a BCC copy (invisible to user)
- Perfect for UAT: test real user flow while monitoring

### Email Override (Alternative)

Redirects ALL emails away from real users.

```bash
# Redirect all emails to test recipients
DEV_EMAIL_OVERRIDE=True

# Comma-separated list of test email addresses
DEV_EMAIL_RECIPIENTS=tester1@example.com,tester2@example.com
```

**How it works:**
- Real users DON'T get emails
- Only test recipients get redirected emails
- Use for early testing only

### Which Should You Use?

| Scenario | BCC Monitoring | Email Override |
|----------|----------------|----------------|
| **UAT with real users** | ✅ Yes | ❌ No |
| **Early testing (no real users)** | ❌ No | ✅ Yes |
| **Production** | ❌ No | ❌ No |

**Recommended for UAT:**
```bash
EMAIL_BCC_MONITORING=True
EMAIL_BCC_RECIPIENTS=your-email@example.com
DEV_EMAIL_OVERRIDE=False
```

## Email Queue Configuration

```bash
# Queue Processing Settings (optional - defaults shown)
EMAIL_QUEUE_BATCH_SIZE=50        # Emails processed per batch
EMAIL_QUEUE_INTERVAL=30          # Seconds between queue checks
```

## Payment Gateway (Opayo Test Mode)

```bash
USE_DUMMY_PAYMENT_GATEWAY=True
OPAYO_BASE_URL=https://sandbox.opayo.eu.elavon.com/hosted-payment-pages/vendor/v1/payment-pages
OPAYO_VENDOR_NAME=sandboxEC
OPAYO_INTEGRATION_KEY=your-test-integration-key
OPAYO_INTEGRATION_PASSWORD=your-test-password
```

## reCAPTCHA

```bash
RECAPTCHA_SITE_KEY=your-site-key
RECAPTCHA_SECRET_KEY=your-secret-key
RECAPTCHA_MIN_SCORE=0.5
```

## Database

**Automatically provided by Railway** - no manual configuration needed.

```bash
# Railway provides this automatically when you add PostgreSQL
DATABASE_URL=postgresql://user:password@host:5432/database
```

## How to Set Environment Variables

### Method 1: Railway Dashboard (Recommended)

1. Go to your Railway project
2. Click on your service (web or worker)
3. Click "Variables" tab
4. Click "New Variable"
5. Enter variable name and value
6. Click "Add"
7. Service will auto-restart

### Method 2: Railway CLI

```bash
railway variables set DJANGO_ENV=uat
railway variables set DEV_EMAIL_OVERRIDE=True
railway variables set DEV_EMAIL_RECIPIENTS="test@example.com,admin@example.com"
```

### Method 3: Bulk Import

Create a file `railway-vars.txt`:

```
DJANGO_ENV=uat
DEV_EMAIL_OVERRIDE=True
DEV_EMAIL_RECIPIENTS=test@example.com,admin@example.com
```

Then import:

```bash
railway variables set < railway-vars.txt
```

## Sharing Variables Between Services

To share variables between web and worker services:

1. Go to worker service
2. Click "Variables" tab
3. Click "Reference" button
4. Select web service
5. Choose variables to reference
6. Variables stay in sync automatically

## Environment-Specific Settings

### Development (Local)

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.development
DJANGO_ENV=development
DEBUG=True
DEV_EMAIL_OVERRIDE=True
```

### UAT (Railway)

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.uat
DJANGO_ENV=uat
DEBUG=False
DEV_EMAIL_OVERRIDE=True  # ⚠️ KEEP TRUE for testing
```

### Production

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.production
DJANGO_ENV=production
DEBUG=False
DEV_EMAIL_OVERRIDE=False  # ⚠️ MUST BE FALSE
```

## Secret Generation

### Django Secret Key

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Output example:
```
django-insecure-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

### Gmail App Password

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification
3. Generate App Password for "Mail"
4. Use 16-character password (remove spaces)

Example: `abcdefghijklmnop`

## Validation Checklist

Before deployment, verify:

- [ ] All required variables are set
- [ ] `DJANGO_SECRET_KEY` is unique and secure (not the default)
- [ ] `EMAIL_HOST_PASSWORD` is Gmail App Password (not regular password)
- [ ] `DEV_EMAIL_OVERRIDE=True` for UAT (prevents real user emails)
- [ ] `DEV_EMAIL_RECIPIENTS` includes your test email addresses
- [ ] `ALLOWED_HOSTS` includes Railway domain
- [ ] `CORS_ALLOWED_ORIGINS` matches frontend URL
- [ ] `FRONTEND_URL` is correct (used in email links)

## Common Issues

### Variable Not Taking Effect

**Solution:** Restart service after changing variables
```bash
railway restart --service web
railway restart --service worker
```

### Spaces in Values

**Problem:** `DEV_EMAIL_RECIPIENTS=test@example.com, admin@example.com` (space after comma)

**Solution:** Remove spaces: `test@example.com,admin@example.com`

### Multiline Values

**Problem:** Some variables need multiple lines

**Solution:** Use `\n` for newlines:
```bash
PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg..."
```

### Boolean Values

**Correct:**
```bash
DEV_EMAIL_OVERRIDE=True
DEBUG=False
```

**Incorrect:**
```bash
DEV_EMAIL_OVERRIDE="True"  # Don't use quotes for booleans
DEBUG=true                  # Use capital T/F
```

### List Values

**Correct:**
```bash
ALLOWED_HOSTS=domain1.com,domain2.com,domain3.com
DEV_EMAIL_RECIPIENTS=test1@example.com,test2@example.com
```

**Incorrect:**
```bash
ALLOWED_HOSTS=["domain1.com", "domain2.com"]  # Don't use JSON format
```

## Testing Variables

Verify variables are loaded correctly:

```bash
railway run python manage.py shell

from django.conf import settings

# Check email override
print(f"DEV_EMAIL_OVERRIDE: {settings.DEV_EMAIL_OVERRIDE}")
print(f"DEV_EMAIL_RECIPIENTS: {settings.DEV_EMAIL_RECIPIENTS}")

# Check SMTP settings
print(f"EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
print(f"EMAIL_HOST: {settings.EMAIL_HOST}")

# Check Django environment
print(f"DJANGO_ENV: {settings.DJANGO_ENV}")
print(f"DEBUG: {settings.DEBUG}")
```

## Security Best Practices

1. **Never commit** `.env` files with real credentials
2. **Rotate secrets** regularly (every 90 days)
3. **Use different keys** for dev/uat/production
4. **Enable 2FA** on Gmail account
5. **Monitor access logs** for suspicious activity
6. **Limit email recipients** in UAT (use `DEV_EMAIL_OVERRIDE`)
7. **Use Railway's** built-in secrets management

---

**Quick Deploy Command:**

```bash
# After setting all variables
railway up
railway run python manage.py migrate
railway run python manage.py createcachetable
```

**Check Deployment:**

```bash
curl https://your-backend.railway.app/api/health/
railway logs --service worker
```
