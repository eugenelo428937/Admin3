"""ProductVariation model for the catalog app.

Migrated from products/models/product_variation.py to catalog/models/product_variation.py.
Table: acted.catalog_product_variations
"""
from django.db import models


class ProductVariation(models.Model):
    """
    Stores variation types for products (eBook, Printed, Hub, Marking, Tutorial).

    Product variations define the different formats or delivery methods available
    for products. A single :model:`catalog.Product` can have multiple variations
    (e.g., eBook and Printed versions of the same study material). The association
    is managed through :model:`catalog.ProductProductVariation`.

    **Variation Types**:

    - **eBook**: Digital downloadable content
    - **Printed**: Physical printed materials
    - **Hub**: Online learning hub access
    - **Marking**: Mock exam marking service
    - **Tutorial**: Live tutorial sessions

    **Related Models**:

    - :model:`catalog.Product` - Products this variation applies to
    - :model:`catalog.ProductProductVariation` - Product-variation assignments
    - :model:`exam_sessions_subjects_products.ExamSessionSubjectProductVariation` - Session availability

    **Usage Example**::

        ebook_variations = ProductVariation.objects.filter(variation_type='eBook')
    """

    VARIATION_TYPE_CHOICES = [
        ("eBook", "eBook"),
        ("Hub", "Hub"),
        ("Printed", "Printed"),
        ("Marking", "Marking"),
        ("Tutorial", "Tutorial"),
    ]

    variation_type = models.CharField(
        max_length=32,
        choices=VARIATION_TYPE_CHOICES,
        help_text="Type of product variation"
    )
    name = models.CharField(
        max_length=64,
        help_text="Variation name (e.g., 'Standard eBook', 'Premium Printed')"
    )
    description = models.TextField(
        blank=True,
        null=True,
        help_text="Full description of this variation"
    )
    description_short = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Short description for display purposes"
    )
    code = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        null=True,
        help_text="Unique variation code"
    )

    def __str__(self):
        return f"{self.get_variation_type_display()}: {self.name}"

    class Meta:
        db_table = '"acted"."catalog_product_variations"'
        unique_together = ('variation_type', 'name')
        verbose_name = 'Product Variation'
        verbose_name_plural = 'Product Variations'
