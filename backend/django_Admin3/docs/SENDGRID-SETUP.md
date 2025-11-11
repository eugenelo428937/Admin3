# SendGrid Email Setup for Railway

This guide explains how to configure SendGrid email service for the Django Admin3 application on Railway.

## Why SendGrid?

Railway blocks outbound SMTP connections on port 587, making Gmail SMTP unusable. SendGrid provides:
- **HTTP API**: Bypasses SMTP port blocking
- **Free tier**: 100 emails/day forever (no credit card required)
- **Reliable**: Industry-standard email service with high deliverability
- **Simple setup**: Just API key, no domain configuration needed initially

## Prerequisites

- Railway account with Admin3 backend deployed
- SendGrid account (free tier works fine)

## Step 1: Create SendGrid Account

1. Go to [SendGrid](https://sendgrid.com/)
2. Click "Start for Free"
3. Sign up with email (no credit card required for free tier)
4. Complete email verification

## Step 2: Generate API Key

1. Log in to SendGrid dashboard
2. Navigate to **Settings** → **API Keys** (left sidebar)
3. Click **Create API Key** (top right)
4. **Key Name**: Enter descriptive name (e.g., "Admin3 Railway UAT")
5. **API Key Permissions**: Select **Full Access** (easiest for initial setup)
   - Alternatively, select **Restricted Access** and enable:
     - Mail Send: Full Access
     - Email Activity: Read Access (optional, for tracking)
6. Click **Create & View**
7. **CRITICAL**: Copy the API key immediately - it will only be shown once!
   - Format: `SG.xxxxxxxxxxxxxxxxxxxxxxxx.yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy`

## Step 3: Verify Sender Email (Free Tier Requirement)

SendGrid free tier requires sender verification before sending emails.

### Single Sender Verification (Recommended for UAT)

1. Navigate to **Settings** → **Sender Authentication** (left sidebar)
2. Click **Verify a Single Sender**
3. Click **Create New Sender**
4. Fill in sender details:
   - **From Name**: `ActEd UAT`
   - **From Email Address**: `noreply@acted.co.uk` (or your verified domain)
   - **Reply To**: Your support email (e.g., `support@acted.co.uk`)
   - **Company Address**: Your company details
5. Click **Create**
6. Check inbox for verification email and click verification link
7. Sender is now verified ✅

**Important**: The `DEFAULT_FROM_EMAIL` in Railway environment variables MUST match a verified sender.

## Step 4: Configure Railway Environment Variables

### Web Service Variables

1. Go to Railway dashboard
2. Select your **Web** service (backend)
3. Click **Variables** tab
4. Add these variables:

```bash
# SendGrid Configuration
USE_SENDGRID=true
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxx.yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
DEFAULT_FROM_EMAIL=noreply@acted.co.uk
```

**Important**: `DEFAULT_FROM_EMAIL` must match a verified sender in SendGrid.

### Worker Service Variables

The Worker service needs the same email configuration:

**Option 1: Add Reference to Web Service Variables** (Recommended)
1. Select **Worker** service
2. Click **Variables** tab
3. For each SendGrid variable, click **Add Variable** → **Add Reference**
4. Select Web service
5. Choose the variable to reference

**Option 2: Manually Add Variables**
Copy the same three variables from Web service to Worker service.

## Step 5: Update Local .env.uat (Optional)

If testing SendGrid locally:

```bash
# SendGrid Email Configuration
USE_SENDGRID=True
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxx.yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
DEFAULT_FROM_EMAIL=noreply@acted.co.uk
```

## Step 6: Deploy Changes

1. Commit configuration changes:
```bash
git add .
git commit -m "Configure SendGrid email backend for Railway"
git push origin uat
```

2. Railway will automatically redeploy both Web and Worker services

3. Monitor deployment logs:
   - Web service should show: `Starting WEB service...`
   - Worker service should show: `Starting WORKER service...`

## Step 7: Test Email Sending

### Test Email from Django Shell

1. Railway Dashboard → Web service → **Connect** tab → **Open Shell**
2. Run Python shell:
```bash
python manage.py shell
```

3. Send test email:
```python
from django.core.mail import send_mail

send_mail(
    subject='Test Email from Admin3 UAT',
    message='This is a test email sent via SendGrid.',
    from_email='noreply@acted.co.uk',  # Must be verified sender
    recipient_list=['your-email@example.com'],
    fail_silently=False,
)
```

4. Check recipient inbox (may take 1-2 minutes)

### Test Email Queue Processing

1. Create test order in frontend (or trigger any email-generating action)
2. Railway Dashboard → Worker service → **Deployments** → View logs
3. Look for:
```
[INFO] Starting WORKER service...
[INFO] Email queue processor started
[INFO] Processing batch of X emails
[INFO] Successfully sent email ID 123
```

4. Check recipient inbox for email
5. Check BCC recipients for monitoring copy (if enabled)

## Configuration Summary

### Django Settings (uat.py)

```python
# Email Backend Configuration
USE_SENDGRID = env.bool('USE_SENDGRID', default=False)

if USE_SENDGRID:
    EMAIL_BACKEND = 'anymail.backends.sendgrid.EmailBackend'
    ANYMAIL = {
        "SENDGRID_API_KEY": env('SENDGRID_API_KEY'),
    }
    DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='noreply@acted.co.uk')
else:
    # SMTP backend for local development
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    # ... SMTP settings
```

### Required Environment Variables

| Variable | Example | Description |
|----------|---------|-------------|
| `USE_SENDGRID` | `true` | Enable SendGrid backend |
| `SENDGRID_API_KEY` | `SG.xxxx.yyyy` | SendGrid API key |
| `DEFAULT_FROM_EMAIL` | `noreply@acted.co.uk` | Must be verified sender |

### Optional BCC Monitoring Variables

| Variable | Example | Description |
|----------|---------|-------------|
| `EMAIL_BCC_MONITORING` | `true` | Enable BCC copies |
| `EMAIL_BCC_RECIPIENTS` | `test@example.com,debug@example.com` | Comma-separated list |

## Troubleshooting

### Error: "The from email does not match a verified Sender Identity"

**Problem**: `DEFAULT_FROM_EMAIL` not verified in SendGrid.

**Solution**:
1. Go to SendGrid → Settings → Sender Authentication
2. Verify the email address used in `DEFAULT_FROM_EMAIL`
3. Update Railway variable if needed
4. Redeploy

### Error: "Unauthorized" or "Invalid API Key"

**Problem**: API key incorrect or expired.

**Solution**:
1. Generate new API key in SendGrid dashboard
2. Update `SENDGRID_API_KEY` in Railway
3. Redeploy services

### Emails Not Sending

**Check Worker Logs**:
```bash
# Railway Dashboard → Worker service → Deployments → View logs
```

Look for errors like:
- `Failed to send email: 401 Unauthorized` → API key issue
- `Failed to send email: 400 Bad Request` → Sender not verified
- `Failed to send email: 403 Forbidden` → API key permissions insufficient

### SendGrid Limits

**Free Tier**:
- 100 emails/day
- Single sender verification only
- No dedicated IP

**Paid Plans**:
- Higher limits
- Domain authentication (better deliverability)
- Dedicated IP addresses

## SendGrid vs SMTP Comparison

| Feature | SendGrid HTTP API | Gmail SMTP |
|---------|------------------|------------|
| **Railway Compatible** | ✅ Yes | ❌ No (port 587 blocked) |
| **Setup Complexity** | Simple (API key only) | Complex (app password, 2FA) |
| **Free Tier** | 100 emails/day | Unclear limits, rate limiting |
| **Reliability** | Industry-standard | Google rate limits |
| **Deliverability** | High | Lower (Gmail flagging) |
| **Tracking** | Built-in analytics | None |

## Next Steps

After successful SendGrid setup:

1. **Monitor email delivery**: Check SendGrid Activity Feed for delivery stats
2. **Configure domain authentication** (optional): Improve deliverability with custom domain
3. **Set up templates** (optional): Use SendGrid dynamic templates for consistent branding
4. **Review analytics**: Track open rates, click rates, bounces

## Resources

- [SendGrid Documentation](https://docs.sendgrid.com/)
- [Django Anymail SendGrid Backend](https://anymail.dev/en/stable/esps/sendgrid/)
- [SendGrid Free Tier Limits](https://sendgrid.com/pricing/)
- [Sender Authentication Guide](https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication)
