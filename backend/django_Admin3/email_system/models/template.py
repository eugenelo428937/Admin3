from django.db import models
from django.contrib.auth.models import User


class EmailTemplate(models.Model):
    """Email template configuration and settings."""

    TEMPLATE_TYPES = [
        ('order_confirmation', 'Order Confirmation'),
        ('password_reset', 'Password Reset'),
        ('password_reset_completed', 'Password Reset Completed'),
        ('account_activation', 'Account Activation'),
        ('newsletter', 'Newsletter'),
        ('welcome', 'Welcome Email'),
        ('reminder', 'Reminder Email'),
        ('notification', 'System Notification'),
        ('marketing', 'Marketing Email'),
        ('support', 'Support Email'),
        ('custom', 'Custom Email'),
    ]

    PRIORITY_LEVELS = [
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]

    name = models.CharField(max_length=100, unique=True, help_text="Template identifier")
    template_type = models.CharField(max_length=50, choices=TEMPLATE_TYPES, default='custom')
    display_name = models.CharField(max_length=200, help_text="Human-readable template name")
    description = models.TextField(blank=True, help_text="Template description and purpose")

    # Template configuration
    subject_template = models.CharField(max_length=300, help_text="Email subject template with variables")
    content_template_name = models.CharField(max_length=100, help_text="MJML content template filename")
    use_master_template = models.BooleanField(default=True, help_text="Use master template system")

    # Email settings
    from_email = models.EmailField(blank=True, help_text="Override default from email")
    reply_to_email = models.EmailField(blank=True, help_text="Reply-to email address")
    default_priority = models.CharField(max_length=20, choices=PRIORITY_LEVELS, default='normal')

    # Processing options
    enable_tracking = models.BooleanField(default=True, help_text="Enable open/click tracking")
    enable_queue = models.BooleanField(default=True, help_text="Queue emails instead of immediate send")
    max_retry_attempts = models.IntegerField(default=3, help_text="Maximum retry attempts for failed emails")
    retry_delay_minutes = models.IntegerField(default=5, help_text="Delay between retries in minutes")

    # Outlook compatibility
    enhance_outlook_compatibility = models.BooleanField(default=True, help_text="Apply Outlook enhancements")

    # Metadata
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_email_templates')

    class Meta:
        db_table = 'utils_email_template'
        ordering = ['template_type', 'name']
        verbose_name = 'Email Template'
        verbose_name_plural = 'Email Templates'

    def __str__(self):
        return f"{self.display_name} ({self.template_type})"


class EmailAttachment(models.Model):
    """Email attachment configuration and files."""

    ATTACHMENT_TYPES = [
        ('static', 'Static File'),
        ('dynamic', 'Dynamic Generated'),
        ('template', 'Template-based'),
        ('external', 'External URL'),
    ]

    name = models.CharField(max_length=200, help_text="Attachment name/identifier")
    display_name = models.CharField(max_length=200, help_text="Filename shown to recipients")
    attachment_type = models.CharField(max_length=20, choices=ATTACHMENT_TYPES, default='static')

    # File information
    file_path = models.CharField(max_length=500, blank=True, help_text="Path to static file or template")
    file_content = models.BinaryField(blank=True, help_text="Binary content for small files")
    file_url = models.URLField(blank=True, help_text="External URL for attachments")
    mime_type = models.CharField(max_length=100, blank=True, help_text="MIME type of attachment")
    file_size = models.BigIntegerField(default=0, help_text="File size in bytes")

    # Configuration
    is_conditional = models.BooleanField(default=False, help_text="Attachment depends on email context")
    condition_rules = models.JSONField(default=dict, blank=True, help_text="Rules for conditional inclusion")

    # Metadata
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'utils_email_attachment'
        ordering = ['name']
        verbose_name = 'Email Attachment'
        verbose_name_plural = 'Email Attachments'

    def __str__(self):
        return f"{self.display_name} ({self.attachment_type})"


class EmailTemplateAttachment(models.Model):
    """Association between email templates and attachments."""

    template = models.ForeignKey(EmailTemplate, on_delete=models.CASCADE, related_name='attachments')
    attachment = models.ForeignKey(EmailAttachment, on_delete=models.CASCADE, related_name='templates')

    # Association settings
    is_required = models.BooleanField(default=False, help_text="Attachment is required for this template")
    order = models.PositiveIntegerField(default=0, help_text="Order of attachment in email")

    # Conditional inclusion
    include_condition = models.JSONField(default=dict, blank=True, help_text="Conditions for including this attachment")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'utils_email_template_attachment'
        unique_together = ['template', 'attachment']
        ordering = ['order', 'attachment__name']
        verbose_name = 'Template Attachment'
        verbose_name_plural = 'Template Attachments'

    def __str__(self):
        return f"{self.template.name} - {self.attachment.display_name}"
