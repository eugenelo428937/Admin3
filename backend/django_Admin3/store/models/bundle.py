"""Bundle model for the store app.

A collection of store products sold together, based on a catalog bundle template
and specific to an exam session subject.

Table: acted.bundles
"""
from django.db import models


class Bundle(models.Model):
    """
    A bundle of store products available for purchase together.

    Links a catalog bundle template to an exam session subject,
    allowing the same bundle definition to be sold across different
    exam sessions with optional overrides for name and description.

    **Usage Example**::

        bundle = Bundle.objects.get(
            bundle_template__bundle_name='Complete Study Pack',
            exam_session_subject__exam_session__session_code='2025-04'
        )
        products = bundle.bundle_products.filter(is_active=True)
    """

    bundle_template = models.ForeignKey(
        'catalog.ProductBundle',
        on_delete=models.CASCADE,
        related_name='store_bundles',
        help_text='The catalog bundle template this is based on'
    )
    exam_session_subject = models.ForeignKey(
        'catalog.ExamSessionSubject',
        on_delete=models.CASCADE,
        related_name='store_bundles',
        help_text='The exam session subject this bundle is available for'
    )
    is_active = models.BooleanField(
        default=True,
        help_text='Whether bundle is available for purchase'
    )
    override_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text='Override the template bundle name for this instance'
    )
    override_description = models.TextField(
        blank=True,
        null=True,
        help_text='Override the template description for this instance'
    )
    display_order = models.PositiveIntegerField(
        default=0,
        help_text='Sort order for bundle display'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"acted"."bundles"'
        unique_together = ('bundle_template', 'exam_session_subject')
        verbose_name = 'Store Bundle'
        verbose_name_plural = 'Store Bundles'
        ordering = ['display_order', 'created_at']

    @property
    def name(self):
        """Return override name if set, otherwise template name."""
        return self.override_name or self.bundle_template.bundle_name

    @property
    def description(self):
        """Return override description if set, otherwise template description."""
        return self.override_description or self.bundle_template.bundle_description

    def __str__(self):
        return f"{self.name} ({self.exam_session_subject})"
