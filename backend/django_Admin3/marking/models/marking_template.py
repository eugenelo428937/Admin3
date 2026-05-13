"""MarkingTemplate — exam-session-agnostic template for a marking series.

Replaces the role of `catalog_products.Product` rows that today hold
marking-series templates (codes like 'X', 'MM1'). The concrete saleable
row is `store.MarkingProduct`, which links a template to an
ExamSessionSubject.

Table: acted.marking_templates
"""
from django.db import models


class MarkingTemplate(models.Model):
    """A reusable marking series template (e.g., 'Series X', 'Mock Marking 1').

    Templates are exam-session-agnostic. A `store.MarkingProduct` row
    pairs a template with an `ExamSessionSubject` to make it saleable.
    """

    code = models.CharField(
        max_length=10,
        help_text=(
            "Series code (e.g., 'X', 'MM1', 'Y'). NOT unique by itself — "
            "catalog has duplicates with distinct names. Uniqueness "
            "enforced over composite (code, name)."
        ),
    )
    name = models.CharField(
        max_length=255,
        help_text="Display name (e.g., 'Series X Marking').",
    )
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'marking'
        db_table = '"acted"."marking_templates"'
        ordering = ['code', 'name']
        verbose_name = 'Marking Template'
        verbose_name_plural = 'Marking Templates'
        constraints = [
            models.UniqueConstraint(
                fields=['code', 'name'],
                name='uq_marking_template_code_name',
            ),
        ]

    def __str__(self):
        return f"{self.code}: {self.name}"
