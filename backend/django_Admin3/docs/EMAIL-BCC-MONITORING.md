# Email BCC Monitoring Feature

## Overview

The BCC (Blind Carbon Copy) monitoring feature allows you to receive copies of ALL emails sent by the system while emails are delivered normally to their intended recipients. This is perfect for UAT testing where you want to verify what customers receive without redirecting emails away from real users.

## How It Works

```
User Orders → System Sends Email
                ↓
         ┌──────┴──────┐
         ↓             ↓
   customer@          your-monitoring@
   example.com        example.com
   (visible)          (BCC - invisible)
```

- **Primary recipient**: Gets email normally
- **BCC recipients**: Get invisible copy
- **Primary recipient cannot see**: BCC addresses

## Configuration

### Environment Variables

```bash
# Enable BCC monitoring
EMAIL_BCC_MONITORING=True

# Comma-separated list of monitoring email addresses
EMAIL_BCC_RECIPIENTS=monitor1@example.com,monitor2@example.com
```

### Settings (UAT)

The UAT settings automatically load these from environment variables:

```python
# django_Admin3/settings/uat.py
EMAIL_BCC_MONITORING = env.bool('EMAIL_BCC_MONITORING', default=False)
EMAIL_BCC_RECIPIENTS = env.list('EMAIL_BCC_RECIPIENTS', default=[])
```

## Usage Scenarios

### Scenario 1: UAT Testing with Real Users (Recommended)

**Goal**: Test real user flow while monitoring emails sent

**Configuration**:
```bash
EMAIL_BCC_MONITORING=True
EMAIL_BCC_RECIPIENTS=qa-team@company.com,product-owner@company.com
DEV_EMAIL_OVERRIDE=False
```

**Result**:
- User `customer@example.com` receives order confirmation
- QA team receives BCC copy of same email
- Customer doesn't know QA team got copy
- Real user experience is tested

### Scenario 2: Early Testing (No Real Users)

**Goal**: Test emails without sending to real users

**Configuration**:
```bash
EMAIL_BCC_MONITORING=False
DEV_EMAIL_OVERRIDE=True
DEV_EMAIL_RECIPIENTS=qa-team@company.com
```

**Result**:
- User `customer@example.com` does NOT receive email
- QA team receives redirected email
- Good for initial testing phase

### Scenario 3: Production

**Goal**: Normal operation, no monitoring

**Configuration**:
```bash
EMAIL_BCC_MONITORING=False
DEV_EMAIL_OVERRIDE=False
```

**Result**:
- User `customer@example.com` receives email
- No monitoring copies sent
- Standard production operation

## Email Service Integration

The BCC feature is automatically applied in `utils/email_service.py`:

```python
def _get_bcc_recipients(self) -> List[str]:
    """Get BCC monitoring recipients if enabled."""
    bcc_monitoring = getattr(settings, 'EMAIL_BCC_MONITORING', False)
    bcc_recipients = getattr(settings, 'EMAIL_BCC_RECIPIENTS', [])

    if bcc_monitoring and bcc_recipients:
        logger.info(f"Email BCC monitoring enabled. BCC recipients: {bcc_recipients}")
        return bcc_recipients

    return []
```

Applied to all outgoing emails:

```python
email = EmailMultiAlternatives(
    subject=subject,
    body=text_content,
    from_email=from_email or self.from_email,
    to=actual_recipients,
    bcc=bcc_recipients if bcc_recipients else None  # BCC automatically added
)
```

## Verification

### Check Configuration

```bash
# Railway
railway run python manage.py shell

# Local
python manage.py shell --settings=django_Admin3.settings.uat
```

```python
from django.conf import settings

print(f"BCC Monitoring: {settings.EMAIL_BCC_MONITORING}")
print(f"BCC Recipients: {settings.EMAIL_BCC_RECIPIENTS}")
print(f"Email Override: {settings.DEV_EMAIL_OVERRIDE}")
```

### Test BCC Functionality

```python
from utils.email_service import EmailService

email_service = EmailService()
email_service.send_templated_email(
    template_name='order_confirmation',
    context={'order_number': 'TEST-001', 'user_name': 'Test User'},
    to_emails=['customer@example.com'],
    subject='Test BCC Monitoring',
    use_queue=False
)
```

**Expected Result**:
1. Email sent to `customer@example.com`
2. BCC copy sent to addresses in `EMAIL_BCC_RECIPIENTS`
3. Logs show: `Email BCC monitoring enabled. BCC recipients: ['monitor@example.com']`

## Comparison: BCC vs Override

| Feature | BCC Monitoring | Email Override |
|---------|----------------|----------------|
| **Real users get email?** | ✅ Yes | ❌ No (redirected) |
| **You get copy?** | ✅ Yes (BCC) | ✅ Yes (redirected) |
| **User knows you got copy?** | ❌ No (invisible) | N/A (user never gets email) |
| **Tests real user flow?** | ✅ Yes | ❌ No |
| **Best for** | UAT with real users | Early testing only |

## Best Practices

### ✅ Do

- **Enable BCC monitoring for UAT** - test real user experience
- **Use multiple BCC recipients** - QA team, product owner, developers
- **Monitor BCC inbox regularly** - catch email issues early
- **Disable in production** - no monitoring needed after go-live
- **Combine with logging** - track email send events

### ❌ Don't

- **Don't enable both BCC and Override** - choose one based on testing phase
- **Don't use BCC in production** - adds unnecessary email volume
- **Don't reply to BCC emails** - you're not the intended recipient
- **Don't share BCC copies** - maintain user privacy
- **Don't forget to disable** - remove BCC before production

## Privacy Considerations

1. **User Privacy**: BCC recipients receive full email content including:
   - Personal information
   - Order details
   - Reset links/tokens

2. **Compliance**: Ensure monitoring complies with:
   - GDPR (if applicable)
   - Internal data handling policies
   - User consent (if required)

3. **Security**: BCC addresses should be:
   - Company email accounts only
   - Secured with 2FA
   - Limited to authorized personnel

## Troubleshooting

### BCC Not Working

**Symptom**: BCC recipients not receiving emails

**Check**:
```bash
railway run python manage.py shell

from django.conf import settings
print(f"BCC Enabled: {settings.EMAIL_BCC_MONITORING}")
print(f"BCC Recipients: {settings.EMAIL_BCC_RECIPIENTS}")
```

**Solutions**:
1. Verify `EMAIL_BCC_MONITORING=True`
2. Verify `EMAIL_BCC_RECIPIENTS` has valid emails
3. Check email service logs for BCC confirmation
4. Test SMTP connection
5. Check spam folder for BCC emails

### BCC Emails Going to Spam

**Solutions**:
1. Add `noreply@acted.com` to contacts
2. Mark BCC emails as "Not Spam"
3. Create email filter rule for BCC copies
4. Check SPF/DKIM configuration

### Too Many BCC Emails

**Solutions**:
1. Reduce number of BCC recipients
2. Use email filters to organize BCC emails
3. Create separate mailbox for BCC monitoring
4. Schedule periodic review instead of real-time monitoring

## Railway Deployment

Add these environment variables in Railway dashboard:

```bash
# For UAT with real users
EMAIL_BCC_MONITORING=True
EMAIL_BCC_RECIPIENTS=qa@company.com,po@company.com

# Keep override disabled
DEV_EMAIL_OVERRIDE=False
```

Verify in Railway logs:
```
railway logs --service worker | grep "BCC monitoring"
# Should see: Email BCC monitoring enabled. BCC recipients: ['qa@company.com', 'po@company.com']
```

## Summary

BCC monitoring is the **recommended approach for UAT testing** because:

1. ✅ Tests real user experience
2. ✅ Verifies email content/formatting
3. ✅ Non-intrusive monitoring
4. ✅ Easy to enable/disable
5. ✅ Multiple stakeholders can monitor
6. ✅ Doesn't break user flow

**Quick Setup** (Railway):
```bash
railway variables set EMAIL_BCC_MONITORING=True
railway variables set EMAIL_BCC_RECIPIENTS="your-email@example.com"
railway restart --service worker
```

---

**See Also**:
- `README-RAILWAY-EMAIL.md` - Email system overview
- `railway-email-queue-setup.md` - Detailed setup guide
- `railway-env-vars-reference.md` - Environment variables reference
