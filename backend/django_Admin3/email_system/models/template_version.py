from django.db import models
from django.contrib.auth.models import User


class EmailTemplateVersion(models.Model):
    """Immutable snapshot of an email template's content at a point in time.

    Created automatically when a template is saved with content changes.
    Queue items reference the version used at send time so the exact email
    can be reconstructed even after the template is subsequently edited.
    """

    template = models.ForeignKey(
        'email_system.EmailTemplate',
        on_delete=models.CASCADE,
        related_name='versions',
    )
    version_number = models.PositiveIntegerField()

    # Snapshotted content fields
    subject_template = models.CharField(max_length=300)
    mjml_content = models.TextField(blank=True, default='')
    basic_mode_content = models.TextField(blank=True, default='')

    # Snapshotted closing salutation (denormalised to survive salutation edits)
    closing_sign_off = models.CharField(max_length=200, blank=True, default='')
    closing_display_name = models.CharField(max_length=200, blank=True, default='')
    closing_job_title = models.CharField(max_length=200, blank=True, default='')

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    change_note = models.CharField(max_length=500, blank=True, default='',
                                   help_text="Optional note describing what changed in this version")

    class Meta:
        db_table = 'utils_email_template_version'
        unique_together = ['template', 'version_number']
        ordering = ['template', '-version_number']
        verbose_name = 'Email Template Version'
        verbose_name_plural = 'Email Template Versions'

    def __str__(self):
        return f"{self.template.name} v{self.version_number}"
