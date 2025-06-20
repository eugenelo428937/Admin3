# Email Management System Documentation

## Overview

The Admin3 Email Management System provides a comprehensive solution for handling emails with queuing, logging, templates, and attachments. It includes MJML support, Outlook compatibility, and robust queue processing for high-volume email operations.

## Core Features

### 1. Email Templates
- **Template Configuration**: Define reusable email templates with settings
- **Master Template System**: Consistent branding across all emails
- **MJML Support**: Responsive email design with includes
- **Variable Subject Lines**: Dynamic subjects with Django template syntax
- **Priority Levels**: urgent, high, normal, low
- **Retry Configuration**: Customizable retry attempts and delays

### 2. Email Queue System
- **Asynchronous Processing**: Queue emails for batch processing
- **Priority Handling**: Process urgent emails first
- **Scheduling**: Send emails at specific times
- **Retry Logic**: Automatic retry for failed emails
- **Expiration**: Emails expire after specified time
- **Rate Limiting**: Control email sending rate

### 3. Email Logging
- **Comprehensive Tracking**: Log all email activities
- **Delivery Status**: Track sent, delivered, opened, clicked
- **Analytics**: Open rates, click rates, engagement metrics
- **Error Tracking**: Detailed error messages and responses
- **Content Hashing**: Prevent duplicate content
- **Performance Metrics**: Processing time tracking

### 4. Attachment Management
- **Static Files**: Regular file attachments
- **Dynamic Generation**: Generate attachments on-the-fly
- **Conditional Inclusion**: Include attachments based on rules
- **File Type Support**: Documents, images, PDFs, etc.
- **Size Tracking**: Monitor attachment sizes

### 5. Campaign Management
- **Bulk Emails**: Send to multiple recipients
- **Progress Tracking**: Monitor campaign progress
- **Analytics**: Campaign performance metrics
- **Rate Control**: Throttle sending speed
- **Segmentation**: Target specific recipient groups

## Database Schema

### EmailTemplate
- Template configuration and settings
- Subject templates with variables
- Queue and retry settings
- Outlook compatibility options

### EmailQueue
- Queued emails awaiting processing
- Scheduling and priority management
- Retry tracking and error handling
- Status management (pending, processing, sent, failed)

### EmailLog
- Comprehensive email activity logging
- Delivery tracking and analytics
- Content and attachment information
- Performance metrics

### EmailAttachment
- Attachment definitions and files
- Conditional inclusion rules
- File type and size information

### EmailSettings
- Global system configuration
- SMTP settings
- Template variables
- Performance tuning

### EmailCampaign
- Bulk email campaign management
- Progress and analytics tracking
- Rate limiting configuration

## Usage Examples

### 1. Send Single Email with Queue

```python
from utils.email_service import email_service

# Send immediately
result = email_service.send_order_confirmation(
    user_email='customer@example.com',
    order_data={
        'order_number': 'ORD-2024-001',
        'customer_name': 'John Doe',
        'total_amount': 299.99,
        'items': [...]
    },
    use_queue=False  # Send immediately
)

# Queue for later processing
result = email_service.send_order_confirmation(
    user_email='customer@example.com',
    order_data={...},
    use_queue=True,  # Queue for processing
    priority='high',
    scheduled_at=timezone.now() + timezone.timedelta(hours=1)
)
```

### 2. Process Email Queue

```bash
# Process single batch
python manage.py process_email_queue --limit 50

# Run continuously
python manage.py process_email_queue --continuous --interval 30

# Process specific priority
python manage.py process_email_queue --priority urgent

# Dry run (show what would be processed)
python manage.py process_email_queue --dry-run
```

### 3. Setup Email Templates

```bash
# Create default templates and settings
python manage.py setup_email_templates

# Overwrite existing templates
python manage.py setup_email_templates --overwrite

# Assign to specific user
python manage.py setup_email_templates --user admin
```

### 4. Queue Email Programmatically

```python
from utils.services.queue_service import email_queue_service

queue_item = email_queue_service.queue_email(
    template_name='order_confirmation',
    to_emails=['customer@example.com'],
    context={
        'order_number': 'ORD-2024-001',
        'customer_name': 'John Doe'
    },
    priority='high',
    scheduled_at=timezone.now() + timezone.timedelta(minutes=30),
    expires_at=timezone.now() + timezone.timedelta(days=7)
)
```

### 5. Template Configuration

```python
from utils.models import EmailTemplate

template = EmailTemplate.objects.create(
    name='custom_notification',
    template_type='notification',
    display_name='Custom Notification',
    subject_template='Notification: {{ notification.title }}',
    content_template_name='custom_notification_content',
    use_master_template=True,
    enable_queue=True,
    default_priority='normal',
    max_retry_attempts=3,
    retry_delay_minutes=5
)
```

## Admin Interface

### Email Templates
- Configure template settings
- Set subject templates
- Enable/disable queuing
- Set retry policies

### Email Queue
- Monitor queued emails
- Retry failed emails
- Cancel pending emails
- View processing status

### Email Logs
- View email delivery status
- Track opens and clicks
- Monitor performance
- Analyze errors

### Email Settings
- Configure SMTP settings
- Set global defaults
- Manage template variables
- Performance tuning

### Email Campaigns
- Create bulk email campaigns
- Monitor progress
- View analytics
- Control sending rate

## Management Commands

### process_email_queue
Process emails from the queue:
```bash
python manage.py process_email_queue [options]

Options:
  --limit N           Process up to N emails (default: 50)
  --continuous        Run continuously
  --interval N        Seconds between batches (default: 30)
  --priority LEVEL    Process only specified priority
  --template NAME     Process only specified template
  --dry-run          Show what would be processed
```

### setup_email_templates
Setup default templates and settings:
```bash
python manage.py setup_email_templates [options]

Options:
  --overwrite         Overwrite existing templates
  --user USERNAME     Assign to specific user
```

### test_emails
Test email functionality:
```bash
python manage.py test_emails [action] [options]

Actions:
  preview             Preview email templates
  send                Send test emails
  validate            Validate templates
  report              Generate test report
```

## Configuration

### Django Settings

```python
# Email backend configuration
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.example.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'user@example.com'
EMAIL_HOST_PASSWORD = 'password'

# Default email addresses
DEFAULT_FROM_EMAIL = 'noreply@admin3.com'

# Frontend URL for email links
FRONTEND_URL = 'http://localhost:3000'
```

### Environment Variables

```bash
# SMTP Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASSWORD=password

# Email settings
DEFAULT_FROM_EMAIL=noreply@admin3.com
SUPPORT_EMAIL=support@admin3.com
```

## Performance Considerations

### Queue Processing
- **Batch Size**: Process 25-100 emails per batch
- **Interval**: 30-60 seconds between batches
- **Concurrent Workers**: Run multiple queue processors
- **Memory Usage**: Monitor for large attachments

### Database Optimization
- **Indexes**: Proper indexing on status, priority, timestamps
- **Cleanup**: Regular cleanup of old logs
- **Partitioning**: Consider partitioning for large volumes

### MJML Compilation
- **Caching**: Cache compiled templates
- **Includes**: Optimize include file processing
- **Error Handling**: Graceful fallback to HTML templates

## Monitoring and Maintenance

### Queue Health
```python
from utils.services.queue_service import email_queue_service

# Get queue statistics
stats = email_queue_service.get_queue_stats()
print(f"Pending emails: {stats['pending']}")
print(f"Failed emails: {stats['failed']}")
```

### Log Analysis
```python
from utils.models import EmailLog

# Recent delivery rates
recent_logs = EmailLog.objects.filter(
    queued_at__gte=timezone.now() - timezone.timedelta(days=7)
)

# Calculate open rate
opened_count = recent_logs.filter(status='opened').count()
sent_count = recent_logs.filter(status='sent').count()
open_rate = (opened_count / sent_count) * 100 if sent_count > 0 else 0
```

### Database Cleanup
```sql
-- Clean up old email logs (older than 90 days)
DELETE FROM utils_email_log 
WHERE queued_at < NOW() - INTERVAL '90 days';

-- Clean up completed queue items (older than 7 days)
DELETE FROM utils_email_queue 
WHERE status = 'sent' 
  AND sent_at < NOW() - INTERVAL '7 days';
```

## Troubleshooting

### Common Issues

1. **Emails Not Sending**
   - Check SMTP configuration
   - Verify queue processing is running
   - Check for failed queue items

2. **MJML Compilation Errors**
   - Validate MJML syntax
   - Check include file paths
   - Verify template context variables

3. **Queue Processing Slow**
   - Increase batch size
   - Reduce processing interval
   - Add more worker processes

4. **High Memory Usage**
   - Monitor large attachments
   - Implement content streaming
   - Clean up old logs regularly

### Debug Commands
```bash
# Check queue status
python manage.py process_email_queue --dry-run

# Validate templates
python manage.py test_emails validate --template order_confirmation

# View queue statistics
python -c "
import django; django.setup()
from utils.services.queue_service import email_queue_service
print(email_queue_service.get_queue_stats())
"
```

## Security Considerations

### Email Content
- **Sanitization**: Sanitize user input in templates
- **Validation**: Validate email addresses
- **Rate Limiting**: Prevent email bombing

### Sensitive Data
- **Encryption**: Encrypt sensitive template data
- **Access Control**: Limit admin access
- **Audit Logging**: Track configuration changes

### SMTP Security
- **Authentication**: Use secure SMTP authentication
- **TLS/SSL**: Enable encryption for SMTP connections
- **Credentials**: Store credentials securely

## Integration Examples

### With Order System
```python
def complete_order(order):
    # Process order...
    order.status = 'completed'
    order.save()
    
    # Queue confirmation email
    email_service.send_order_confirmation(
        user_email=order.customer.email,
        order_data={
            'order_number': order.number,
            'customer_name': order.customer.full_name,
            'total_amount': order.total,
            'items': order.items.all()
        },
        use_queue=True,
        priority='high',
        user=order.created_by
    )
```

### With User Registration
```python
def register_user(user_data):
    # Create user...
    user = User.objects.create_user(**user_data)
    
    # Queue activation email
    email_service.send_account_activation(
        user_email=user.email,
        activation_data={
            'user': user,
            'activation_url': f"{settings.FRONTEND_URL}/activate/{token}"
        },
        use_queue=True,
        priority='urgent'
    )
```

## Best Practices

### Template Design
- Use master template for consistency
- Keep subject lines clear and descriptive
- Include proper unsubscribe links
- Test across email clients

### Queue Management
- Process urgent emails immediately
- Use appropriate batch sizes
- Monitor queue health regularly
- Implement proper error handling

### Performance
- Cache compiled templates
- Optimize database queries
- Clean up old data regularly
- Monitor resource usage

### Maintenance
- Regular backups of email data
- Monitor delivery rates
- Update templates as needed
- Review and update settings periodically 