# SendGrid Railway Environment Variables - Quick Reference

This is a quick reference for setting up SendGrid email variables in Railway for the Admin3 backend.

## Required Variables for Both Services

Both **Web** and **Worker** services need these variables:

```bash
# SendGrid Configuration
USE_SENDGRID=true
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxx.yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
DEFAULT_FROM_EMAIL=noreply@acted.co.uk
```

## How to Add Variables in Railway

### Method 1: Add Reference (Recommended)

1. Set variables in **Web** service first
2. Go to **Worker** service → Variables
3. Click **Add Variable** → **Add Reference**
4. Select Web service
5. Choose each variable to reference

**Benefits**:
- Single source of truth
- Automatically syncs when Web service variable changes
- No manual duplication

### Method 2: Manual Entry

Copy-paste the same variables to both Web and Worker services manually.

## Complete Variable List

### SendGrid Configuration

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `USE_SENDGRID` | Yes | `true` | Enables SendGrid backend |
| `SENDGRID_API_KEY` | Yes | `SG.xxxx.yyyy` | API key from SendGrid dashboard |
| `DEFAULT_FROM_EMAIL` | Yes | `noreply@acted.co.uk` | Must be verified in SendGrid |

### Email Monitoring (Optional)

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `EMAIL_BCC_MONITORING` | No | `true` | Send BCC copies of all emails |
| `EMAIL_BCC_RECIPIENTS` | No | `test@example.com,debug@example.com` | Comma-separated list |

### Email Queue Settings (Optional)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EMAIL_QUEUE_BATCH_SIZE` | No | `50` | Number of emails to process per batch |
| `EMAIL_QUEUE_INTERVAL` | No | `30` | Seconds between batch processing |

## Service-Specific Variables

### Web Service Only

Already has all core Django variables (`DJANGO_SECRET_KEY`, `DATABASE_URL`, etc.)

### Worker Service Only

Needs this additional variable to run email queue processor:

```bash
SERVICE_TYPE=worker
```

**Critical**: Without this, Worker will start web server instead of email processor.

## Verification Checklist

After adding variables:

- [ ] Web service has `USE_SENDGRID=true`
- [ ] Web service has valid `SENDGRID_API_KEY`
- [ ] Web service has verified `DEFAULT_FROM_EMAIL`
- [ ] Worker service has all three SendGrid variables (via Reference or manual)
- [ ] Worker service has `SERVICE_TYPE=worker`
- [ ] Both services redeployed after variable changes

## Testing

### Check Variable is Set

Railway Dashboard → Service → Variables → Verify variable exists

### Test in Shell

```bash
# Railway Dashboard → Service → Connect → Open Shell
echo $USE_SENDGRID
echo $SENDGRID_API_KEY
echo $DEFAULT_FROM_EMAIL
```

Should output the variable values (not empty).

## Common Issues

### Worker Running Gunicorn

**Problem**: Worker service logs show:
```
[INFO] Listening at: http://0.0.0.0:8080
```

**Solution**: Add `SERVICE_TYPE=worker` to Worker service variables.

### Email Fails: "Unauthorized"

**Problem**: API key invalid or missing.

**Solution**:
1. Regenerate API key in SendGrid dashboard
2. Update `SENDGRID_API_KEY` in Railway
3. Redeploy

### Email Fails: "From email not verified"

**Problem**: `DEFAULT_FROM_EMAIL` not verified in SendGrid.

**Solution**:
1. Go to SendGrid → Settings → Sender Authentication
2. Verify the email address
3. Update Railway variable if needed
4. Redeploy

## Related Documentation

- [SENDGRID-SETUP.md](SENDGRID-SETUP.md) - Complete SendGrid setup guide
- [RAILWAY-WORKER-SETUP.md](RAILWAY-WORKER-SETUP.md) - Worker service configuration
- [railway-email-queue-setup.md](railway-email-queue-setup.md) - Email queue setup
