from django.db import models
from django.contrib.auth.models import User


class EmailMasterComponent(models.Model):
    """Shared MJML components used to assemble email templates.

    These are structural building blocks (banner, footer, styles, master_template,
    closing, dev_mode_banner) that are injected into every email. They live in a
    separate table from EmailTemplate because they have no subject, queue settings,
    tracking, or any of the per-email configuration fields.
    """

    COMPONENT_TYPES = [
        ('master_template', 'Master Template'),
        ('banner', 'Banner'),
        ('footer', 'Footer'),
        ('styles', 'Styles'),
        ('attributes', 'Attributes'),
        ('closing', 'Closing'),
        ('dev_mode_banner', 'Dev Mode Banner'),
    ]

    name = models.CharField(max_length=100, unique=True, help_text="Component identifier")
    component_type = models.CharField(max_length=50, choices=COMPONENT_TYPES, help_text="Type of shared component")
    display_name = models.CharField(max_length=200, help_text="Human-readable name")
    description = models.TextField(blank=True, help_text="Component description and purpose")
    mjml_content = models.TextField(default='', help_text="MJML source content")

    # Metadata
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='created_email_master_components',
    )

    class Meta:
        db_table = 'utils_email_master_components'
        ordering = ['component_type', 'name']
        verbose_name = 'Email Master Component'
        verbose_name_plural = 'Email Master Components'

    def __str__(self):
        return f"{self.display_name} ({self.component_type})"
