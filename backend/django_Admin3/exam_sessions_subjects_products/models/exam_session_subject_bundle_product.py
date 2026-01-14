from django.db import models
from .exam_session_subject_bundle import ExamSessionSubjectBundle
from .exam_session_subject_product_variation import ExamSessionSubjectProductVariation

class ExamSessionSubjectBundleProduct(models.Model):
    """
    Maps exam session bundles to their specific product variations.
    Uses ExamSessionSubjectProductVariation to ensure the variation is available for the exam session.
    """
    bundle = models.ForeignKey(
        ExamSessionSubjectBundle,
        on_delete=models.CASCADE,
        related_name='bundle_products',
        help_text="The exam session bundle this product belongs to"
    )
    exam_session_subject_product_variation = models.ForeignKey(
        ExamSessionSubjectProductVariation,
        on_delete=models.CASCADE,
        help_text="The specific exam session product variation included in the bundle"
    )
    default_price_type = models.CharField(
        max_length=20,
        default='standard',
        choices=[
            ('standard', 'Standard'),
            ('retaker', 'Retaker'),
            ('additional', 'Additional Copy'),
        ],
        help_text="Default price type for this product when added via bundle"
    )
    quantity = models.PositiveIntegerField(
        default=1,
        help_text="Number of this product to add when bundle is selected"
    )
    sort_order = models.PositiveIntegerField(
        default=0,
        help_text="Display order of this product within the bundle"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this product is currently active in the bundle"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'acted_exam_session_subject_bundle_products'
        unique_together = ['bundle', 'exam_session_subject_product_variation']
        ordering = ['sort_order', 'exam_session_subject_product_variation__exam_session_subject_product__product__shortname']
        verbose_name = 'Exam Session Bundle Product'
        verbose_name_plural = 'Exam Session Bundle Products'

    def __str__(self):
        espv = self.exam_session_subject_product_variation
        product = espv.exam_session_subject_product.product
        variation = espv.product_product_variation.product_variation
        return f"{self.bundle} → {product.shortname} ({variation.name})"
    
    @property
    def exam_session_subject_product(self):
        """Convenience property to get the exam session subject product"""
        return self.exam_session_subject_product_variation.exam_session_subject_product
    
    @property
    def product(self):
        """Convenience property to get the product"""
        return self.exam_session_subject_product_variation.exam_session_subject_product.product
    
    @property
    def product_variation(self):
        """Convenience property to get the product variation"""
        return self.exam_session_subject_product_variation.product_product_variation.product_variation 