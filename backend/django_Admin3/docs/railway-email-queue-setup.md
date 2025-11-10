# Railway Email Queue Setup Guide

This guide explains how to set up the email queue processor on Railway for the Admin3 UAT environment.

## Overview

The Admin3 application uses a queue-based email system that requires a background worker process to send emails. On Railway, this is configured as a separate "worker" service that runs alongside the main web application.

## Architecture

```
Railway Deployment
├── Web Service (Gunicorn)
│   └── Handles HTTP requests
│   └── Queues emails to database
│
└── Worker Service (Email Queue Processor)
    └── Processes queued emails
    └── Sends emails via SMTP
    └── Runs continuously in background
```

## Configuration Files

### 1. Procfile (`backend/django_Admin3/Procfile`)

The Procfile defines two processes for Railway:

```
web: gunicorn django_Admin3.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 60
worker: python manage.py process_email_queue --continuous --interval 30
```

**Explanation:**
- **web:** Main Django application server
- **worker:** Background email queue processor
  - `--continuous`: Runs indefinitely, processing emails at regular intervals
  - `--interval 30`: Checks for new emails every 30 seconds

### 2. UAT Settings (`django_Admin3/settings/uat.py`)

Email configuration for UAT environment:

```python
# Email override for testing
DEV_EMAIL_OVERRIDE = env.bool('DEV_EMAIL_OVERRIDE', default=False)
DEV_EMAIL_RECIPIENTS = env.list('DEV_EMAIL_RECIPIENTS', default=[])

# SMTP Configuration
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='noreply@acted.com')

# Queue Processing Settings
EMAIL_QUEUE_BATCH_SIZE = env.int('EMAIL_QUEUE_BATCH_SIZE', default=50)
EMAIL_QUEUE_INTERVAL = env.int('EMAIL_QUEUE_INTERVAL', default=30)
```

## Railway Deployment Steps

### Step 1: Configure Environment Variables

In your Railway project, add the following environment variables:

#### Required Variables

```bash
# Django Settings
DJANGO_SETTINGS_MODULE=django_Admin3.settings.uat
DJANGO_ENV=uat
DJANGO_SECRET_KEY=<your-secret-key>

# Email SMTP Settings
EMAIL_HOST_USER=<your-gmail-address>
EMAIL_HOST_PASSWORD=<your-gmail-app-password>
DEFAULT_FROM_EMAIL=noreply@acted.com

# Database (Railway provides this automatically)
DATABASE_URL=<automatically-set-by-railway>

# Frontend URL
FRONTEND_URL=https://your-frontend.railway.app

# Security
ALLOWED_HOSTS=your-backend.railway.app,healthcheck.railway.app
CORS_ALLOWED_ORIGINS=https://your-frontend.railway.app
CSRF_TRUSTED_ORIGINS=https://your-frontend.railway.app
```

#### Optional Variables for Email Testing

```bash
# Email BCC Monitoring (RECOMMENDED FOR UAT)
# Sends email to real user PLUS BCC copy to monitoring addresses
EMAIL_BCC_MONITORING=True
EMAIL_BCC_RECIPIENTS=monitor1@example.com,monitor2@example.com

# Email Override (Alternative - redirects ALL emails)
# Use this if you DON'T want to send to real users yet
DEV_EMAIL_OVERRIDE=False
DEV_EMAIL_RECIPIENTS=test1@example.com,test2@example.com

# Email Queue Tuning
EMAIL_QUEUE_BATCH_SIZE=50        # Process up to 50 emails per batch
EMAIL_QUEUE_INTERVAL=30          # Check queue every 30 seconds
```

### Step 2: Create Worker Service on Railway

Railway automatically detects the `Procfile` and creates services. To ensure the worker is running:

1. Go to your Railway project dashboard
2. Click on your service
3. Go to "Settings" → "Deploy"
4. Under "Start Command", you should see both `web` and `worker` processes
5. Ensure both are enabled

**Alternative: Manual Worker Service**

If Railway doesn't automatically create the worker, you can add it manually:

1. In Railway dashboard, click "+ New Service"
2. Select "Deploy from GitHub repo"
3. Choose the same repository
4. Go to "Settings"
5. Under "Start Command", enter:
   ```bash
   python manage.py process_email_queue --continuous --interval 30
   ```
6. Ensure all environment variables are shared between web and worker services

### Step 3: Gmail App Password Setup

For production email sending, you need a Gmail App Password:

1. Go to your Google Account settings
2. Enable 2-Step Verification
3. Go to Security → 2-Step Verification → App passwords
4. Generate an app password for "Mail"
5. Copy the 16-character password
6. Set `EMAIL_HOST_PASSWORD` to this app password in Railway

**⚠️ Never use your regular Gmail password!**

### Step 4: Database Cache Table

The email queue requires a database cache table. Run this once after deployment:

```bash
# SSH into Railway container or use Railway CLI
railway run python manage.py createcachetable
```

This creates the `django_cache_table` required by the cache backend.

### Step 5: Run Migrations

Ensure email queue tables are created:

```bash
railway run python manage.py migrate
```

### Step 6: Verify Deployment

Check if the worker is running:

1. Go to Railway dashboard → Your service → "Deployments"
2. Click on the latest deployment
3. Check logs for both `web` and `worker` processes
4. You should see:
   ```
   Starting continuous email queue processor...
   Batch size: 50, Interval: 30s
   Press Ctrl+C to stop
   ```

## Email Testing Features

The UAT environment supports two email testing approaches: BCC monitoring and email override.

### BCC Monitoring (Recommended for UAT)

**Perfect for UAT testing** - sends emails to real users AND sends you a blind copy.

#### How It Works

When `EMAIL_BCC_MONITORING=True`:

- ✅ Email sent to actual recipient (e.g., `customer@example.com`)
- ✅ BCC copy sent to monitoring addresses (invisible to recipient)
- ✅ You can verify what customers receive without interrupting their experience
- ✅ Perfect for UAT: test real user flow while monitoring emails

Example:

```
To: customer@example.com (receives email normally)
BCC: monitor@example.com (receives invisible copy)
```

#### Enable BCC Monitoring

Set these environment variables in Railway:

```bash
EMAIL_BCC_MONITORING=True
EMAIL_BCC_RECIPIENTS=monitor1@example.com,monitor2@example.com
```

#### Disable BCC Monitoring

When ready for production:

```bash
EMAIL_BCC_MONITORING=False
# or remove the variable entirely
```

---

### Email Override (Alternative - Full Redirect)

**Use this if you DON'T want to send to real users yet.**

#### How It Works

When `DEV_EMAIL_OVERRIDE=True`:
- ⚠️ **All emails** are redirected to the addresses in `DEV_EMAIL_RECIPIENTS`
- ⚠️ Real customers **never receive emails**
- ✅ Original recipient addresses are preserved in the email body for reference
- ✅ Email subject and content remain unchanged
- ✅ Good for early testing before real user testing

Example email with override enabled:

```
To: your-test-email@example.com (instead of customer@example.com)
Subject: Order Confirmation #12345

[DEV MODE NOTICE]
This email was originally intended for: customer@example.com
You are receiving this because DEV_EMAIL_OVERRIDE is enabled.

--- Original Email Content ---
Dear Customer,
Your order #12345 has been confirmed...
```

#### Enable Email Override

Set these environment variables in Railway:

```bash
DEV_EMAIL_OVERRIDE=True
DEV_EMAIL_RECIPIENTS=your-test-email@example.com,another-test@example.com
```

#### Disable Email Override

When ready for real user testing:

```bash
DEV_EMAIL_OVERRIDE=False
# or remove the variable entirely
```

---

### Which Feature Should You Use?

| Feature | Use When | Real Users Get Email? | You Get Copy? |
|---------|----------|----------------------|---------------|
| **BCC Monitoring** | UAT with real users | ✅ Yes | ✅ Yes (BCC) |
| **Email Override** | Early testing only | ❌ No | ✅ Yes (redirected) |
| **Both Disabled** | Production | ✅ Yes | ❌ No |

**Recommendation for UAT:**
```bash
# Best practice for UAT testing
EMAIL_BCC_MONITORING=True
EMAIL_BCC_RECIPIENTS=your-monitoring-email@example.com
DEV_EMAIL_OVERRIDE=False
```

**Important Notes:**
- **Don't enable both features** - choose one based on your testing phase
- **BCC is recommended for UAT** - tests real user experience
- **Override is for early testing** - use before involving real users
- **Disable both in production** - no monitoring/redirection needed

## Monitoring Email Queue

### View Queue Status

Create a custom management command or use Django admin:

```bash
railway run python manage.py shell

# In Django shell:
from utils.services.queue_service import email_queue_service
stats = email_queue_service.get_queue_stats()
print(stats)
```

Output:
```python
{
    'total': 150,
    'pending': 5,
    'processing': 2,
    'sent': 140,
    'failed': 3,
    'retry': 0,
    'cancelled': 0
}
```

### Monitor Worker Logs

In Railway dashboard:
1. Go to your service
2. Click "View Logs"
3. Filter by service: "worker"
4. Look for processing messages:
   ```
   Processing Results:
     Processed: 10 emails
     Successful: 10
     Failed: 0
     Processing time: 2.5s
     Processing rate: 4.0 emails/second
   ```

### Check Failed Emails

Failed emails are automatically retried. To investigate failures:

```bash
railway run python manage.py shell

from utils.models import EmailQueue
failed_emails = EmailQueue.objects.filter(status='failed')
for email in failed_emails:
    print(f"ID: {email.id}, Error: {email.error_message}")
```

## Troubleshooting

### Worker Not Starting

**Symptom:** No email queue logs in Railway dashboard

**Solutions:**
1. Check Procfile exists in root of backend directory
2. Verify `worker` process is defined in Procfile
3. Check Railway "Start Command" includes worker
4. Review Railway build logs for errors

### Emails Not Sending

**Symptom:** Emails queued but not sent

**Check 1: SMTP Credentials**
```bash
railway run python manage.py shell

from django.core.mail import send_mail
send_mail(
    'Test Email',
    'This is a test.',
    'noreply@acted.com',
    ['your-email@example.com'],
)
```

If this fails, check:
- `EMAIL_HOST_USER` is correct
- `EMAIL_HOST_PASSWORD` is Gmail App Password (not regular password)
- Gmail account has 2FA enabled
- App password is active

**Check 2: Queue Processing**
```bash
# View worker logs
railway logs --service worker

# Look for errors like:
# - SMTPAuthenticationError: (535, 'Authentication failed')
# - SMTPException: Connection unexpectedly closed
```

**Check 3: Database Connection**
```bash
railway run python manage.py dbshell

SELECT * FROM utils_emailqueue WHERE status='pending' LIMIT 10;
```

### Gmail Blocking Emails

**Symptom:** "Less secure app blocked" error

**Solution:**
1. **Don't** enable "Less secure apps" (deprecated)
2. **Do** use Gmail App Passwords:
   - Enable 2-Step Verification
   - Generate App Password
   - Use App Password in `EMAIL_HOST_PASSWORD`

### High Email Volume

**Symptom:** Queue processing is slow

**Solutions:**

1. **Increase batch size:**
   ```bash
   EMAIL_QUEUE_BATCH_SIZE=100
   ```

2. **Decrease interval:**
   ```bash
   EMAIL_QUEUE_INTERVAL=10  # Check every 10 seconds
   ```

3. **Add more workers:**
   - Create additional worker services in Railway
   - Each worker processes the queue independently
   - Django's database locking prevents duplicate sends

4. **Scale up Railway plan:**
   - Hobby plan: 1 vCPU, 512 MB RAM
   - Pro plan: 2+ vCPU, more RAM
   - Better for high email volume

## Advanced Configuration

### Custom Worker Command

For more control, create a custom worker script:

```python
# manage.py worker command
from django.core.management.base import BaseCommand
from utils.services.queue_service import email_queue_service
import time

class Command(BaseCommand):
    def handle(self, *args, **options):
        while True:
            try:
                results = email_queue_service.process_pending_queue(limit=100)
                self.stdout.write(f"Processed {results['successful']} emails")
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error: {e}"))
            time.sleep(30)
```

### Multiple Workers with Priority

```yaml
# railway.toml (if using Railway config file)
[deploy]
startCommand = "python manage.py process_email_queue --continuous --priority urgent --interval 10"

[deploy.worker-normal]
startCommand = "python manage.py process_email_queue --continuous --priority normal --interval 30"
```

### Scheduled Email Processing (Alternative to Continuous)

If you prefer cron-style processing:

```bash
# Run every 5 minutes via Railway Cron (if available)
*/5 * * * * python manage.py process_email_queue --limit 100
```

Or use Railway's scheduled jobs feature (Pro plan).

## Performance Tuning

### Recommended Settings by Scale

**Small (< 100 emails/day):**
```bash
EMAIL_QUEUE_BATCH_SIZE=20
EMAIL_QUEUE_INTERVAL=60  # 1 minute
WORKER_COUNT=1
```

**Medium (100-1000 emails/day):**
```bash
EMAIL_QUEUE_BATCH_SIZE=50
EMAIL_QUEUE_INTERVAL=30  # 30 seconds
WORKER_COUNT=1-2
```

**Large (1000+ emails/day):**
```bash
EMAIL_QUEUE_BATCH_SIZE=100
EMAIL_QUEUE_INTERVAL=10  # 10 seconds
WORKER_COUNT=2-3
```

### Database Connection Pooling

For high volume, enable connection pooling:

```python
# settings/uat.py
DATABASES = {
    'default': dj_database_url.parse(
        database_url,
        conn_max_age=600,          # Keep connections for 10 minutes
        conn_health_checks=True,   # Check connection health
        ssl_require=False
    )
}
```

## Security Best Practices

1. **Never commit credentials** to version control
2. **Use Railway environment variables** for all secrets
3. **Rotate Gmail App Passwords** regularly
4. **Enable DEV_EMAIL_OVERRIDE** in UAT to prevent accidental customer emails
5. **Monitor failed emails** for suspicious activity
6. **Set rate limits** on email sending to prevent abuse
7. **Use HTTPS only** for frontend URLs in production

## Testing Checklist

Before going live with email queue:

- [ ] Gmail App Password configured correctly
- [ ] `DEV_EMAIL_OVERRIDE=True` in UAT (test mode)
- [ ] Worker service running in Railway
- [ ] Test email sends successfully
- [ ] Queue processes automatically every 30 seconds
- [ ] Failed emails retry correctly
- [ ] Email logs show successful sends
- [ ] Frontend password reset emails work
- [ ] Order confirmation emails work
- [ ] Email templates render correctly (no broken images)

## Support and Resources

- **Django Email Documentation:** https://docs.djangoproject.com/en/5.1/topics/email/
- **Railway Documentation:** https://docs.railway.app/
- **Gmail App Passwords:** https://support.google.com/accounts/answer/185833
- **Admin3 CLAUDE.md:** See project-specific email configuration

## Summary

To deploy the email queue on Railway:

1. ✅ Add `worker` process to `Procfile`
2. ✅ Set environment variables (SMTP, debugging)
3. ✅ Configure Gmail App Password
4. ✅ Run migrations and create cache table
5. ✅ Deploy to Railway
6. ✅ Monitor worker logs
7. ✅ Test with `DEV_EMAIL_OVERRIDE=True`
8. ✅ Disable override for production

Your email queue is now ready for UAT testing on Railway! 🚀
