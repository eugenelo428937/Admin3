# Admin3 Email System Documentation

## Overview

The Admin3 Email System is a comprehensive, production-ready email management solution with advanced features including queue processing, template management, dynamic content insertion, and cross-client compatibility. The system uses MJML for responsive design and provides robust error handling with automatic fallbacks.

## Core Architecture

### 1. Email Service (`utils/email_service.py`)
The main email service class that handles all email operations:

```python
from utils.email_service import email_service

# Send order confirmation
email_service.send_order_confirmation(
    user_email='customer@example.com',
    order_data={...},
    use_queue=True,
    priority='high'
)
```

**Key Features:**
- **MJML Template Support**: Responsive email design with includes
- **Master Template System**: Consistent branding across all emails
- **Queue Integration**: Asynchronous email processing
- **Outlook Compatibility**: Enhanced rendering for Microsoft Outlook
- **Development Override**: Redirect emails in development mode
- **Automatic Fallbacks**: HTML templates if MJML fails

### 2. Database Models (`utils/models.py`)

#### EmailTemplate
- Template configuration and settings
- Subject templates with Django variables
- Queue and retry policies
- Master template integration

#### EmailQueue
- Asynchronous email processing
- Priority handling (urgent, high, normal, low)
- Retry logic with exponential backoff
- Scheduling and expiration

#### EmailLog
- Comprehensive email tracking
- Delivery status monitoring
- Performance metrics
- Error debugging

#### EmailContentPlaceholder & EmailContentRule
- Dynamic content insertion system
- Conditional content based on order data
- Rule-based content management

### 3. Queue Processing (`utils/services/queue_service.py`)
Handles batch processing of queued emails:

```bash
# Process email queue
python manage.py process_email_queue --limit 50
python manage.py process_email_queue --continuous --interval 30
```

## Email Types Supported

### 1. Order Confirmation
**Template**: `order_confirmation_content.mjml`
**Trigger**: After successful checkout
**Features**: 
- Customer details and order information
- Itemized product listing with pricing
- Dynamic content based on order type
- Payment method specific messaging

### 2. Password Reset
**Template**: `password_reset_content.mjml`
**Trigger**: User requests password reset
**Features**:
- Secure reset link with expiration
- Security warnings and instructions
- Professional ActEd branding

### 3. Account Activation
**Template**: `account_activation_content.mjml`
**Trigger**: New user registration
**Features**:
- Welcome message and activation link
- Feature overview and next steps
- Company branding and contact info

## Template System

### Master Template Approach
All emails use a consistent master template with dynamic content injection:

```
utils/templates/emails/mjml/
├── master_template.mjml              # Base template with banner/footer
├── styles.mjml                       # Shared CSS styles
├── banner.mjml                       # Header component
├── footer.mjml                       # Footer component
├── order_confirmation_content.mjml   # Order-specific content
├── password_reset_content.mjml       # Password reset content
└── account_activation_content.mjml   # Activation content
```

### Dynamic Content System
Advanced content insertion based on order context:

**Placeholders Available:**
- `{{DIGITAL_CONTENT}}` - Digital access instructions
- `{{BANK_PAYMENT}}` - Credit card payment confirmation
- `{{INVOICE_PAYMENT}}` - Invoice payment notification
- `{{EMPLOYER_REVIEW}}` - Employer sponsorship messaging
- `{{TUTORIAL_CONTENT}}` - Tutorial-specific information

**Content Rules:**
- **Digital Content**: Shows when `is_digital = true`
- **Bank Payment**: Shows when `is_invoice = false`
- **Invoice Payment**: Shows when `is_invoice = true`
- **Employer Review**: Shows when `employer_code` exists
- **Tutorial Content**: Shows when `is_tutorial = true`

## Key Management Commands

### Email Queue Processing
```bash
# Basic processing
python manage.py process_email_queue

# Continuous processing
python manage.py process_email_queue --continuous --interval 30

# Process specific priority
python manage.py process_email_queue --priority urgent

# Dry run (show what would be processed)
python manage.py process_email_queue --dry-run
```

### Email Testing
```bash
# Send test emails
python manage.py test_emails send --template order_confirmation --email test@example.com

# Preview templates
python manage.py test_emails preview --template order_confirmation --format html --save

# Validate compatibility
python manage.py test_emails validate --template order_confirmation

# Generate test report
python manage.py test_emails report

# Test Outlook compatibility
python manage.py test_emails outlook-test --template order_confirmation
```

### Template Setup
```bash
# Setup default templates
python manage.py setup_email_templates

# Setup content rules and placeholders
python manage.py setup_content_rules

# Test content insertion
python manage.py test_content_insertion --scenario digital_order
```

### Digital Content Testing
```bash
# Test specific variation
python manage.py test_digital_content --variation-id 2

# Test all variations
python manage.py test_digital_content

# Test cart item logic
python manage.py test_digital_content --cart-item-id 123
```

## Configuration & Settings

### Django Settings
```python
# Email backend
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.example.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True

# Default addresses
DEFAULT_FROM_EMAIL = 'noreply@admin3.com'
FRONTEND_URL = 'http://localhost:3000'

# Development email override
DEV_EMAIL_OVERRIDE = True
DEV_EMAIL_RECIPIENTS = ['developer@acted.com']
```

### Environment Variables
```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASSWORD=password
DEFAULT_FROM_EMAIL=noreply@admin3.com
```

## Cross-Client Compatibility

The email system ensures compatibility across:
- ✅ Outlook (2016, 2019, 365, Web)
- ✅ Gmail (Web, Mobile App)
- ✅ Apple Mail (macOS, iOS)
- ✅ Yahoo Mail & Thunderbird
- ✅ Mobile responsive design

### Outlook Enhancement Features
- **Premailer Integration**: CSS inlining and Outlook-specific fixes
- **MSO Conditional Comments**: Outlook-specific styling
- **Table Optimization**: Proper cellpadding/cellspacing
- **DOCTYPE Declarations**: Enhanced compatibility
- **Border Fixes**: Image borders for Outlook

## Development Features

### Email Override System
Prevents accidental emails to real users during development:

```python
# Development settings
DEV_EMAIL_OVERRIDE = True
DEV_EMAIL_RECIPIENTS = ['developer@acted.com']
```

**Features:**
- Redirects all emails to developer addresses
- Shows original recipient in email banner
- Comprehensive logging of redirections
- Production-safe (auto-disabled when DEBUG=False)

### Testing & Preview Tools
```bash
# Generate email previews
python manage.py test_emails preview --template order_confirmation --save

# Test multiple formats
python manage.py test_emails preview --template order_confirmation --format outlook

# Send test emails
python manage.py test_emails send --template order_confirmation --email test@example.com
```

## API Integration

### Checkout Integration
The email system integrates seamlessly with the cart checkout process:

```python
# In cart/views.py checkout method
success = email_service.send_order_confirmation(
    user_email=user.email,
    order_data={
        'order_number': f"ORD-{order.id:06d}",
        'customer_name': user.get_full_name(),
        'items': [...],
        'is_digital': has_digital_items,
        'is_invoice': is_invoice,
        'payment_method': payment_method,
        # ... other order data
    },
    use_queue=True,
    priority='high',
    user=user
)
```

### Digital Content Logic
Enhanced logic to determine `is_digital` based on specific product variations:

```python
# Check variation type instead of product groups
if item.metadata and item.metadata.get('variationId'):
    ppv = ProductProductVariation.objects.get(id=item.metadata.get('variationId'))
    variation_type = ppv.product_variation.variation_type.lower()
    is_digital = variation_type in ['ebook', 'hub']
```

## Performance & Monitoring

### Queue Statistics
```python
from utils.services.queue_service import email_queue_service
stats = email_queue_service.get_queue_stats()
```

### Email Analytics
- Delivery tracking and status monitoring
- Open/click rate analytics (when configured)
- Processing time metrics
- Error rate monitoring

### Database Optimization
- Proper indexing on status, priority, timestamps
- Regular cleanup of old logs
- Efficient batch processing

## Error Handling & Recovery

### Graceful Degradation
- Order completion never fails due to email issues
- MJML compilation errors fall back to HTML templates
- Comprehensive error logging and debugging
- Automatic retry mechanisms for failed emails

### Common Issues & Solutions
1. **MJML Compilation Errors**: Automatic fallback to HTML templates
2. **SMTP Issues**: Queue-based retry with exponential backoff
3. **Template Errors**: Detailed error messages and logging
4. **Queue Processing**: Manual processing available if automatic fails

## Security Considerations

### Email Content Security
- Input sanitization for template variables
- Secure handling of sensitive data
- Rate limiting to prevent email bombing

### Development Safety
- Email override system prevents accidental sends
- Comprehensive logging for audit trails
- Secure credential storage

## File Structure

```
utils/
├── email_service.py                    # Main email service
├── email_testing.py                    # Testing utilities
├── models.py                          # Database models
├── admin.py                           # Admin interface
├── services/
│   ├── queue_service.py               # Queue processing
│   └── content_insertion_service.py   # Dynamic content
├── management/commands/
│   ├── process_email_queue.py         # Queue processor
│   ├── test_emails.py                 # Email testing
│   ├── setup_email_templates.py       # Template setup
│   ├── setup_content_rules.py         # Content rule setup
│   └── test_digital_content.py        # Digital logic testing
├── templates/emails/mjml/
│   ├── master_template.mjml           # Master template
│   ├── styles.mjml                    # CSS styles
│   ├── banner.mjml                    # Header component
│   ├── footer.mjml                    # Footer component
│   ├── order_confirmation_content.mjml
│   ├── password_reset_content.mjml
│   └── account_activation_content.mjml
└── migrations/                        # Database migrations
```

## Best Practices

### Template Development
1. Use master template for consistency
2. Test across multiple email clients
3. Include proper alt text for images
4. Keep CSS in shared styles.mjml
5. Use semantic class names

### Queue Management
1. Process urgent emails immediately
2. Use appropriate batch sizes (25-100 emails)
3. Monitor queue health regularly
4. Implement proper error handling

### Content Rules
1. Keep rules simple and testable
2. Use descriptive names for placeholders
3. Test all conditional logic thoroughly
4. Document rule dependencies

### Performance
1. Cache compiled templates when possible
2. Clean up old email logs regularly
3. Monitor processing times
4. Use proper database indexing

## Future Enhancements

- **Email Tracking**: Advanced open/click tracking
- **Personalization**: AI-driven content recommendations
- **Multilingual Support**: Template translation system
- **PDF Attachments**: Automated invoice generation
- **SMS Integration**: Multi-channel notifications
- **Campaign Management**: Bulk email campaigns
- **A/B Testing**: Template performance testing

## Contact & Support

For questions about the email system:
- Review this documentation
- Check the README files in utils/ directory
- Use management commands for testing and debugging
- Contact the development team for advanced configurations

---

**Last Updated**: June 2025  
**Version**: 1.0  
**Maintainer**: Admin3 Development Team 