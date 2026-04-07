import logging
import re

from django.db import models
from django.contrib.auth.models import User

logger = logging.getLogger(__name__)


class EmailTemplate(models.Model):
    """Email template configuration and settings."""

    TEMPLATE_TYPES = [
        ('order_confirmation', 'Order Confirmation'),
        ('password_reset', 'Password Reset'),
        ('password_reset_completed', 'Password Reset Completed'),
        ('account_activation', 'Account Activation'),
        ('email_verification', 'Email Verification'),
        ('batch_completion_report', 'Batch Completion Report'),
        ('materials', 'Materials'),
        ('marking', 'Marking'),
        ('tutorials', 'Tutorials'),
        ('apprentice', 'Apprentice'),
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
    use_master_template = models.BooleanField(default=True, help_text="Use master template system")

    # Email settings
    from_email = models.EmailField(blank=True, help_text="Override default from email")
    reply_to_email = models.EmailField(blank=True, help_text="Reply-to email address")
    default_priority = models.CharField(max_length=20, choices=PRIORITY_LEVELS, default='normal')

    # Processing options
    enable_tracking = models.BooleanField(default=True, help_text="Enable open/click tracking")
    enable_queue = models.BooleanField(default=True, help_text="Queue emails instead of immediate send")

    closing_salutation = models.ForeignKey(
        'email_system.ClosingSalutation',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='templates',
        help_text="Closing salutation block for this template",
    )

    # MJML content storage (for admin editor)
    mjml_content = models.TextField(blank=True, default='', help_text="MJML source content for the template editor")
    basic_mode_content = models.TextField(
        blank=True,
        default='',
        help_text='Markdown source for Basic Mode editing. Empty = Advanced Mode only.'
    )

    # Auto-generated payload schema from template variables
    payload_schema = models.JSONField(
        default=dict,
        blank=True,
        help_text="Auto-generated schema from template variables. Used for batch send payload validation.",
    )

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

    # Regex: matches {{ !variable.path | default:"value" }} with flexible whitespace
    VARIABLE_PATTERN = re.compile(
        r'\{\{\s*(!?)\s*([\w.]+)\s*(?:\|\s*default:"([^"]*)")?\s*\}\}'
    )
    # Regex for stripping the ! marker so Django's template engine can render the content
    _STRIP_REQUIRED_MARKER = re.compile(
        r'\{\{\s*!\s*([\w.]+)'
    )

    def get_renderable_content(self) -> str:
        """Return mjml_content with ! required markers stripped for Django template rendering."""
        if not self.mjml_content:
            return ''
        return self._STRIP_REQUIRED_MARKER.sub(r'{{ \1', self.mjml_content)

    def get_renderable_subject(self) -> str:
        """Return subject_template with ! required markers stripped for Django template rendering."""
        if not self.subject_template:
            return ''
        return self._STRIP_REQUIRED_MARKER.sub(r'{{ \1', self.subject_template)

    def save(self, *args, **kwargs):
        update_fields = kwargs.get('update_fields')
        if update_fields is None or 'mjml_content' in update_fields or 'basic_mode_content' in update_fields or 'subject_template' in update_fields:
            self._rebuild_payload_schema()
            if update_fields is not None and 'payload_schema' not in update_fields:
                kwargs['update_fields'] = list(update_fields) + ['payload_schema']
        super().save(*args, **kwargs)

    def _rebuild_payload_schema(self):
        """Parse all content fields for variable references and build payload_schema."""
        from email_system.models.variable import EmailVariable

        # Collect variable references from all content fields
        var_refs = {}  # variable_path -> {required: bool, default: str|None}
        for content in [self.subject_template, self.mjml_content, self.basic_mode_content]:
            if not content:
                continue
            for match in self.VARIABLE_PATTERN.finditer(content):
                mandatory_marker, var_path, template_default = match.groups()
                is_required = mandatory_marker == '!'
                existing = var_refs.get(var_path)
                if existing:
                    # Mandatory wins if seen in any field
                    if is_required:
                        existing['required'] = True
                    # Last non-empty template default wins
                    if template_default:
                        existing['default'] = template_default
                else:
                    var_refs[var_path] = {
                        'required': is_required,
                        'default': template_default or None,
                    }

        if not var_refs:
            self.payload_schema = {}
            return

        # Look up catalog entries for type and default info
        catalog = {
            v.variable_path: v
            for v in EmailVariable.objects.filter(
                variable_path__in=list(var_refs.keys()),
                is_active=True,
            )
        }

        # Build nested schema
        schema = {}
        for var_path, ref in var_refs.items():
            catalog_entry = catalog.get(var_path)
            data_type = catalog_entry.data_type if catalog_entry else 'string'
            # Template default overrides catalog default
            default = ref['default']
            if default is None and catalog_entry and catalog_entry.default_value:
                default = catalog_entry.default_value

            if not catalog_entry:
                logger.warning(
                    "Variable '%s' used in template '%s' not found in EmailVariable catalog. "
                    "Defaulting to type 'string'.",
                    var_path, self.name,
                )

            node = {'type': data_type, 'required': ref['required']}
            if default is not None:
                node['default'] = default

            # Convert dot-path to nested dict: "user.first_name" -> {"user": {"first_name": {...}}}
            parts = var_path.split('.')
            current = schema
            for part in parts[:-1]:
                current = current.setdefault(part, {})
            current[parts[-1]] = node

        self.payload_schema = schema

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
