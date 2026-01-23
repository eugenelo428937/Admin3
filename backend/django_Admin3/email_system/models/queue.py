from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import uuid

from .template import EmailTemplate


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
