from django.db import models
from django.core.exceptions import ValidationError


class ProductVariationRecommendation(models.Model):
    """
    Recommendation relationship between product-variation combinations.

    Each product-variation combination can recommend at most one complementary product
    (one-to-one relationship on source). Multiple products can recommend
    the same target product (many-to-one on target).

    Example: Mock Exam eBook (ProductProductVariation) → Mock Exam Marking Service (ProductProductVariation)

    Note: References ProductProductVariation (junction table) not ProductVariation (generic types),
    because we recommend specific product offerings, not generic variation types.
    """

    product_product_variation = models.OneToOneField(
        'catalog.ProductProductVariation',
        on_delete=models.CASCADE,
        related_name='recommendation',
        help_text="Source product-variation combination that makes the recommendation"
    )

    recommended_product_product_variation = models.ForeignKey(
        'catalog.ProductProductVariation',
        on_delete=models.CASCADE,
        related_name='recommended_by',
        help_text="Recommended complementary product-variation combination"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'acted_product_productvariation_recommendations'
        indexes = [
            models.Index(fields=['product_product_variation']),
            models.Index(fields=['recommended_product_product_variation']),
        ]
        verbose_name = 'Product Variation Recommendation'
        verbose_name_plural = 'Product Variation Recommendations'

    def clean(self):
        """
        Validate business rules:
        1. A product-variation combination cannot recommend itself (self-reference)
        2. Circular recommendations are not allowed (A→B, B→A)
        """
        super().clean()

        # Prevent self-reference
        if self.product_product_variation_id == self.recommended_product_product_variation_id:
            raise ValidationError("A product-variation combination cannot recommend itself.")

        # Prevent circular recommendations
        if ProductVariationRecommendation.objects.filter(
            product_product_variation=self.recommended_product_product_variation,
            recommended_product_product_variation=self.product_product_variation
        ).exists():
            raise ValidationError(
                "Circular recommendation detected: "
                f"{self.recommended_product_product_variation} already recommends "
                f"{self.product_product_variation}"
            )

    def save(self, *args, **kwargs):
        """Override save to call clean() for validation."""
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        ppv = self.product_product_variation
        rec_ppv = self.recommended_product_product_variation
        return f"{ppv.product.shortname} {ppv.product_variation.name} → {rec_ppv.product.shortname} {rec_ppv.product_variation.name}"
