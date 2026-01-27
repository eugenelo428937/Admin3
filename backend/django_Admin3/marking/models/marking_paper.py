"""
MarkingPaper model.

Updated 2026-01-27: Changed FK from catalog.ExamSessionSubjectProduct to
store.Product as part of schema migration to acted schema.
"""
from django.db import models
from store.models import Product as StoreProduct


class MarkingPaper(models.Model):
    """
    Marking paper with deadline information.

    Links to a store.Product to identify which purchasable product
    this marking paper belongs to.
    """
    store_product = models.ForeignKey(
        StoreProduct,
        on_delete=models.CASCADE,
        related_name='marking_papers',
        db_column='store_product_id',
    )
    name = models.CharField(max_length=10)
    deadline = models.DateTimeField()
    recommended_submit_date = models.DateTimeField()

    class Meta:
        db_table = '"acted"."marking_paper"'

    def __str__(self):
        return f"{self.name} ({self.store_product})"
