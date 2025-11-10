# Railway Worker Service Setup - Step by Step

This guide shows how to set up a separate Worker service in Railway to process email queues.

## Architecture

```
Railway Project
├── Service 1: Backend Web (uses railway.json)
│   ├── Runs: gunicorn web server
│   ├── Config: railway.json
│   └── Handles: HTTP requests, queues emails
│
└── Service 2: Email Worker (custom start command)
    ├── Runs: process_email_queue command
    ├── Config: Manual start command override
    └── Handles: Sends queued emails every 30 seconds
```

## Prerequisites

- Your main backend service is already deployed and working
- You have environment variables configured for email (SMTP settings)

## Step-by-Step Setup

### Step 1: Create Worker Service in Railway

1. Open your Railway project dashboard
2. Click **"+ New"** button (top right)
3. Select **"Empty Service"**
4. Name it **"Email Worker"** (or similar)

### Step 2: Connect to GitHub Repository

1. In the new Worker service, click **"Settings"** tab
2. Scroll to **"Source"** section
3. Click **"Connect Repo"**
4. Select your repository: `eugenelo428937/Admin3`
5. Select your branch: `uat` (or whichever branch you're using)
6. Set **"Root Directory"**: `backend/django_Admin3`
7. Click **"Save"**

### Step 3: Configure Build Settings

1. Still in **"Settings"** tab
2. Scroll to **"Build"** section
3. Set **"Builder"**: `NIXPACKS` (should be automatic)
4. **"Build Command"** (optional):
   ```bash
   pip install -r requirements.txt
   ```
5. Click **"Save"**

### Step 4: Set Custom Start Command

**THIS IS THE CRITICAL STEP:**

1. Still in **"Settings"** tab
2. Scroll to **"Deploy"** section
3. Find **"Custom Start Command"** field
4. Enter this EXACT command:
   ```bash
   python manage.py process_email_queue --continuous --interval 30
   ```
5. Click **"Save"**

### Step 5: Share Environment Variables

**⚠️ CRITICAL:** The Worker needs the same environment variables as your Web service.

**Option A: Reference Shared Variables (Recommended)**

1. Go to **"Variables"** tab in Worker service
2. Click **"New Variable"** → **"Add Reference"**
3. Select your Web service from the dropdown
4. This shares ALL variables automatically ✅

**Option B: Manually Add Variables**

If Option A doesn't work, you MUST manually add these **minimum required variables**:

```bash
# CRITICAL - Django Settings (Must be set FIRST)
DJANGO_SETTINGS_MODULE=django_Admin3.settings.uat
DJANGO_ENV=uat

# CRITICAL - Database
DATABASE_URL=postgresql://...

# CRITICAL - Django Secret
SECRET_KEY=your-secret-key

# Email SMTP Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@example.com
EMAIL_HOST_PASSWORD=your-app-password
EMAIL_USE_TLS=True

# Email BCC Monitoring
EMAIL_BCC_MONITORING=True
EMAIL_BCC_RECIPIENTS=eugenelo@bpp.com,eugene.lo1030@gmail.com

# Email Queue Settings
EMAIL_QUEUE_BATCH_SIZE=50
EMAIL_QUEUE_INTERVAL=30
```

**⚠️ Common Error:** If you see `KeyError: 'DJANGO_SECRET_KEY'` during build, it means `DJANGO_SETTINGS_MODULE` is not set or is set to `development` instead of `uat`.

### Step 6: Deploy Worker Service

1. Click **"Deploy"** button (or it may auto-deploy)
2. Wait for deployment to complete
3. Go to **"Deployments"** tab to monitor progress

### Step 7: Verify Worker is Running Correctly

1. Go to **"Deployments"** tab
2. Click on the latest deployment
3. Check the **logs**

**✅ CORRECT LOGS (What you want to see):**

```text
Starting email queue processor...
Continuous mode: True, Interval: 30 seconds
Checking for emails to send...
Processing email queue...
Found 0 emails to send
Sleeping for 30 seconds...
```

**❌ INCORRECT LOGS (What you're seeing now):**

```text
[2025-11-10 21:24:17 +0000] [1] [INFO] Listening at: http://0.0.0.0:8080 (1)
[2025-11-10 21:24:17 +0000] [1] [INFO] Using worker: sync
[2025-11-10 21:24:17 +0000] [6] [INFO] Booting worker with pid: 6
```

If you see the INCORRECT logs, the Worker service is still using `railway.json` startCommand. Go back to **Step 4** and ensure the custom start command is set.

## Troubleshooting

### Build Fails with "KeyError: 'DJANGO_SECRET_KEY'"

**Problem:** Worker build fails during `collectstatic` with error:

```text
DJANGO_ENV development
KeyError: 'DJANGO_SECRET_KEY'
django.core.exceptions.ImproperlyConfigured: Set the DJANGO_SECRET_KEY environment variable
```

**Root Cause:** Worker is using `development` settings instead of `uat` settings, or environment variables aren't shared.

**Solution:**

1. Go to Worker service → **"Variables"** tab
2. **Option A (Easiest):** Click "Add Reference" → Select your Web service → Save
3. **Option B (Manual):** Add these variables:

   ```bash
   DJANGO_SETTINGS_MODULE=django_Admin3.settings.uat
   DJANGO_ENV=uat
   SECRET_KEY=<copy from Web service>
   DATABASE_URL=<copy from Web service>
   ```

4. Redeploy the Worker service
5. Verify logs no longer show "DJANGO_ENV development"

### Worker Still Running Gunicorn

**Problem:** Worker service shows gunicorn logs instead of email processor

**Solution:**
1. Go to Worker service → Settings → Deploy
2. Make sure **"Custom Start Command"** field has the email command
3. Click "Save" and redeploy

### Worker Can't Connect to Database

**Problem:** Worker logs show database connection errors

**Solution:**
1. Verify `DATABASE_URL` is shared with Worker service
2. Check that Web service database is accessible
3. Both services should use the same `DATABASE_URL`

### Emails Not Sending

**Problem:** Worker runs but emails stay in queue

**Solution:**
1. Check SMTP credentials are correct
2. Verify `EMAIL_HOST_PASSWORD` is the Gmail App Password (not regular password)
3. Check Worker logs for SMTP errors
4. Test email settings: `python manage.py test_emails send --template order_confirmation --email test@example.com`

### Worker Crashes After Deploy

**Problem:** Worker service starts then immediately crashes

**Solution:**
1. Check Worker logs for Python errors
2. Verify all required environment variables are set
3. Check that `requirements.txt` includes all dependencies
4. Ensure `DJANGO_SETTINGS_MODULE=django_Admin3.settings.uat` is set

## Monitoring

### Check Worker Health

```bash
# View logs in real-time
Railway Dashboard → Email Worker → Deployments → [Latest] → Logs
```

### Check Email Queue Status

Run this in your Web service's Railway CLI or Django shell:

```python
from utils.models import EmailQueue

# Check pending emails
pending = EmailQueue.objects.filter(sent=False).count()
print(f"Pending emails: {pending}")

# Check recently sent emails
recent = EmailQueue.objects.filter(sent=True).order_by('-sent_at')[:10]
for email in recent:
    print(f"{email.sent_at}: {email.subject} → {email.to_email}")
```

## Summary

After completing these steps, you should have:

1. ✅ **Web Service**: Running gunicorn, handling HTTP requests, queuing emails
2. ✅ **Worker Service**: Running email processor, sending emails every 30 seconds
3. ✅ **Shared Variables**: Both services access same database and email config
4. ✅ **Email Monitoring**: BCC copies sent to monitoring addresses

Your emails will now be sent automatically every 30 seconds by the Worker service!
