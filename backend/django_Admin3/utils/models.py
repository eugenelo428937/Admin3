from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.validators import EmailValidator
import uuid
import json


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


class EmailQueue(models.Model):
    """Email queue for delayed/batch processing."""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('retry', 'Retry Scheduled'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    # Unique identifier
    queue_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    
    # Email details
    template = models.ForeignKey(EmailTemplate, on_delete=models.SET_NULL, null=True, blank=True)
    to_emails = models.JSONField(help_text="List of recipient email addresses")
    cc_emails = models.JSONField(default=list, blank=True, help_text="CC email addresses")
    bcc_emails = models.JSONField(default=list, blank=True, help_text="BCC email addresses")
    
    from_email = models.EmailField(blank=True, help_text="Sender email address")
    reply_to_email = models.EmailField(blank=True, help_text="Reply-to email address")
    
    subject = models.CharField(max_length=300, help_text="Email subject")
    
    # Content
    email_context = models.JSONField(default=dict, help_text="Template context data")
    html_content = models.TextField(blank=True, help_text="Pre-rendered HTML content")
    text_content = models.TextField(blank=True, help_text="Plain text content")
    
    # Processing settings
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='normal')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Scheduling
    scheduled_at = models.DateTimeField(default=timezone.now, help_text="When to send the email")
    process_after = models.DateTimeField(default=timezone.now, help_text="Do not process before this time")
    expires_at = models.DateTimeField(null=True, blank=True, help_text="Email expires and won't be sent after this time")
    
    # Processing tracking
    attempts = models.PositiveIntegerField(default=0, help_text="Number of send attempts")
    max_attempts = models.PositiveIntegerField(default=3, help_text="Maximum retry attempts")
    last_attempt_at = models.DateTimeField(null=True, blank=True)
    next_retry_at = models.DateTimeField(null=True, blank=True)
    
    # Results
    sent_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True, help_text="Last error message")
    error_details = models.JSONField(default=dict, blank=True, help_text="Detailed error information")
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Tags for organization
    tags = models.JSONField(default=list, blank=True, help_text="Tags for categorization and filtering")
    
    class Meta:
        db_table = 'utils_email_queue'
        ordering = ['-priority', 'scheduled_at', 'created_at']
        indexes = [
            models.Index(fields=['status', 'scheduled_at']),
            models.Index(fields=['priority', 'status']),
            models.Index(fields=['process_after']),
            models.Index(fields=['template', 'status']),
        ]
        verbose_name = 'Email Queue Item'
        verbose_name_plural = 'Email Queue'
    
    def __str__(self):
        recipients = ', '.join(self.to_emails[:2])
        if len(self.to_emails) > 2:
            recipients += f" (and {len(self.to_emails) - 2} more)"
        return f"{self.subject} → {recipients} ({self.status})"
    
    def can_retry(self):
        """Check if email can be retried."""
        return self.status in ['failed', 'retry'] and self.attempts < self.max_attempts
    
    def mark_failed(self, error_message, error_details=None):
        """Mark email as failed with error details."""
        self.status = 'failed'
        self.error_message = error_message
        self.error_details = error_details or {}
        self.last_attempt_at = timezone.now()
        self.save()
    
    def schedule_retry(self, delay_minutes=5):
        """Schedule email for retry."""
        self.status = 'retry'
        self.next_retry_at = timezone.now() + timezone.timedelta(minutes=delay_minutes)
        self.save()


class EmailLog(models.Model):
    """Comprehensive email logging and tracking."""
    
    STATUS_CHOICES = [
        ('queued', 'Queued'),
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('opened', 'Opened'),
        ('clicked', 'Clicked'),
        ('bounced', 'Bounced'),
        ('failed', 'Failed'),
        ('spam', 'Marked as Spam'),
        ('unsubscribed', 'Unsubscribed'),
    ]
    
    # Identifiers
    log_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    queue_item = models.ForeignKey(EmailQueue, on_delete=models.CASCADE, null=True, blank=True, related_name='logs')
    
    # Email details
    template = models.ForeignKey(EmailTemplate, on_delete=models.SET_NULL, null=True, blank=True)
    to_email = models.EmailField(validators=[EmailValidator()], help_text="Recipient email address")
    from_email = models.EmailField(help_text="Sender email address")
    
    subject = models.CharField(max_length=300, help_text="Email subject")
    
    # Content tracking
    content_hash = models.CharField(max_length=64, blank=True, help_text="MD5 hash of content for deduplication")
    
    # Attachments
    attachment_info = models.JSONField(default=list, blank=True, help_text="Information about email attachments")
    total_size_bytes = models.BigIntegerField(default=0, help_text="Total email size including attachments")
    
    # Processing details
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='queued')
    priority = models.CharField(max_length=20, choices=EmailQueue.PRIORITY_CHOICES, default='normal')
    
    # Timing
    queued_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    opened_at = models.DateTimeField(null=True, blank=True)
    first_clicked_at = models.DateTimeField(null=True, blank=True)
    
    # Response tracking
    response_code = models.CharField(max_length=10, blank=True, help_text="SMTP response code")
    response_message = models.TextField(blank=True, help_text="SMTP response message")
    error_message = models.TextField(blank=True, help_text="Error message if failed")
    
    # Analytics
    open_count = models.PositiveIntegerField(default=0, help_text="Number of times opened")
    click_count = models.PositiveIntegerField(default=0, help_text="Number of clicks")
    
    # Recipient information
    recipient_info = models.JSONField(default=dict, blank=True, help_text="Additional recipient information")
    user_agent = models.TextField(blank=True, help_text="User agent from email opens/clicks")
    ip_address = models.GenericIPAddressField(null=True, blank=True, help_text="IP address from tracking")
    
    # Email service provider details
    esp_message_id = models.CharField(max_length=200, blank=True, help_text="ESP-specific message ID")
    esp_response = models.JSONField(default=dict, blank=True, help_text="Full ESP response data")
    
    # Context and metadata
    email_context = models.JSONField(default=dict, blank=True, help_text="Template context used")
    metadata = models.JSONField(default=dict, blank=True, help_text="Additional metadata")
    tags = models.JSONField(default=list, blank=True, help_text="Tags for categorization")
    
    # Processing information
    processed_by = models.CharField(max_length=100, blank=True, help_text="System/worker that processed the email")
    processing_time_ms = models.PositiveIntegerField(null=True, blank=True, help_text="Time taken to process in milliseconds")
    
    class Meta:
        db_table = 'utils_email_log'
        ordering = ['-queued_at']
        indexes = [
            models.Index(fields=['to_email', '-queued_at']),
            models.Index(fields=['status', '-queued_at']),
            models.Index(fields=['template', '-queued_at']),
            models.Index(fields=['sent_at']),
            models.Index(fields=['content_hash']),
        ]
        verbose_name = 'Email Log'
        verbose_name_plural = 'Email Logs'
    
    def __str__(self):
        return f"{self.subject} → {self.to_email} ({self.status})"
    
    def mark_sent(self, response_code=None, response_message=None, esp_message_id=None):
        """Mark email as sent with response details."""
        self.status = 'sent'
        self.sent_at = timezone.now()
        if response_code:
            self.response_code = response_code
        if response_message:
            self.response_message = response_message
        if esp_message_id:
            self.esp_message_id = esp_message_id
        self.save()
    
    def mark_opened(self, user_agent=None, ip_address=None):
        """Record email open event."""
        if self.status == 'sent':
            self.status = 'opened'
        if not self.opened_at:
            self.opened_at = timezone.now()
        self.open_count += 1
        if user_agent:
            self.user_agent = user_agent
        if ip_address:
            self.ip_address = ip_address
        self.save()
    
    def mark_clicked(self, user_agent=None, ip_address=None):
        """Record email click event."""
        if self.status in ['sent', 'opened']:
            self.status = 'clicked'
        if not self.first_clicked_at:
            self.first_clicked_at = timezone.now()
        self.click_count += 1
        if user_agent:
            self.user_agent = user_agent
        if ip_address:
            self.ip_address = ip_address
        self.save()
    
    def regenerate_email_content(self):
        """
        Regenerate email content from stored context and template information.
        Useful for resending emails or debugging email content.
        
        Returns:
            dict: Contains 'html_content', 'text_content', and 'success' status
        """
        try:
            if not self.template:
                return {
                    'success': False,
                    'error': 'No template information available',
                    'html_content': '',
                    'text_content': ''
                }
            
            # Import here to avoid circular imports
            from .email_service import EmailService
            
            email_service = EmailService()
            
            # Use master template system if configured
            if self.template.use_master_template:
                template_map = {
                    'order_confirmation': 'order_confirmation_content',
                    'password_reset': 'password_reset_content', 
                    'account_activation': 'account_activation_content'
                }
                
                if self.template.name in template_map:
                    content_template = template_map[self.template.name]
                    
                    # Render using master template
                    mjml_content = email_service._render_email_with_master_template(
                        content_template=content_template,
                        context=self.email_context,
                        email_title=self.subject,
                        email_preview=f"Email from {self.template.display_name}"
                    )
                    
                    # Convert MJML to HTML
                    from mjml import mjml2html
                    html_content = mjml2html(mjml_content)
                    
                    # Generate simple text version
                    text_content = email_service._html_to_text(html_content)
                    
                    return {
                        'success': True,
                        'html_content': html_content,
                        'text_content': text_content,
                        'mjml_content': mjml_content
                    }
            
            # Fallback to regular template
            try:
                from django.template.loader import render_to_string
                
                mjml_template = f'emails/mjml/{self.template.content_template_name}.mjml'
                html_content = render_to_string(mjml_template, self.email_context)
                text_content = email_service._html_to_text(html_content)
                
                return {
                    'success': True,
                    'html_content': html_content,
                    'text_content': text_content
                }
            except Exception as template_error:
                return {
                    'success': False,
                    'error': f'Template rendering failed: {str(template_error)}',
                    'html_content': '',
                    'text_content': ''
                }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Email regeneration failed: {str(e)}',
                'html_content': '',
                'text_content': ''
            }


class EmailSettings(models.Model):
    """Global email system configuration and settings."""
    
    SETTING_TYPES = [
        ('smtp', 'SMTP Configuration'),
        ('queue', 'Queue Settings'),
        ('tracking', 'Tracking Settings'),
        ('template', 'Template Settings'),
        ('security', 'Security Settings'),
        ('performance', 'Performance Settings'),
        ('integration', 'Integration Settings'),
    ]
    
    key = models.CharField(max_length=100, unique=True, help_text="Setting key")
    setting_type = models.CharField(max_length=20, choices=SETTING_TYPES, default='template')
    display_name = models.CharField(max_length=200, help_text="Human-readable setting name")
    description = models.TextField(blank=True, help_text="Setting description and purpose")
    
    # Value storage
    value = models.JSONField(help_text="Setting value (can be string, number, object, etc.)")
    default_value = models.JSONField(default=dict, blank=True, help_text="Default value for this setting")
    
    # Validation and constraints
    is_required = models.BooleanField(default=False, help_text="Setting is required for system operation")
    is_sensitive = models.BooleanField(default=False, help_text="Setting contains sensitive information")
    validation_rules = models.JSONField(default=dict, blank=True, help_text="Validation rules for the setting value")
    
    # Metadata
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        db_table = 'utils_email_settings'
        ordering = ['setting_type', 'key']
        verbose_name = 'Email Setting'
        verbose_name_plural = 'Email Settings'
    
    def __str__(self):
        return f"{self.display_name} ({self.key})"
    
    @classmethod
    def get_setting(cls, key, default=None):
        """Get a setting value by key."""
        try:
            setting = cls.objects.get(key=key, is_active=True)
            return setting.value
        except cls.DoesNotExist:
            return default
    
    @classmethod
    def set_setting(cls, key, value, setting_type='template', display_name=None, description=None, user=None):
        """Set a setting value."""
        setting, created = cls.objects.get_or_create(
            key=key,
            defaults={
                'setting_type': setting_type,
                'display_name': display_name or key.replace('_', ' ').title(),
                'description': description or '',
                'value': value,
                'updated_by': user,
            }
        )
        if not created:
            setting.value = value
            setting.updated_by = user
            setting.save()
        return setting


class EmailCampaign(models.Model):
    """Email campaign management for bulk emails."""
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('scheduled', 'Scheduled'),
        ('sending', 'Sending'),
        ('completed', 'Completed'),
        ('paused', 'Paused'),
        ('cancelled', 'Cancelled'),
    ]
    
    campaign_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    name = models.CharField(max_length=200, help_text="Campaign name")
    description = models.TextField(blank=True, help_text="Campaign description")
    
    # Template and content
    template = models.ForeignKey(EmailTemplate, on_delete=models.CASCADE)
    subject_override = models.CharField(max_length=300, blank=True, help_text="Override template subject")
    
    # Recipients
    recipient_list = models.JSONField(help_text="List of recipients with their context data")
    total_recipients = models.PositiveIntegerField(default=0, help_text="Total number of recipients")
    
    # Scheduling
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    scheduled_at = models.DateTimeField(null=True, blank=True, help_text="When to start sending")
    
    # Sending configuration
    send_rate_per_hour = models.PositiveIntegerField(default=100, help_text="Maximum emails per hour")
    batch_size = models.PositiveIntegerField(default=10, help_text="Emails per batch")
    
    # Progress tracking
    sent_count = models.PositiveIntegerField(default=0)
    failed_count = models.PositiveIntegerField(default=0)
    delivered_count = models.PositiveIntegerField(default=0)
    opened_count = models.PositiveIntegerField(default=0)
    clicked_count = models.PositiveIntegerField(default=0)
    
    # Timing
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        db_table = 'utils_email_campaign'
        ordering = ['-created_at']
        verbose_name = 'Email Campaign'
        verbose_name_plural = 'Email Campaigns'
    
    def __str__(self):
        return f"{self.name} ({self.status})"
    
    @property
    def completion_percentage(self):
        """Calculate campaign completion percentage."""
        if self.total_recipients == 0:
            return 0
        return (self.sent_count + self.failed_count) / self.total_recipients * 100
    
    @property
    def success_rate(self):
        """Calculate campaign success rate."""
        total_processed = self.sent_count + self.failed_count
        if total_processed == 0:
            return 0
        return self.sent_count / total_processed * 100



class EmailContentRule(models.Model):
    """Rules for triggering dynamic content insertion. Focuses purely on conditions and triggering logic."""
    
    RULE_TYPES = [
        ('product_based', 'Product-Based Content'),
        ('user_attribute', 'User Attribute-Based'),
        ('order_value', 'Order Value-Based'),
        ('location_based', 'Location/Country-Based'),
        ('date_based', 'Date/Time-Based'),
        ('custom_condition', 'Custom Condition'),
    ]
    
    CONDITION_OPERATORS = [
        ('equals', 'Equals'),
        ('not_equals', 'Not Equals'),
        ('in', 'In List'),
        ('not_in', 'Not In List'),
        ('greater_than', 'Greater Than'),
        ('less_than', 'Less Than'),
        ('greater_equal', 'Greater Than or Equal'),
        ('less_equal', 'Less Than or Equal'),
        ('contains', 'Contains'),
        ('not_contains', 'Does Not Contain'),
        ('starts_with', 'Starts With'),
        ('ends_with', 'Ends With'),
        ('regex_match', 'Regular Expression Match'),
        ('exists', 'Field Exists'),
        ('not_exists', 'Field Does Not Exist'),
    ]
    
    # Rule identification
    name = models.CharField(max_length=200, help_text="Rule name for identification")
    description = models.TextField(blank=True, help_text="Rule description and purpose")
    rule_type = models.CharField(max_length=30, choices=RULE_TYPES, help_text="Type of rule condition")
    
    # Target placeholder (replaces placeholder_name string)
    placeholder = models.ForeignKey(
        'EmailContentPlaceholder',  # String reference to avoid forward reference issue
        on_delete=models.CASCADE, 
        related_name='content_rules',
        help_text="Placeholder that this rule targets"
    )
    
    # Associated templates
    templates = models.ManyToManyField(EmailTemplate, through='EmailTemplateContentRule', related_name='content_rules')
    
    # Condition configuration (core responsibility of this model)
    condition_field = models.CharField(max_length=100, help_text="Field name to evaluate (e.g., 'items.product_code', 'user.country')")
    condition_operator = models.CharField(max_length=20, choices=CONDITION_OPERATORS, help_text="Comparison operator")
    condition_value = models.JSONField(help_text="Value(s) to compare against")
    
    # Advanced conditions
    additional_conditions = models.JSONField(default=list, blank=True, help_text="Additional AND/OR conditions")
    custom_logic = models.TextField(blank=True, help_text="Custom Python logic for complex conditions")
    
    # Priority and ordering
    priority = models.IntegerField(default=0, help_text="Rule priority (higher numbers processed first)")
    is_exclusive = models.BooleanField(default=False, help_text="Stop processing other rules if this one matches")
    
    # Metadata
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        db_table = 'utils_email_content_rule'
        ordering = ['-priority', 'name']
        verbose_name = 'Email Content Rule'
        verbose_name_plural = 'Email Content Rules'
    
    def __str__(self):
        return f"{self.name} → {self.placeholder.name} ({self.rule_type})"
    
    def evaluate_condition(self, context):
        """
        Evaluate if this rule's condition matches the given context.
        
        Args:
            context (dict): Email template context data
            
        Returns:
            bool: True if condition matches, False otherwise
        """
        try:
            # Extract field value from context using dot notation
            field_value = self._get_nested_field_value(context, self.condition_field)
            
            # Handle special case for product-based rules where we need to check items
            if self.rule_type == 'product_based' and 'items' in context:
                return self._evaluate_product_condition(context['items'])
            
            # Evaluate the main condition
            result = self._evaluate_operator(field_value, self.condition_operator, self.condition_value)
            
            # Evaluate additional conditions if present
            if self.additional_conditions:
                for additional_condition in self.additional_conditions:
                    additional_result = self._evaluate_additional_condition(context, additional_condition)
                    
                    # Handle AND/OR logic
                    if additional_condition.get('logic', 'AND') == 'AND':
                        result = result and additional_result
                    else:  # OR
                        result = result or additional_result
            
            return result
            
        except Exception as e:
            logger.error(f"Error evaluating content rule {self.name}: {str(e)}")
            return False
    
    def _get_nested_field_value(self, context, field_path):
        """Extract value from nested dictionary using dot notation."""
        keys = field_path.split('.')
        value = context
        
        for key in keys:
            if isinstance(value, dict):
                value = value.get(key)
            elif isinstance(value, list) and key.isdigit():
                index = int(key)
                value = value[index] if 0 <= index < len(value) else None
            else:
                return None
        
        return value
    
    def _evaluate_product_condition(self, items):
        """Evaluate product-based conditions against order items."""
        # Extract the field name from condition_field (e.g., 'items.product_code' -> 'product_code')
        field_parts = self.condition_field.split('.')
        if len(field_parts) > 1 and field_parts[0] == 'items':
            field_name = field_parts[1]
        else:
            field_name = 'product_id'  # default fallback
        
        for item in items:
            field_value = item.get(field_name)
            if self._evaluate_operator(field_value, self.condition_operator, self.condition_value):
                return True
        return False
    
    def _evaluate_operator(self, field_value, operator, condition_value):
        """Evaluate a single condition using the specified operator."""
        if operator == 'equals':
            return field_value == condition_value
        elif operator == 'not_equals':
            return field_value != condition_value
        elif operator == 'in':
            return field_value in condition_value if isinstance(condition_value, list) else False
        elif operator == 'not_in':
            return field_value not in condition_value if isinstance(condition_value, list) else True
        elif operator == 'greater_than':
            return field_value > condition_value if field_value is not None else False
        elif operator == 'less_than':
            return field_value < condition_value if field_value is not None else False
        elif operator == 'greater_equal':
            return field_value >= condition_value if field_value is not None else False
        elif operator == 'less_equal':
            return field_value <= condition_value if field_value is not None else False
        elif operator == 'contains':
            return str(condition_value) in str(field_value) if field_value is not None else False
        elif operator == 'not_contains':
            return str(condition_value) not in str(field_value) if field_value is not None else True
        elif operator == 'starts_with':
            return str(field_value).startswith(str(condition_value)) if field_value is not None else False
        elif operator == 'ends_with':
            return str(field_value).endswith(str(condition_value)) if field_value is not None else False
        elif operator == 'exists':
            return field_value is not None
        elif operator == 'not_exists':
            return field_value is None
        elif operator == 'regex_match':
            import re
            return bool(re.match(str(condition_value), str(field_value))) if field_value is not None else False
        else:
            return False
    
    def _evaluate_additional_condition(self, context, condition):
        """Evaluate an additional condition."""
        field_value = self._get_nested_field_value(context, condition['field'])
        return self._evaluate_operator(field_value, condition['operator'], condition['value'])
    
    def render_content(self, context):
        """
        Render the content template with the given context.
        
        Args:
            context (dict): Email template context data
            
        Returns:
            str: Rendered content
        """
        try:
            from django.template import Template, Context
            
            # Get content template from placeholder
            content_template = self.placeholder.default_content_template
            if not content_template:
                logger.warning(f"No default content template found for placeholder {self.placeholder.name}")
                return ""
            
            # Combine placeholder variables with context
            combined_context = {
                **self.placeholder.content_variables,
                **context
            }
            
            template = Template(content_template)
            rendered_content = template.render(Context(combined_context))
            
            return rendered_content
            
        except Exception as e:
            logger.error(f"Error rendering content for rule {self.name}: {str(e)}")
            return ""


class EmailTemplateContentRule(models.Model):
    """Association between email templates and content rules."""
    
    template = models.ForeignKey(EmailTemplate, on_delete=models.CASCADE, related_name='template_content_rules')
    content_rule = models.ForeignKey(EmailContentRule, on_delete=models.CASCADE, related_name='template_associations')
    
    # Rule-specific overrides
    is_enabled = models.BooleanField(default=True, help_text="Enable this rule for this template")
    priority_override = models.IntegerField(null=True, blank=True, help_text="Override rule priority for this template")
    
    # Template-specific content overrides (simplified since content config is now in placeholder)
    content_override = models.TextField(blank=True, help_text="Override content template for this specific template")
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'utils_email_template_content_rule'
        unique_together = ['template', 'content_rule']
        ordering = ['-priority_override', '-content_rule__priority']
        verbose_name = 'Template Content Rule'
        verbose_name_plural = 'Template Content Rules'
    
    def __str__(self):
        return f"{self.template.name} - {self.content_rule.name} → {self.content_rule.placeholder.name}"
    
    @property
    def effective_priority(self):
        """Get the effective priority (override or rule default)."""
        return self.priority_override if self.priority_override is not None else self.content_rule.priority
    
    def get_content_template(self):
        """Get the effective content template (override or placeholder default)."""
        return self.content_override if self.content_override else self.content_rule.placeholder.default_content_template
    
    def get_content_variables(self):
        """Get the content variables from the associated placeholder."""
        return self.content_rule.placeholder.content_variables


class EmailContentPlaceholder(models.Model):
    """Define placeholders available in email templates for dynamic content insertion."""
    
    name = models.CharField(max_length=100, unique=True, help_text="Placeholder name (e.g., 'TUTORIAL_CONTENT')")
    display_name = models.CharField(max_length=200, help_text="Human-readable placeholder name")
    description = models.TextField(blank=True, help_text="Description of what this placeholder is for")
    
    # Content template configuration (moved from EmailContentRule)
    default_content_template = models.TextField(blank=True, help_text="Default MJML/HTML content template when no rules match")
    content_variables = models.JSONField(default=dict, blank=True, help_text="Variables available in content templates for this placeholder")
    
    # Insertion configuration (moved from EmailContentRule)
    insert_position = models.CharField(max_length=20, choices=[
        ('replace', 'Replace Placeholder'),
        ('before', 'Before Placeholder'),
        ('after', 'After Placeholder'),
        ('append', 'Append to End'),
        ('prepend', 'Prepend to Beginning'),
    ], default='replace', help_text="How to insert content relative to placeholder")
    
    # Associated templates
    templates = models.ManyToManyField(EmailTemplate, related_name='placeholders', blank=True)
    
    # Placeholder configuration
    is_required = models.BooleanField(default=False, help_text="This placeholder must be present in templates")
    allow_multiple_rules = models.BooleanField(default=False, help_text="Allow multiple rules to contribute content")
    content_separator = models.CharField(max_length=50, default='\n', help_text="Separator when multiple rules match")
    
    # Metadata
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'utils_email_content_placeholder'
        ordering = ['name']
        verbose_name = 'Email Content Placeholder'
        verbose_name_plural = 'Email Content Placeholders'
    
    def __str__(self):
        return f"{self.display_name} ({self.name})" 