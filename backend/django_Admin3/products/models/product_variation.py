from django.db import models

class ProductVariation(models.Model):
    VARIATION_TYPE_CHOICES = [
        ("format", "Format"),
        ("delivery", "Delivery Method"),
    ]
    variation_type = models.CharField(max_length=32, choices=VARIATION_TYPE_CHOICES)
    name = models.CharField(max_length=64)
    description = models.TextField(blank=True, null=True)
    code = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return f"{self.get_variation_type_display()}: {self.name}"

    class Meta:
        db_table = "acted_product_variations"
        unique_together = ("variation_type", "name")
        verbose_name = "Product Variation"
        verbose_name_plural = "Product Variations"
