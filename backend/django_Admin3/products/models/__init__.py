"""Products app models package.

Product-related models have been moved to catalog.models as part of the
catalog consolidation (001-catalog-consolidation). They are re-exported
here for backward compatibility.

DEPRECATED: New code should import from the canonical locations:
    - catalog.models: Product, ProductVariation, ProductBundle, ProductVariationRecommendation, ...
    - filtering.models: FilterGroup, FilterConfiguration, FilterPreset, ...
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

# Re-export filtering models for backward compatibility (moved to filtering app)
from filtering.models import (
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
    # Filtering re-exports (deprecated - use filtering.models)
    'FilterGroup',
    'FilterConfiguration',
    'FilterConfigurationGroup',
    'FilterPreset',
    'FilterUsageAnalytics',
]
