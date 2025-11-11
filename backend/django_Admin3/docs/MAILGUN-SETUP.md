# Mailgun Setup Guide for Railway

This guide shows how to set up Mailgun email service for Railway deployment, replacing Gmail SMTP which is blocked by Railway.

## Why Mailgun?

- **HTTP API** - Works over HTTPS (port 443), not blocked by Railway
- **Free Tier** - 5,000 emails/month for first 3 months
- **Reliable** - Industry-standard email delivery service
- **Simple Integration** - Works with Django's `anymail` package

## Step 1: Create Mailgun Account

1. Go to [mailgun.com](https://www.mailgun.com)
2. Click **"Sign Up"** (top right)
3. Choose **"Start Free Trial"** (5,000 emails/month for 3 months)
4. Fill in:
   - Email address
   - Company name (can be personal name)
   - Password
5. Verify your email address

## Step 2: Get Mailgun Credentials

After signing in:

1. Go to **"Sending"** → **"Overview"** in left sidebar
2. Look for **"API Keys"** section
3. Copy these values:
   - **Private API Key** (starts with `key-...`)
   - **Domain** (usually `sandboxXXX.mailgun.org` for free tier)
   - **Region** (either `US` or `EU`)

**Example:**
```
Private API Key: key-1234567890abcdef1234567890abcdef
Domain: sandbox12345abcdef67890.mailgun.org
Region: US
```

## Step 3: Install Mailgun Package

Add to `requirements.txt`:

```txt
django-anymail[mailgun]==12.1.0
```

Then update requirements:

```bash
pip install -r requirements.txt
```

## Step 4: Update Django Settings

Edit `backend/django_Admin3/django_Admin3/settings/uat.py`:

```python
# Email Backend - Mailgun (for Railway deployment)
EMAIL_BACKEND = 'anymail.backends.mailgun.EmailBackend'

# Mailgun Configuration
ANYMAIL = {
    "MAILGUN_API_KEY": env('MAILGUN_API_KEY'),
    "MAILGUN_SENDER_DOMAIN": env('MAILGUN_DOMAIN'),
    "MAILGUN_API_URL": env('MAILGUN_API_URL', default='https://api.mailgun.net/v3'),  # US region
}

# Default From Email
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='noreply@yourdomain.com')
SERVER_EMAIL = DEFAULT_FROM_EMAIL

# Keep existing BCC monitoring settings
EMAIL_BCC_MONITORING = env.bool('EMAIL_BCC_MONITORING', default=False)
EMAIL_BCC_RECIPIENTS = env.list('EMAIL_BCC_RECIPIENTS', default=[])
```

**For EU Region** (if your Mailgun account is in EU):
```python
ANYMAIL = {
    "MAILGUN_API_KEY": env('MAILGUN_API_KEY'),
    "MAILGUN_SENDER_DOMAIN": env('MAILGUN_DOMAIN'),
    "MAILGUN_API_URL": 'https://api.eu.mailgun.net/v3',  # EU region
}
```

## Step 5: Update Environment Variables

### Local Development (.env.uat)

Add to `backend/django_Admin3/.env.uat`:

```bash
# Mailgun Email Configuration
MAILGUN_API_KEY=key-1234567890abcdef1234567890abcdef
MAILGUN_DOMAIN=sandbox12345abcdef67890.mailgun.org
MAILGUN_API_URL=https://api.mailgun.net/v3
DEFAULT_FROM_EMAIL=noreply@yourdomain.com

# Keep existing BCC monitoring
EMAIL_BCC_MONITORING=True
EMAIL_BCC_RECIPIENTS=eugenelo@bpp.com,eugene.lo1030@gmail.com
```

### Railway Environment Variables

In Railway Dashboard → Worker Service → Variables:

1. **Add New Variable**: `MAILGUN_API_KEY`
   - Value: `key-1234567890abcdef1234567890abcdef` (your actual key)

2. **Add New Variable**: `MAILGUN_DOMAIN`
   - Value: `sandbox12345abcdef67890.mailgun.org` (your actual domain)

3. **Add New Variable**: `MAILGUN_API_URL`
   - Value: `https://api.mailgun.net/v3` (or EU URL)

4. **Add New Variable**: `DEFAULT_FROM_EMAIL`
   - Value: `noreply@yourdomain.com`

**Repeat for Web Service** if it also sends emails.

## Step 6: Add Authorized Recipients (Sandbox Mode)

Mailgun sandbox domains can only send to **authorized recipients**.

1. Go to Mailgun Dashboard → **"Sending"** → **"Authorized Recipients"**
2. Click **"Add Recipient"**
3. Enter email address: `eugenelo@bpp.com`
4. Click **"Save"**
5. Check that email for verification link
6. Repeat for all test email addresses

**Important:** In sandbox mode, you can only send to authorized recipients. To send to any email, you need to:
- Add a custom domain (requires DNS setup)
- Or upgrade to a paid plan

## Step 7: Update Email Service (Optional)

The existing `email_service.py` should work as-is with Mailgun through `anymail`. However, if you need Mailgun-specific features, you can access them:

```python
from anymail.message import AnymailMessage

# In email_service.py, replace EmailMultiAlternatives with AnymailMessage
email = AnymailMessage(
    subject=subject,
    body=text_content,
    from_email=from_email or self.from_email,
    to=actual_recipients,
    bcc=bcc_recipients if bcc_recipients else None
)

# Add Mailgun-specific metadata (optional)
email.metadata = {
    'user_id': user_id,
    'order_id': order_id,
}

# Add tags for tracking (optional)
email.tags = ['order_confirmation', 'transactional']
```

## Step 8: Test Email Sending

### Test from Django Shell

```bash
# In Railway Shell or local terminal
python manage.py shell
```

```python
from django.core.mail import send_mail

send_mail(
    'Test Email from Mailgun',
    'This is a test email sent via Mailgun HTTP API.',
    'noreply@yourdomain.com',
    ['eugenelo@bpp.com'],  # Must be authorized recipient in sandbox mode
    fail_silently=False,
)
```

### Test from Management Command

```bash
python manage.py test_emails send \
    --template order_confirmation \
    --email eugenelo@bpp.com
```

## Step 9: Deploy to Railway

1. Commit changes:
   ```bash
   git add requirements.txt django_Admin3/settings/uat.py
   git commit -m "Add Mailgun email backend for Railway"
   git push origin uat
   ```

2. Railway will automatically redeploy

3. Check Worker logs for email sending:
   ```
   INFO utils.email_service Email BCC monitoring enabled
   INFO utils.email_service Email sent successfully via Mailgun
   ```

## Step 10: Verify Email Delivery

1. Go to Mailgun Dashboard → **"Sending"** → **"Logs"**
2. You should see sent emails with delivery status
3. Check recipient inbox for test email

## Troubleshooting

### Error: "Forbidden - Sandbox domain requires authorized recipients"

**Problem:** Trying to send to non-authorized email in sandbox mode

**Solution:**
- Add recipient to Authorized Recipients in Mailgun dashboard
- Or add custom domain (see Step 11)

### Error: "Invalid API key"

**Problem:** Wrong API key or missing from environment variables

**Solution:**
1. Go to Mailgun Dashboard → Sending → Overview → API Keys
2. Copy the correct **Private API Key**
3. Update `MAILGUN_API_KEY` in Railway environment variables
4. Redeploy

### Error: "Domain not found"

**Problem:** Wrong domain or typo in environment variable

**Solution:**
1. Go to Mailgun Dashboard → Sending → Domains
2. Copy the exact domain name (e.g., `sandbox12345.mailgun.org`)
3. Update `MAILGUN_DOMAIN` in Railway environment variables
4. Redeploy

### Emails Not Sending

**Check Worker logs:**
```bash
# In Railway Dashboard
Worker Service → Deployments → [Latest] → Logs
```

Look for:
```
ERROR anymail.backends.mailgun: Mailgun API error...
```

Common causes:
- Wrong API key
- Wrong domain
- Wrong API URL (US vs EU)
- Unauthorized recipient in sandbox mode

## Step 11: Add Custom Domain (Production)

For production, add your own domain to send to any email address:

1. Go to Mailgun Dashboard → **"Sending"** → **"Domains"**
2. Click **"Add New Domain"**
3. Enter your domain: `mail.yourdomain.com`
4. Follow DNS setup instructions:
   - Add TXT records for verification
   - Add MX records
   - Add DKIM records
   - Add SPF records
5. Wait for DNS propagation (up to 48 hours)
6. Verify domain in Mailgun dashboard
7. Update `MAILGUN_DOMAIN` in Railway variables to `mail.yourdomain.com`

## Cost Breakdown

**Free Tier:**
- 5,000 emails/month for first 3 months
- 100 email validations/month
- Sandbox domain included

**Foundation Plan ($35/month after trial):**
- 50,000 emails/month included
- $0.80 per 1,000 additional emails
- Custom domain support
- Email validation API

**Growth Plan ($80/month):**
- 100,000 emails/month included
- $0.70 per 1,000 additional emails
- Dedicated IP address
- Advanced analytics

## Summary

✅ **Setup Complete:**
- Mailgun account created
- API credentials configured
- Django anymail package installed
- Railway environment variables set
- Authorized recipients added (sandbox mode)
- Email sending tested

✅ **Benefits:**
- No SMTP port blocking issues
- Reliable email delivery
- Detailed logs and analytics
- Free tier for testing
- Easy to scale for production

Your Worker service can now send emails via Mailgun HTTP API on Railway! 🎉
