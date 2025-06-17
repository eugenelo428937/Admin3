# Email System Documentation

This directory contains the email functionality for the Admin3 project, providing cross-client compatible, responsive email templates.

## Structure

```
utils/
├── email_service.py          # Main email service with template rendering
├── email_testing.py          # Testing utilities for email compatibility
├── requirements_email.txt    # Dependencies for email functionality
├── management/
│   └── commands/
│       └── test_emails.py    # Django management command for testing
└── templates/
    └── utils/
        └── emails/
            ├── base_email.html           # Base responsive template
            ├── order_confirmation.html   # Order confirmation email
            ├── password_reset.html       # Password reset email
            ├── order_confirmation.txt    # Plain text fallback
            └── password_reset.txt        # Plain text fallback
```

## Usage

### Import the email service

```python
from utils.email_service import email_service

# Send order confirmation
order_data = {
    'customer_name': 'John Doe',
    'order_number': 'ORD-2024-001',
    'total_amount': 299.99,
    'items': [...],
}
email_service.send_order_confirmation('customer@email.com', order_data)

# Send password reset
reset_data = {
    'user': user,
    'reset_url': 'https://yoursite.com/reset?token=...',
    'expiry_hours': 24
}
email_service.send_password_reset('user@email.com', reset_data)
```

## Testing Email Templates

Use the Django management command to test your email templates:

```bash
# Preview templates
python manage.py test_emails preview --template order_confirmation --format html

# Send test emails
python manage.py test_emails send --template password_reset --email your@email.com

# Validate compatibility
python manage.py test_emails validate --template order_confirmation

# Generate comprehensive report
python manage.py test_emails report
```

## Cross-Client Compatibility

The email templates are designed to work consistently across:
- ✅ Outlook (2016, 2019, 365, Web)
- ✅ Gmail (Web, Mobile App)
- ✅ Apple Mail (macOS, iOS)
- ✅ Yahoo Mail
- ✅ Thunderbird
- ✅ Mobile Apps (responsive design)

## Features

- **CSS Inlining**: Automatic CSS inlining for better email client compatibility
- **Responsive Design**: Mobile-optimized templates
- **Dark Mode Support**: Adapts to user's dark mode preferences
- **Plain Text Fallbacks**: Automatic generation of text versions
- **Cross-Client Testing**: Built-in compatibility validation
- **Template Inheritance**: Reusable base template system

## Dependencies

Install the required packages:

```bash
pip install -r utils/requirements_email.txt
```

## Configuration

Add to your Django settings:

```python
# Email settings
DEFAULT_FROM_EMAIL = 'noreply@admin3.com'
BASE_URL = 'http://localhost:8888'
FRONTEND_URL = 'http://localhost:3000'

# Add utils to INSTALLED_APPS if not already present
INSTALLED_APPS = [
    # ... other apps
    'utils',
]
```

## Adding New Email Templates

1. Create HTML template in `utils/templates/utils/emails/`
2. Create text template with same name but `.txt` extension
3. Add method to `EmailService` class in `email_service.py`
4. Add test data to `EmailTester` class in `email_testing.py`
5. Update management command choices if needed

## Best Practices

- Always provide both HTML and text versions
- Test templates across different email clients
- Use table-based layouts for maximum compatibility
- Inline all CSS styles
- Keep email width under 600px
- Include alt text for images
- Test with images disabled 