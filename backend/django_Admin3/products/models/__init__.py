"""Products app models package.

Product-related models have been moved to catalog.models as part of the
catalog consolidation (001-catalog-consolidation). They are re-exported
here for backward compatibility.

DEPRECATED: New code should import these from catalog.models instead:
    from catalog.models import Product, ProductVariation, ProductBundle, ...

Models that remain in products app:
    - FilterGroup, FilterConfiguration, FilterConfigurationGroup,
      FilterPreset, FilterUsageAnalytics (filter system)
    - ProductVariationRecommendation
"""
# Re-export catalog models for backward compatibility
from catalog.models import (
    Product,
    ProductVariation,
    ProductProductVariation,
    ProductProductGroup,
    ProductBundle,
    ProductBundleProduct,
)

# Filter system models remain in products app
from .filter_system import (
    FilterGroup,
    FilterConfiguration,
    FilterConfigurationGroup,
    FilterPreset,
    FilterUsageAnalytics,
)

# ProductVariationRecommendation remains in products app
from .product_variation_recommendation import ProductVariationRecommendation

__all__ = [
    # Catalog re-exports (deprecated - use catalog.models)
    'Product',
    'ProductVariation',
    'ProductProductVariation',
    'ProductProductGroup',
    'ProductBundle',
    'ProductBundleProduct',
    # Products app native models
    'ProductVariationRecommendation',
    # Filter system
    'FilterGroup',
    'FilterConfiguration',
    'FilterConfigurationGroup',
    'FilterPreset',
    'FilterUsageAnalytics',
]
