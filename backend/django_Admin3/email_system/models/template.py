import logging

from django.db import models
from django.contrib.auth.models import User

logger = logging.getLogger(__name__)


EMAIL_TEMPLATE_TYPES = [
    ('ORDER', 'Order'),
    ('USER', 'User'),
    ('MATERIALS', 'Materials'),
    ('MARKING', 'Marking'),
    ('TUTORIALS', 'Tutorials'),
    ('APPRENTICE', 'Apprentice'),
    ('STUDYPLUS', 'Study Plus'),
    ('SYSTEM', 'System'),
]


class EmailTemplate(models.Model):
    """Email template identity + non-versioned delivery config.

    All versioned content (subject_template, mjml_content, basic_mode_content,
    closing_salutation, payload_schema) lives on ``EmailTemplateVersion``.
    Access the current content via ``template.current_version``.
    """

    TEMPLATE_TYPES = EMAIL_TEMPLATE_TYPES

    PRIORITY_LEVELS = [
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]

    name = models.CharField(max_length=100, unique=True, help_text="Template identifier")
    template_type = models.CharField(max_length=50, choices=TEMPLATE_TYPES, default='SYSTEM')
    display_name = models.CharField(max_length=200, help_text="Human-readable template name")
    description = models.TextField(blank=True, help_text="Template description and purpose")

    # Non-versioned template configuration
    use_master_template = models.BooleanField(default=True, help_text="Use master template system")
    from_email = models.EmailField(blank=True, help_text="Override default from email")
    reply_to_email = models.EmailField(blank=True, help_text="Reply-to email address")
    default_priority = models.CharField(max_length=20, choices=PRIORITY_LEVELS, default='normal')

    # Processing options
    enable_tracking = models.BooleanField(default=True, help_text="Enable open/click tracking")
    enable_queue = models.BooleanField(default=True, help_text="Queue emails instead of immediate send")

    # Metadata
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='created_email_templates',
    )

    class Meta:
        db_table = 'utils_email_template'
        ordering = ['template_type', 'name']
        verbose_name = 'Email Template'
        verbose_name_plural = 'Email Templates'
        constraints = [
            models.CheckConstraint(
                condition=models.Q(template_type__in=[code for code, _ in EMAIL_TEMPLATE_TYPES]),
                name='email_template_type_valid',
            ),
        ]

    def __str__(self):
        return f"{self.display_name} ({self.template_type})"

    # ------------------------------------------------------------------
    # Versioning
    # ------------------------------------------------------------------

    @property
    def current_version(self):
        """Return the latest EmailTemplateVersion for this template, or None."""
        return self.versions.order_by('-version_number').first()

    @property
    def latest_version_number(self):
        latest = self.versions.order_by('-version_number').values_list('version_number', flat=True).first()
        return latest or 0

    def create_version(
        self,
        *,
        subject_template: str = '',
        mjml_content: str = '',
        basic_mode_content: str = '',
        closing_salutation=None,
        user=None,
        change_note: str = '',
    ):
        """Create a new EmailTemplateVersion snapshot from the given content."""
        from .template_version import EmailTemplateVersion

        return EmailTemplateVersion.objects.create(
            template=self,
            version_number=self.latest_version_number + 1,
            subject_template=subject_template or '',
            mjml_content=mjml_content or '',
            basic_mode_content=basic_mode_content or '',
            closing_salutation=closing_salutation,
            created_by=user,
            change_note=change_note or '',
        )


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
