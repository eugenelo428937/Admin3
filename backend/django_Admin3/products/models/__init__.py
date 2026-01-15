"""Products app models package.

Product-related models have been moved to catalog.models as part of the
catalog consolidation (001-catalog-consolidation). They are re-exported
here for backward compatibility.

DEPRECATED: New code should import these from catalog.models instead:
    from catalog.models import Product, ProductVariation, ProductBundle, ProductVariationRecommendation, ...

Models that remain in products app:
    - FilterGroup, FilterConfiguration, FilterConfigurationGroup,
      FilterPreset, FilterUsageAnalytics (filter system - to be moved to filtering app)
"""
# Re-export catalog models for backward compatibility
from catalog.models import (
    Product,
    ProductVariation,
    ProductProductVariation,
    ProductProductGroup,
    ProductBundle,
    ProductBundleProduct,
    ProductVariationRecommendation,
)

# Filter system models remain in products app (until filtering app created)
from .filter_system import (
    FilterGroup,
    FilterConfiguration,
    FilterConfigurationGroup,
    FilterPreset,
    FilterUsageAnalytics,
)

__all__ = [
    # Catalog re-exports (deprecated - use catalog.models)
    'Product',
    'ProductVariation',
    'ProductProductVariation',
    'ProductProductGroup',
    'ProductBundle',
    'ProductBundleProduct',
    'ProductVariationRecommendation',
    # Filter system (to be moved to filtering app)
    'FilterGroup',
    'FilterConfiguration',
    'FilterConfigurationGroup',
    'FilterPreset',
    'FilterUsageAnalytics',
]
