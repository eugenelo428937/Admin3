from django.db import models

from .template import EmailTemplate


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
