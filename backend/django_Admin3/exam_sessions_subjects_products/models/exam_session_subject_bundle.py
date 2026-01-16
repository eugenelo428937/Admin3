from django.db import models
from catalog.models import ProductBundle, ExamSessionSubject
from .exam_session_subject_product_variation import ExamSessionSubjectProductVariation

class ExamSessionSubjectBundle(models.Model):
    """
    Links master product bundles to specific exam sessions and subjects.
    This creates exam session-specific bundles from master bundle templates.
    """
    bundle = models.ForeignKey(
        ProductBundle,
        on_delete=models.CASCADE,
        related_name='exam_session_bundles',
        help_text="The master bundle template this is based on"
    )
    exam_session_subject = models.ForeignKey(
        ExamSessionSubject,
        on_delete=models.CASCADE,
        related_name='bundles',
        help_text="The specific exam session and subject this bundle is for"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this bundle is currently available for the exam session"
    )
    override_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Optional override for the bundle name (defaults to master bundle name)"
    )
    override_description = models.TextField(
        blank=True,
        null=True,
        help_text="Optional override for the bundle description"
    )
    display_order = models.PositiveIntegerField(
        default=0,
        help_text="Order in which to display this bundle for the exam session"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Many-to-many relationship with exam session product variations through the mapping table
    product_variations = models.ManyToManyField(
        ExamSessionSubjectProductVariation,
        through='ExamSessionSubjectBundleProduct',
        related_name='bundles',
        help_text="Exam session product variations included in this bundle"
    )

    class Meta:
        db_table = 'acted_exam_session_subject_bundles'
        unique_together = ['bundle', 'exam_session_subject']
        ordering = ['exam_session_subject__exam_session__session_code', 'display_order', 'bundle__bundle_name']
        verbose_name = 'Exam Session Subject Bundle'
        verbose_name_plural = 'Exam Session Subject Bundles'

    def __str__(self):
        name = self.override_name or self.bundle.bundle_name
        return f"{self.exam_session_subject} - {name}"

    @property
    def effective_name(self):
        """Get the effective bundle name (override or master)"""
        return self.override_name or self.bundle.bundle_name

    @property  
    def effective_description(self):
        """Get the effective bundle description (override or master)"""
        return self.override_description or self.bundle.bundle_description 