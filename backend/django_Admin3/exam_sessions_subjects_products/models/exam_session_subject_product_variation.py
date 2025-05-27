from django.db import models
from .exam_session_subject_product import ExamSessionSubjectProduct
from products.models import ProductProductVariation

class ExamSessionSubjectProductVariation(models.Model):
    exam_session_subject_product = models.ForeignKey(
        ExamSessionSubjectProduct, on_delete=models.CASCADE, related_name="variations"
    )
    product_product_variation = models.ForeignKey(
        ProductProductVariation, on_delete=models.CASCADE
    )
    product_code = models.CharField(max_length=64, blank=True, null=True, help_text="Auto-generated product code for this variation")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "acted_exam_session_subject_product_variations"
        unique_together = ("exam_session_subject_product", "product_product_variation")
        verbose_name = "Exam Session Subject Product Variation"
        verbose_name_plural = "Exam Session Subject Product Variations"

    def save(self, *args, **kwargs):
        # Generate product code if not set
        if not self.product_code:
            subject_code = self.exam_session_subject_product.exam_session_subject.subject.code
            exam_session_code = self.exam_session_subject_product.exam_session_subject.exam_session.code
            product_code = self.exam_session_subject_product.product.code
            variation_code = self.product_product_variation.product_variation.code
            variation = self.product_product_variation.product_variation
            product_name = self.exam_session_subject_product.product.fullname.lower()
            if 'combined' in product_name:
                if variation.variation_type.lower() in ['ebook', 'hub']:
                    prefix = 'C'
                elif variation.variation_type.lower() == 'printed':
                    prefix = 'P'
                else:
                    prefix = variation.variation_type[0].upper()
            else:
                prefix = variation.variation_type[0].upper()
            self.product_code = f"{subject_code}/{prefix}{product_code}{variation_code}/{exam_session_code}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.exam_session_subject_product} - {self.product_product_variation} - {self.product_code}"
