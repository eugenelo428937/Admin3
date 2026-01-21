"""Products app models package.

Product-related models have been moved to:
    - catalog.models: Product, ProductVariation, ProductBundle, ProductVariationRecommendation, ...
    - filtering.models: FilterGroup, FilterConfiguration, FilterPreset, ...

This package only contains ProductGroupFilter which remains in the products app.
"""
from .product_group_filter import ProductGroupFilter

__all__ = [
    'ProductGroupFilter',
]
