# Railway Email Queue Setup - Quick Start

## TL;DR

To enable email sending on Railway UAT:

1. **Add worker process** to `Procfile` ✅ (already done)
2. **Set environment variables** in Railway dashboard
3. **Deploy** and verify worker is running
4. **Enable email debugging** to avoid spamming real users during testing

## 1. Required Environment Variables

Add these to Railway (minimum required):

```bash
# Email SMTP
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-gmail-app-password

# Email BCC Monitoring (RECOMMENDED FOR UAT)
# Sends email to real user PLUS BCC copy to monitoring addresses
EMAIL_BCC_MONITORING=True
EMAIL_BCC_RECIPIENTS=your-monitoring-email@example.com

# Email Debugging (Alternative - redirects ALL emails)
# Use this if you DON'T want to send to real users yet
DEV_EMAIL_OVERRIDE=False
DEV_EMAIL_RECIPIENTS=your-test-email@example.com
```

**Get Gmail App Password:**
1. https://myaccount.google.com/security
2. Enable 2-Step Verification
3. App passwords → Generate for "Mail"
4. Copy 16-character password (no spaces)

## 2. Deploy to Railway

The Procfile already includes the worker process:

```
web: gunicorn django_Admin3.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 60
worker: python manage.py process_email_queue --continuous --interval 30
```

Railway will automatically create both services.

## 3. Verify Deployment

Check worker is running:

```bash
railway logs --service worker
```

You should see:
```
Starting continuous email queue processor...
Batch size: 50, Interval: 30s
```

## 4. Test Email Sending

```bash
railway run python manage.py shell

from django.core.mail import send_mail
send_mail('Test', 'Test email', 'noreply@acted.com', ['customer@example.com'])
# With DEV_EMAIL_OVERRIDE=True, this goes to your test email instead
```

## Email Testing Features

### BCC Monitoring (Recommended for UAT)

**Perfect for UAT testing** - sends emails to real users AND sends you a blind copy.

#### How It Works

When `EMAIL_BCC_MONITORING=True`:
- ✅ Email sent to actual recipient (e.g., customer@example.com)
- ✅ BCC copy sent to monitoring addresses (invisible to recipient)
- ✅ You can verify what customers receive without interrupting their experience
- ✅ Perfect for UAT: test real user flow while monitoring emails

Example:
```
To: customer@example.com (receives email normally)
BCC: your-monitoring@example.com (receives invisible copy)
```

#### Enable/Disable BCC Monitoring

**Enable for UAT testing (Recommended):**
```bash
EMAIL_BCC_MONITORING=True
EMAIL_BCC_RECIPIENTS=monitor1@example.com,monitor2@example.com
```

**Disable for production:**
```bash
EMAIL_BCC_MONITORING=False
# Or remove the variable
```

---

### Email Override (Alternative - Full Redirect)

**Use this if you DON'T want to send to real users yet.**

#### How It Works

When `DEV_EMAIL_OVERRIDE=True`:
- ⚠️ All emails are REDIRECTED to `DEV_EMAIL_RECIPIENTS`
- ⚠️ Real customers never receive emails
- ✅ Original recipient shown in email body
- ✅ Subject and content unchanged
- ✅ Good for early testing before real user testing

Example:
```
Original Recipient: customer@example.com (does NOT receive email)
Actual Recipient: your-test-email@example.com (redirected)
```

#### Enable/Disable Email Override

**Enable for early testing:**
```bash
DEV_EMAIL_OVERRIDE=True
DEV_EMAIL_RECIPIENTS=test1@example.com,test2@example.com
```

**Disable when ready for real users:**
```bash
DEV_EMAIL_OVERRIDE=False
```

---

### Which Feature Should I Use?

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

## Configuration Files

| File | Purpose |
|------|---------|
| `Procfile` | Defines web and worker processes |
| `django_Admin3/settings/uat.py` | UAT environment settings |
| `.env.uat` | Local UAT environment variables (NOT committed) |
| `utils/management/commands/process_email_queue.py` | Email queue processor |

## Common Issues

### Worker Crashed

**Check logs:**
```bash
railway logs --service worker
```

**Common causes:**
- Missing `EMAIL_HOST_USER` or `EMAIL_HOST_PASSWORD`
- Invalid Gmail app password
- Database connection issue

### Emails Not Sending

**Check queue:**
```bash
railway run python manage.py shell
from utils.models import EmailQueue
print(EmailQueue.objects.filter(status='pending').count())
```

**Test SMTP:**
```bash
railway run python manage.py shell
from django.core.mail import send_mail
send_mail('Test', 'Test', 'noreply@acted.com', ['test@example.com'])
```

### Email Override Not Working

**Verify settings:**
```bash
railway run python manage.py shell
from django.conf import settings
print(f"DEV_EMAIL_OVERRIDE: {settings.DEV_EMAIL_OVERRIDE}")
print(f"DEV_EMAIL_RECIPIENTS: {settings.DEV_EMAIL_RECIPIENTS}")
```

## Documentation

Full documentation available in:

- **Setup Guide:** `docs/railway-email-queue-setup.md`
- **Deployment Checklist:** `docs/railway-deployment-checklist.md`
- **Environment Variables:** `docs/railway-env-vars-reference.md`

## Quick Commands

```bash
# View worker logs
railway logs --service worker

# Restart worker
railway restart --service worker

# Check queue status
railway run python manage.py shell -c "from utils.services.queue_service import email_queue_service; print(email_queue_service.get_queue_stats())"

# Process queue manually (one-time)
railway run python manage.py process_email_queue --limit 50

# View failed emails
railway run python manage.py shell -c "from utils.models import EmailQueue; print(list(EmailQueue.objects.filter(status='failed').values('id', 'error_message')))"
```

## Support

If you encounter issues:

1. Check worker logs: `railway logs --service worker`
2. Verify environment variables are set
3. Test SMTP connection manually
4. Check database connection
5. Review full documentation in `docs/` folder

---

**Railway Dashboard:** https://railway.app/dashboard
**Django Admin:** https://your-backend.railway.app/admin/
**API Health Check:** https://your-backend.railway.app/api/health/
