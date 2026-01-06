"""Backward compatibility re-export for ProductBundle and ProductBundleProduct models.

These models have been moved to catalog.models as part of the
catalog consolidation (001-catalog-consolidation).

This module re-exports them for backward compatibility with existing code
that imports from products.models.bundle_product.

DEPRECATED: New code should import from catalog.models instead:
    from catalog.models import ProductBundle, ProductBundleProduct
"""
from catalog.models import ProductBundle, ProductBundleProduct

__all__ = ['ProductBundle', 'ProductBundleProduct']
