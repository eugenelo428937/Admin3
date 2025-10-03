# Admin3 Email System - Complete Guide

**Status:** Production Ready ✅
**Last Updated:** January 2025
**Version:** 2.0

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Configuration](#configuration)
4. [Email Types](#email-types)
5. [Queue System](#queue-system)
6. [Template System](#template-system)
7. [Dynamic Content](#dynamic-content)
8. [Testing & Debugging](#testing--debugging)
9. [Common Commands](#common-commands)
10. [Troubleshooting](#troubleshooting)

---

## System Overview

The Admin3 Email System is a comprehensive, production-ready email management solution featuring:

- ✅ **MJML-based responsive design** with master template system
- ✅ **Queue-based processing** with priority levels and retry logic
- ✅ **Dynamic content insertion** based on business rules
- ✅ **Cross-client compatibility** (Outlook, Gmail, Apple Mail, etc.)
- ✅ **Development safety** with email override system
- ✅ **Comprehensive logging** and audit trail

### Key Features

| Feature | Description |
|---------|-------------|
| **Master Templates** | Modular MJML includes (banner, footer, styles) for consistency |
| **Queue System** | Asynchronous processing with 4 priority levels (urgent → low) |
| **Dynamic Content** | Rule-based content placeholders (DIGITAL_CONTENT, BANK_PAYMENT, etc.) |
| **Email Override** | Development mode redirects to prevent accidental sends |
| **Retry Logic** | Exponential backoff for failed emails |
| **Tracking** | Comprehensive logging with delivery status and analytics |

---

## Architecture

### Core Components

```
Admin3 Email System
├── Email Service (email_service.py)
│   ├── Template rendering with MJML
│   ├── Master template integration
│   └── Development override handling
├── Queue Service (services/queue_service.py)
│   ├── Batch processing
│   ├── Priority handling
│   └── Retry management
├── Content Insertion Service (services/content_insertion_service.py)
│   ├── Dynamic placeholder replacement
│   └── Rule-based content selection
└── Database Models (models.py)
    ├── EmailTemplate
    ├── EmailQueue
    ├── EmailLog
    └── EmailContentPlaceholder
```

### Email Flow

```
1. Email Request
   ↓
2. Check Queue Setting → Queue or Send Immediately
   ↓
3. Template Rendering
   ├── Load content template
   ├── Apply master template
   └── Process dynamic placeholders
   ↓
4. MJML to HTML Conversion
   ↓
5. Outlook Compatibility Enhancement (optional)
   ↓
6. Development Override Check
   ↓
7. SMTP Send
   ↓
8. Log Results
```

---

## Configuration

### Environment Variables

In `.env.development`:

```bash
# Email SMTP Configuration
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password  # Gmail: Use App Password
DEFAULT_FROM_EMAIL=noreply@acted.com

# Development Email Override
DEV_EMAIL_OVERRIDE=True
DEV_EMAIL_RECIPIENTS=developer@acted.com,test@acted.com
```

### Django Settings

In `settings/base.py`:

```python
# Email Backend Configuration
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'noreply@acted.com')

# IMPORTANT: Console backend override (DISABLE for real email sending)
# if DEBUG:
#     EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
```

**⚠️ CRITICAL:** Comment out the console backend override to enable real email sending in development.

### Gmail App Password Setup

1. Enable 2-Factor Authentication on your Google account
2. Go to: Google Account → Security → 2-Step Verification → App passwords
3. Generate a new app password for "Mail"
4. Use this password in `EMAIL_HOST_PASSWORD` (not your regular password)

---

## Email Types

### 1. Order Confirmation
**Template:** `order_confirmation_content.mjml`
**Trigger:** After successful checkout
**Priority:** High

**Context Data:**
```python
{
    'order_number': 'ORD-000123',
    'customer_name': 'John Doe',
    'total_amount': 299.99,
    'items': [...],
    'is_digital': True/False,
    'is_invoice': True/False,
    'payment_method': 'card',
}
```

### 2. Password Reset
**Template:** `password_reset_content.mjml`
**Trigger:** User requests password reset
**Priority:** Urgent

**Context Data:**
```python
{
    'user': user_object,
    'reset_url': 'https://yoursite.com/reset?token=...',
    'expiry_hours': 24
}
```

### 3. Account Activation
**Template:** `account_activation_content.mjml`
**Trigger:** New user registration
**Priority:** High

**Context Data:**
```python
{
    'user': user_object,
    'activation_url': 'https://yoursite.com/activate/...',
}
```

### 4. Email Verification
**Template:** `email_verification_content.mjml`
**Trigger:** User changes email address
**Priority:** High

---

## Queue System

### Priority Levels

| Priority | Use Case | Processing Order |
|----------|----------|------------------|
| **urgent** | Password resets, security alerts | 1st (highest) |
| **high** | Order confirmations, account activation | 2nd |
| **normal** | General notifications | 3rd |
| **low** | Marketing, newsletters | 4th (lowest) |

### Queue Processing

**Manual Processing:**
```bash
# Process single batch (default: 50 emails)
python manage.py process_email_queue

# Process specific number
python manage.py process_email_queue --limit 100

# Continuous processing (for production)
python manage.py process_email_queue --continuous --interval 30

# Process specific priority
python manage.py process_email_queue --priority urgent

# Dry run (show what would be processed)
python manage.py process_email_queue --dry-run
```

### Retry Logic

- **Default:** 3 retry attempts
- **Delay:** 5 minutes between retries (exponential backoff)
- **Status Tracking:** pending → processing → sent/failed
- **Expiration:** Configurable per-email timeout

---

## Template System

### Master Template Structure

```
utils/templates/emails/mjml/
├── master_template.mjml              # Base container
├── styles.mjml                       # Shared CSS styles
├── banner.mjml                       # Header component
├── footer.mjml                       # Footer component
├── order_confirmation_content.mjml   # Order-specific content
├── password_reset_content.mjml       # Password reset content
├── account_activation_content.mjml   # Activation content
└── email_verification_content.mjml   # Email verification content
```

### Master Template Usage

All core emails use the master template approach:

```mjml
<!-- master_template.mjml -->
<mjml>
  <mj-head>
    <mj-include path="./styles.mjml" />
  </mj-head>
  <mj-body>
    <mj-include path="./banner.mjml" />

    <!-- Content injected here -->
    {{{ email_content }}}

    <mj-include path="./footer.mjml" />
  </mj-body>
</mjml>
```

### Creating New Email Templates

1. **Create content template** in `utils/templates/emails/mjml/`:
   ```mjml
   <!-- new_email_content.mjml -->
   <mj-section>
     <mj-column>
       <mj-text>{{ custom_variable }}</mj-text>
     </mj-column>
   </mj-section>
   ```

2. **Add database configuration**:
   ```bash
   python manage.py setup_email_templates
   ```

3. **Add service method** in `email_service.py`:
   ```python
   def send_new_email(self, user_email: str, data: Dict) -> bool:
       return self.send_templated_email(
           template_name='new_email',
           context=data,
           to_emails=[user_email],
           subject="Subject Here",
           use_mjml=True
       )
   ```

---

## Dynamic Content

### Placeholder System

Dynamic content is inserted based on order context:

| Placeholder | Condition | Content |
|-------------|-----------|---------|
| `{{DIGITAL_CONTENT}}` | `is_digital = true` | Digital access instructions |
| `{{BANK_PAYMENT}}` | `is_invoice = false` | Card payment confirmation |
| `{{INVOICE_PAYMENT}}` | `is_invoice = true` | Invoice payment details |
| `{{EMPLOYER_REVIEW}}` | `employer_code` exists | Employer sponsorship info |
| `{{TUTORIAL_CONTENT}}` | `is_tutorial = true` | Tutorial event details |

### Content Rules

Rules are defined in `EmailContentRule` model and evaluated by `ContentInsertionService`:

```python
# Example: Digital content rule
{
    "name": "Digital Content",
    "placeholder": "DIGITAL_CONTENT",
    "condition": {
        "type": "jsonlogic",
        "expr": {"==": [{"var": "is_digital"}, true]}
    },
    "content_template": "digital_access_instructions.mjml"
}
```

---

## Testing & Debugging

### Development Email Override

**Purpose:** Prevents emails from being sent to real users during development.

**Configuration** (`settings/development.py`):
```python
DEV_EMAIL_OVERRIDE = True
DEV_EMAIL_RECIPIENTS = [
    'developer@acted.com',
    'test@acted.com',
]
```

**How It Works:**
1. All emails are redirected to `DEV_EMAIL_RECIPIENTS`
2. Original recipient is shown in a red banner at the top of the email
3. Redirection is logged for debugging
4. Automatically disabled when `DEBUG=False`

**Example Log:**
```
INFO Development mode: Redirecting email from ['student@example.com']
     to ['developer@acted.com']
```

### Test Commands

```bash
# Send test email
python manage.py test_emails send \
  --template order_confirmation \
  --email test@example.com

# Preview email HTML
python manage.py test_emails preview \
  --template order_confirmation \
  --save

# Test Outlook compatibility
python manage.py test_emails outlook-test \
  --template order_confirmation

# Validate template
python manage.py test_emails validate \
  --template order_confirmation

# Generate test report
python manage.py test_emails report
```

### Testing Digital Content Logic

```bash
# Test specific product variation
python manage.py test_digital_content --variation-id 2

# Test all variations
python manage.py test_digital_content

# Test cart item logic
python manage.py test_digital_content --cart-item-id 123
```

---

## Common Commands

### Setup Commands

```bash
# Setup email templates
python manage.py setup_email_templates

# Setup content rules and placeholders
python manage.py setup_content_rules

# Setup default styling themes
python manage.py setup_default_styles
```

### Queue Management

```bash
# Process email queue
python manage.py process_email_queue

# Run continuously (production)
python manage.py process_email_queue --continuous --interval 30

# Check queue status
python manage.py process_email_queue --dry-run
```

### Testing Commands

```bash
# Send test email
python manage.py test_emails send --template <template_name> --email <email>

# Preview email
python manage.py test_emails preview --template <template_name> --save

# Validate email template
python manage.py test_emails validate --template <template_name>

# Test content insertion
python manage.py test_content_insertion --scenario digital_order
```

---

## Troubleshooting

### Emails Not Sending

**Problem:** Emails show as "sent" in logs but not received.

**Diagnosis:**
1. Check if console backend is active:
   ```bash
   # In settings/base.py, ensure this is COMMENTED OUT:
   # if DEBUG:
   #     EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
   ```

2. Check email override settings:
   ```bash
   # In settings/development.py
   DEV_EMAIL_OVERRIDE = True  # Emails go to DEV_EMAIL_RECIPIENTS
   DEV_EMAIL_RECIPIENTS = ['developer@acted.com']  # Check this list
   ```

3. Verify SMTP credentials:
   ```bash
   # In .env.development
   EMAIL_HOST_USER=your-email@gmail.com
   EMAIL_HOST_PASSWORD=your-app-password  # Must be App Password for Gmail
   ```

4. Check spam folder for redirected emails

**Solution:**
```bash
# Option 1: Disable console backend (enable real SMTP)
# Comment out in settings/base.py lines 324-326

# Option 2: Disable email override (send to actual recipients)
# In settings/development.py:
DEV_EMAIL_OVERRIDE = False

# Option 3: Add your email to DEV_EMAIL_RECIPIENTS
DEV_EMAIL_RECIPIENTS = ['your-email@gmail.com']
```

### Gmail Authentication Errors

**Problem:** "535-5.7.8 Username and Password not accepted"

**Solution:**
1. Ensure 2-Factor Authentication is enabled on Google account
2. Generate App Password (not regular password)
3. Use App Password in `EMAIL_HOST_PASSWORD`
4. Verify email format: `your-email@gmail.com` (not just username)

### MJML Compilation Errors

**Problem:** Template rendering fails with MJML errors.

**Diagnosis:**
```bash
python manage.py test_emails validate --template <template_name>
```

**Common Issues:**
- Missing include files (banner.mjml, footer.mjml, styles.mjml)
- Invalid MJML syntax
- Incorrect file paths in `<mj-include>`

**Solution:**
1. Validate MJML syntax
2. Check include file paths
3. Ensure all includes exist
4. Review error logs for specific line numbers

### Queue Processing Issues

**Problem:** Emails stuck in queue with "pending" status.

**Diagnosis:**
```bash
# Check queue status
python manage.py process_email_queue --dry-run

# View failed emails
python manage.py shell
>>> from utils.models import EmailQueue
>>> EmailQueue.objects.filter(status='failed')
```

**Solution:**
1. Check for SMTP errors in `error_message` field
2. Verify `scheduled_at` and `process_after` times
3. Check `max_attempts` hasn't been exceeded
4. Manually retry failed emails:
   ```python
   failed_email = EmailQueue.objects.get(queue_id='...')
   failed_email.attempts = 0
   failed_email.status = 'pending'
   failed_email.save()
   ```

### Performance Issues

**Problem:** Email queue processing is slow.

**Solutions:**
1. Increase batch size: `--limit 100`
2. Reduce processing interval: `--interval 15`
3. Run multiple queue processors in parallel
4. Enable MJML template caching
5. Clean up old email logs:
   ```sql
   DELETE FROM utils_email_log WHERE queued_at < NOW() - INTERVAL '90 days';
   ```

---

## Production Deployment Checklist

### Before Going Live

- [ ] Disable console backend in `settings/base.py`
- [ ] Disable or configure email override (`DEV_EMAIL_OVERRIDE = False`)
- [ ] Verify SMTP credentials in production environment
- [ ] Test email sending from production environment
- [ ] Setup continuous queue processing: `process_email_queue --continuous`
- [ ] Configure email log cleanup cron job
- [ ] Test all email templates in production
- [ ] Verify Outlook compatibility
- [ ] Check spam folder placement
- [ ] Monitor email delivery rates
- [ ] Setup email failure alerts

### Production Settings

```python
# settings/production.py
DEBUG = False
DEV_EMAIL_OVERRIDE = False  # CRITICAL: Disable override in production

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.your-provider.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD')
```

### Monitoring

1. **Queue Health:**
   ```python
   from utils.services.queue_service import email_queue_service
   stats = email_queue_service.get_queue_stats()
   ```

2. **Email Analytics:**
   ```python
   from utils.models import EmailLog
   recent_logs = EmailLog.objects.filter(
       queued_at__gte=timezone.now() - timedelta(days=7)
   )
   ```

3. **Failure Alerts:**
   - Monitor `EmailQueue` for high failure rates
   - Alert on `EmailLog` error patterns
   - Track delivery times

---

## File Locations

```
backend/django_Admin3/
├── utils/
│   ├── email_service.py           # Main email service
│   ├── email_testing.py           # Testing utilities
│   ├── models.py                  # Database models
│   ├── admin.py                   # Admin interface
│   ├── services/
│   │   ├── queue_service.py       # Queue processing
│   │   └── content_insertion_service.py  # Dynamic content
│   ├── management/commands/
│   │   ├── process_email_queue.py  # Queue processor
│   │   ├── test_emails.py         # Email testing
│   │   └── setup_email_templates.py  # Template setup
│   └── templates/emails/mjml/
│       ├── master_template.mjml
│       ├── styles.mjml
│       ├── banner.mjml
│       ├── footer.mjml
│       ├── order_confirmation_content.mjml
│       ├── password_reset_content.mjml
│       ├── account_activation_content.mjml
│       └── email_verification_content.mjml
└── django_Admin3/settings/
    ├── base.py              # Base email configuration
    ├── development.py       # Dev override settings
    └── production.py        # Production email settings
```

---

## Support & Resources

### Documentation Files

- `Email_System_Guide.md` (this file) - Complete system guide
- `README_EMAIL.md` - Quick start guide
- `README_DEV_EMAIL_OVERRIDE.md` - Development override system
- `README_MASTER_TEMPLATE_SYSTEM.md` - Template architecture
- `README_EMAIL_MANAGEMENT_SYSTEM.md` - Queue and logging details
- `README_OUTLOOK_COMPATIBILITY.md` - Cross-client compatibility

### Getting Help

1. Review this documentation
2. Check management command help: `python manage.py <command> --help`
3. Review email logs in Django admin
4. Check `django_debug.log` for detailed errors
5. Test with: `python manage.py test_emails validate --template <name>`

---

**End of Email System Guide**
