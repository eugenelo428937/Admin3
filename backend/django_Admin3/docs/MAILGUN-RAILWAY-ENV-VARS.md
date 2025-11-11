# Mailgun Environment Variables for Railway

Quick reference for setting up Mailgun email on Railway Worker service.

## Required Environment Variables

Add these to **Railway → Worker Service → Variables**:

### 1. Enable Mailgun

```bash
USE_MAILGUN=True
```

### 2. Mailgun API Credentials

```bash
# Get from: Mailgun Dashboard → Sending → Overview → API Keys
MAILGUN_API_KEY=key-1234567890abcdef1234567890abcdef

# Get from: Mailgun Dashboard → Sending → Overview → Domain
MAILGUN_DOMAIN=sandbox12345abcdef67890.mailgun.org

# US Region (default)
MAILGUN_API_URL=https://api.mailgun.net/v3

# OR EU Region (if your account is in EU)
# MAILGUN_API_URL=https://api.eu.mailgun.net/v3
```

### 3. From Email Address

```bash
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
```

### 4. Keep Existing BCC Monitoring

```bash
EMAIL_BCC_MONITORING=True
EMAIL_BCC_RECIPIENTS=eugenelo@bpp.com,eugene.lo1030@gmail.com
```

## Complete Railway Variable List

After adding Mailgun variables, your Worker service should have:

```bash
# Service Type
SERVICE_TYPE=worker

# Django Settings
DJANGO_SETTINGS_MODULE=django_Admin3.settings.uat
DJANGO_ENV=uat

# Database (shared from Web service)
DATABASE_URL=postgresql://...

# Django Secret
SECRET_KEY=your-secret-key

# Mailgun Email (NEW)
USE_MAILGUN=True
MAILGUN_API_KEY=key-1234567890abcdef1234567890abcdef
MAILGUN_DOMAIN=sandbox12345abcdef67890.mailgun.org
MAILGUN_API_URL=https://api.mailgun.net/v3
DEFAULT_FROM_EMAIL=noreply@yourdomain.com

# Email Monitoring
EMAIL_BCC_MONITORING=True
EMAIL_BCC_RECIPIENTS=eugenelo@bpp.com,eugene.lo1030@gmail.com

# Email Queue Settings
EMAIL_QUEUE_BATCH_SIZE=50
EMAIL_QUEUE_INTERVAL=30
```

## How to Add Variables in Railway

### Option 1: Add Each Variable Manually

1. Go to Worker service → **"Variables"** tab
2. Click **"New Variable"**
3. Enter **Variable Name** (e.g., `USE_MAILGUN`)
4. Enter **Value** (e.g., `True`)
5. Click **"Add"**
6. Repeat for all Mailgun variables

### Option 2: Use Variable Reference (Recommended)

If you already added Mailgun variables to Web service:

1. Worker service → **"Variables"** tab
2. Click **"New Variable"** → **"Add Reference"**
3. Select **Web service**
4. This shares ALL variables automatically

Then just add Worker-specific variables:
- `SERVICE_TYPE=worker`

## Verification

After adding variables and redeploying:

### Check Worker Logs

```
✅ Correct logs:
Starting WORKER service...
INFO utils.email_service Email BCC monitoring enabled
INFO anymail.backends.mailgun Sending email via Mailgun
INFO utils.email_service Email sent successfully

❌ Wrong logs (if USE_MAILGUN not set):
ERROR utils.email_service SMTP error: [Errno 101] Network is unreachable
```

### Check Mailgun Dashboard

1. Go to Mailgun Dashboard → **"Sending"** → **"Logs"**
2. Look for sent emails with status **"Delivered"**
3. Verify recipient received the email

## Troubleshooting

### "Forbidden - Sandbox domain requires authorized recipients"

In sandbox mode, you can only send to authorized recipients.

**Solution:**
1. Mailgun Dashboard → **"Sending"** → **"Authorized Recipients"**
2. Click **"Add Recipient"**
3. Enter: `eugenelo@bpp.com`
4. Check email and verify
5. Repeat for all test addresses

### "Invalid API key"

**Check:**
1. Variable name is `MAILGUN_API_KEY` (exact spelling)
2. Value starts with `key-` (not the public key)
3. No extra spaces in the value

### "Domain not found"

**Check:**
1. Variable name is `MAILGUN_DOMAIN` (not `MAILGUN_DOMAIN_NAME`)
2. Value is exact domain from Mailgun (e.g., `sandbox12345.mailgun.org`)
3. No `http://` or `https://` prefix

### Emails Still Not Sending

**Verify USE_MAILGUN is set:**
```bash
# In Railway Shell
echo $USE_MAILGUN
# Should output: True
```

If not set, add the variable and redeploy.

## Next Steps

1. ✅ Add all environment variables
2. ✅ Redeploy Worker service
3. ✅ Add authorized recipients in Mailgun
4. ✅ Test email sending
5. ✅ Verify in Mailgun logs
6. ✅ Check recipient inbox

Once working, consider adding a custom domain for production to send to any email address (not just authorized recipients).
