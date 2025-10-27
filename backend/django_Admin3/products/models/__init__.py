# products/models/__init__.py
from django.db import models

from .products import Product, ProductVariation, ProductProductGroup
from .bundle_product import ProductBundle, ProductBundleProduct
from .product_variation_recommendation import ProductVariationRecommendation

# Import filter system models
from .filter_system import (
    FilterGroup, 
    FilterConfiguration, 
    FilterConfigurationGroup,
    FilterPreset, 
    FilterUsageAnalytics
)


class ProductProductVariation(models.Model):
    """Junction table for product variations"""
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    product_variation = models.ForeignKey(ProductVariation, on_delete=models.CASCADE)
    
    class Meta:
        unique_together = ("product", "product_variation")
        db_table = "acted_product_productvariation"
        verbose_name = "Product Product Variation"
        verbose_name_plural = "Product Product Variations"


# Updated __all__ to include filter system models
__all__ = [
    'Product', 'ProductVariation', 'ProductProductVariation', 'ProductProductGroup',
    'ProductBundle', 'ProductBundleProduct',
    'ProductVariationRecommendation',
    # Filter system
    'FilterGroup', 'FilterConfiguration', 'FilterConfigurationGroup', 'FilterPreset', 'FilterUsageAnalytics'
]
