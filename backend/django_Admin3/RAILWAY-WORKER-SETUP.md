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

**⚠️ CRITICAL:** Worker must NOT use `railway.json` (that's for the Web service only).

1. Still in **"Settings"** tab
2. Scroll to **"Build"** section
3. Set **"Builder"**: `NIXPACKS` (should be automatic)
4. **"Build Command"**: Leave EMPTY or set to:
   ```bash
   pip install -r requirements.txt
   ```
   **DO NOT** include `python manage.py collectstatic` - Worker doesn't need static files
5. Click **"Save"**

### Step 4: Disable Health Check for Worker

**⚠️ CRITICAL:** Worker service doesn't run a web server, so health checks will fail.

1. Still in **"Settings"** tab (Worker service)
2. Scroll to **"Deploy"** section
3. Find **"Health Check Path"** field
4. **Delete** the path (clear the field completely)
5. Or find **"Enable Health Check"** toggle and turn it OFF
6. Click **"Save"**

**Why:** The `railway.json` health check (`/api/health/`) only works for Web service. Worker doesn't have HTTP endpoints, so health checks cause deployment failures.

### Step 5: Set SERVICE_TYPE Environment Variable

**⚠️ THIS IS THE CRITICAL STEP:**

The `railway.json` now uses a conditional startup script (`railway-start.sh`) that checks the `SERVICE_TYPE` environment variable to decide whether to run as Web or Worker.

1. Go to **"Variables"** tab (Worker service)
2. Click **"New Variable"**
3. Set:
   - **Variable Name**: `SERVICE_TYPE`
   - **Value**: `worker`
4. Click **"Add"** or **"Save"**

**How it works:**

- `railway-start.sh` checks if `SERVICE_TYPE=worker`
- If yes → runs email queue processor
- If no (or not set) → runs web server with gunicorn
- Web service doesn't set this variable, so it runs as web by default
- Worker service MUST set `SERVICE_TYPE=worker`

### Step 6: Share Environment Variables

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

### Step 7: Deploy Worker Service

1. Click **"Deploy"** button (or it may auto-deploy)
2. Wait for deployment to complete
3. Go to **"Deployments"** tab to monitor progress

### Step 8: Verify Worker is Running Correctly

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

### Health Check Failing

**Problem:** Deployment fails with health check errors, service keeps restarting

**Root Cause:** Worker service doesn't run a web server, so HTTP health checks at `/api/health/` fail.

**Solution:**

1. Go to Worker service → **"Settings"** tab → **"Deploy"** section
2. Find **"Health Check Path"** field
3. Clear the field completely (remove `/api/health/`)
4. Or toggle **"Enable Health Check"** to OFF
5. Click **"Save"** and redeploy

**Why:** Health checks are only for services that respond to HTTP requests (web servers). Worker services run background processes and don't have HTTP endpoints.

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

**Problem:** Worker service shows gunicorn logs instead of email processor:

```text
[INFO] Listening at: http://0.0.0.0:8080
[INFO] Using worker: sync
[INFO] Booting worker with pid: 6
```

**Root Cause:** The `SERVICE_TYPE` environment variable is not set to `worker`.

**Solution:**

1. Go to Worker service → **"Variables"** tab
2. Check if `SERVICE_TYPE` variable exists
3. If missing, click **"New Variable"**:
   - Variable Name: `SERVICE_TYPE`
   - Value: `worker`
4. If exists but wrong value, click on it and change to `worker`
5. Click **"Save"**
6. Go to **"Deployments"** tab and click **"Redeploy"**
7. Check logs - you should now see:

   ```text
   Starting WORKER service...
   Starting email queue processor...
   Continuous mode: True, Interval: 30 seconds
   ```

   Instead of gunicorn logs

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
