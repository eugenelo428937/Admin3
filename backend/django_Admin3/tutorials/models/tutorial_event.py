"""
Tutorial Event model.

Updated 2026-01-16: Migrated FK from ExamSessionSubjectProductVariation
to store.Product as part of T087 legacy app cleanup.
"""
from django.db import models
from store.models import Product as StoreProduct


class TutorialEvent(models.Model):
    """
    Simplified Tutorial Event model.

    Links to store.Product for the purchasable tutorial product variation.
    """
    code = models.CharField(max_length=100, unique=True)
    venue = models.CharField(max_length=255)
    is_soldout = models.BooleanField(default=False)
    finalisation_date = models.DateField(null=True, blank=True)
    remain_space = models.IntegerField(default=0)
    start_date = models.DateField()
    end_date = models.DateField()
    # Updated FK: was exam_session_subject_product_variation → ExamSessionSubjectProductVariation
    # Now store_product → store.Product (IDs preserved during migration)
    store_product = models.ForeignKey(
        StoreProduct,
        on_delete=models.CASCADE,
        related_name='tutorial_events',
        db_column='exam_session_subject_product_variation_id'  # Keep same column name for data preservation
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'tutorials'
        db_table = '"acted"."tutorial_events"'
        ordering = ['start_date', 'code']
        verbose_name = 'Tutorial Event'
        verbose_name_plural = 'Tutorial Events'

    @property
    def subject_code(self):
        """Get subject code through store.Product relationship"""
        return self.store_product.exam_session_subject.subject.code

    # Backward compatibility property
    @property
    def exam_session_subject_product_variation(self):
        """Backward compatibility: returns store_product (same FK target IDs)"""
        return self.store_product

    def __str__(self):
        return f"{self.code} - {self.venue}"
