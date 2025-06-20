# Development Email Override System

The Admin3 email system includes a **development email override** feature that prevents emails from being sent to real users during development and testing. This is a critical safety feature that redirects all emails to designated developer addresses while clearly indicating the original intended recipient.

## Overview

When enabled, this system:
1. **Redirects all emails** from original recipients to a list of developer email addresses
2. **Shows original recipient** in a prominent banner at the top of each email
3. **Logs redirect information** for debugging purposes
4. **Works across all email types** (order confirmation, password reset, account activation, etc.)

## Configuration

### Development Settings

In `django_Admin3/settings/development.py`:

```python
# Development Email Override Settings
# Redirect all emails to these addresses in development environment
DEV_EMAIL_OVERRIDE = True
DEV_EMAIL_RECIPIENTS = [
    'developer@acted.com',
    'test@acted.com',
]
```

### Environment Detection

The override only activates when:
- `DEV_EMAIL_OVERRIDE = True`
- `DEV_EMAIL_RECIPIENTS` contains at least one email address
- `settings.DEBUG = True` (development mode)

## How It Works

### 1. Email Redirection

All email sending methods automatically check for development override:

```python
def _handle_dev_email_override(self, to_emails: List[str], context: Dict) -> List[str]:
    """Handle development environment email override."""
    dev_override = getattr(settings, 'DEV_EMAIL_OVERRIDE', False)
    dev_recipients = getattr(settings, 'DEV_EMAIL_RECIPIENTS', [])
    
    if dev_override and dev_recipients and settings.DEBUG:
        # Store original recipients for display in email
        original_recipients = to_emails.copy()
        context['dev_original_recipients'] = original_recipients
        context['dev_mode_active'] = True
        
        logger.info(f"Development mode: Redirecting email from {original_recipients} to {dev_recipients}")
        return dev_recipients
    
    return to_emails
```

### 2. Visual Indicator in Emails

When in development mode, emails display a prominent red banner at the top:

```mjml
{% if dev_mode_active %}
<!-- Development Mode Warning -->
<mj-section full-width="full-width" background-color="#ff6b6b" padding="10px 20px">
  <mj-column width="100%">
    <mj-text 
      align="center" 
      color="#ffffff" 
      font-size="12px" 
      font-weight="bold" 
      padding="5px 0"
    >
      🚧 DEVELOPMENT MODE 🚧<br/>
      Original recipient: {{ dev_original_recipients|join:", " }}
    </mj-text>
  </mj-column>
</mj-section>
{% endif %}
```

### 3. Logging

All email redirections are logged for debugging:

```
INFO Development mode: Redirecting email from ['student@example.com'] to ['developer@acted.com', 'test@acted.com']
```

## Testing Examples

### Test Email Sending

```bash
# Test order confirmation - redirects to dev emails
python manage.py test_emails send --template order_confirmation --email student@example.com

# Test password reset - redirects to dev emails  
python manage.py test_emails send --template password_reset --email user@university.edu

# Test account activation - redirects to dev emails
python manage.py test_emails send --template account_activation --email new.user@company.com
```

### Expected Log Output

```
Loading environment from: C:\Code\Admin3\backend\django_Admin3\.env.development
Sending test email: order_confirmation to student@example.com
INFO Development mode: Redirecting email from ['student@example.com'] to ['developer@acted.com', 'test@acted.com']
INFO Email queued successfully: 8c6112db-aee5-4015-a8dd-3ef44616ed15
Test email sent successfully to student@example.com
```

## Email Types Supported

The override works for all email types:

- ✅ **Order Confirmation** (`send_order_confirmation`)
- ✅ **Password Reset** (`send_password_reset`) 
- ✅ **Account Activation** (`send_account_activation`)
- ✅ **Master Template** (`send_master_template_email`)
- ✅ **Sample Email** (`send_sample_email`)
- ✅ **Any custom email** using `send_templated_email`

## Production Safety

In production environments:
- Override is automatically disabled when `DEBUG = False`
- Emails are sent to original recipients
- No development banners are shown
- No redirect logging occurs

## Key Benefits

1. **Safety**: Prevents accidental emails to real users during development
2. **Transparency**: Clear visual indication of original intended recipient
3. **Debugging**: Comprehensive logging of all email redirections
4. **Flexibility**: Easy to configure different developer email lists
5. **Automatic**: Works across all email types without code changes
6. **Production Safe**: Automatically disabled in production

## Configuration Management

### Development Team Setup

Each developer can use their own email addresses:

```python
# Local development
DEV_EMAIL_RECIPIENTS = ['john.developer@acted.com']

# Team testing environment  
DEV_EMAIL_RECIPIENTS = [
    'qa.team@acted.com',
    'project.manager@acted.com', 
    'lead.developer@acted.com'
]
```

### Disabling Override

To temporarily disable override in development:

```python
# Disable override but keep DEBUG = True
DEV_EMAIL_OVERRIDE = False
```

This system ensures that during development and testing, no real users will receive test emails, while developers can still verify email functionality and see exactly which users the emails were originally intended for. 