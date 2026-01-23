from django.db import models
from django.core.validators import EmailValidator
from django.utils import timezone
import uuid
import logging

from .template import EmailTemplate
from .queue import EmailQueue

logger = logging.getLogger(__name__)


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
            from email_system.services.email_service import EmailService

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
