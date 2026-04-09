import logging
import re

from django.db import models
from django.contrib.auth.models import User

logger = logging.getLogger(__name__)


class EmailTemplateVersion(models.Model):
    """Immutable snapshot of an email template's content at a point in time.

    All mutable content (subject, MJML, markdown, closing salutation,
    payload schema) lives on the version — never directly on EmailTemplate.
    The "current" content is ``template.current_version``. Every save of
    the template via the admin creates a new version, so history is
    preserved and queue items can pin the exact snapshot used at send time.
    """

    # Regex: matches {{ !variable.path | default:"value" }} with flexible whitespace
    VARIABLE_PATTERN = re.compile(
        r'\{\{\s*(!?)\s*([\w.]+)\s*(?:\|\s*default:"([^"]*)")?\s*\}\}'
    )
    # Regex for stripping the ! marker so Django's template engine can render
    _STRIP_REQUIRED_MARKER = re.compile(r'\{\{\s*!\s*([\w.]+)')

    template = models.ForeignKey(
        'email_system.EmailTemplate',
        on_delete=models.CASCADE,
        related_name='versions',
    )
    version_number = models.PositiveIntegerField()

    # Versioned content fields
    subject_template = models.CharField(max_length=300, blank=True, default='')
    mjml_content = models.TextField(blank=True, default='')
    basic_mode_content = models.TextField(blank=True, default='')

    # Versioned config that affects rendering
    closing_salutation = models.ForeignKey(
        'email_system.ClosingSalutation',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='template_versions',
        help_text="Closing salutation block snapshot for this version",
    )
    payload_schema = models.JSONField(
        default=dict,
        blank=True,
        help_text="Auto-generated schema from template variables at the time of this version",
    )

    # Denormalised closing salutation snapshot (preserved if salutation is later edited/deleted)
    closing_sign_off = models.CharField(max_length=200, blank=True, default='')
    closing_display_name = models.CharField(max_length=200, blank=True, default='')
    closing_job_title = models.CharField(max_length=200, blank=True, default='')

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    change_note = models.CharField(
        max_length=500, blank=True, default='',
        help_text="Optional note describing what changed in this version",
    )

    class Meta:
        db_table = 'utils_email_template_version'
        unique_together = ['template', 'version_number']
        ordering = ['template', '-version_number']
        verbose_name = 'Email Template Version'
        verbose_name_plural = 'Email Template Versions'

    def __str__(self):
        return f"{self.template.name} v{self.version_number}"

    # ------------------------------------------------------------------
    # Content helpers
    # ------------------------------------------------------------------

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
        # Sync denormalised closing fields from the FK on every save so a later
        # delete/edit of the ClosingSalutation row doesn't corrupt the snapshot.
        if self.closing_salutation_id:
            sal = self.closing_salutation
            self.closing_sign_off = sal.sign_off_text or ''
            self.closing_display_name = sal.display_name or ''
            self.closing_job_title = sal.job_title or ''
        # Rebuild payload_schema from current content fields
        self._rebuild_payload_schema()
        super().save(*args, **kwargs)

    def _rebuild_payload_schema(self):
        """Parse all content fields for variable references and build payload_schema."""
        from email_system.models.variable import EmailVariable

        var_refs = {}
        for content in [self.subject_template, self.mjml_content, self.basic_mode_content]:
            if not content:
                continue
            for match in self.VARIABLE_PATTERN.finditer(content):
                mandatory_marker, var_path, template_default = match.groups()
                is_required = mandatory_marker == '!'
                existing = var_refs.get(var_path)
                if existing:
                    if is_required:
                        existing['required'] = True
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

        catalog = {
            v.variable_path: v
            for v in EmailVariable.objects.filter(
                variable_path__in=list(var_refs.keys()),
                is_active=True,
            )
        }

        schema = {}
        for var_path, ref in var_refs.items():
            catalog_entry = catalog.get(var_path)
            data_type = catalog_entry.data_type if catalog_entry else 'string'
            default = ref['default']
            if default is None and catalog_entry and catalog_entry.default_value:
                default = catalog_entry.default_value

            if not catalog_entry:
                logger.warning(
                    "Variable '%s' used in template version '%s' not found in EmailVariable catalog. "
                    "Defaulting to type 'string'.",
                    var_path, self,
                )

            node = {'type': data_type, 'required': ref['required']}
            if default is not None:
                node['default'] = default

            parts = var_path.split('.')
            current = schema
            for part in parts[:-1]:
                current = current.setdefault(part, {})
            current[parts[-1]] = node

        self.payload_schema = schema
