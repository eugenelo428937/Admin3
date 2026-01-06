"""Backward compatibility re-export for Product and ProductProductGroup models.

These models have been moved to catalog.models as part of the
catalog consolidation (001-catalog-consolidation).

This module re-exports them for backward compatibility with existing code
that imports from products.models.products.

DEPRECATED: New code should import from catalog.models instead:
    from catalog.models import Product, ProductProductGroup
"""
from catalog.models import Product, ProductProductGroup

# Also re-export ProductVariation for files that import it from here
from catalog.models import ProductVariation

__all__ = ['Product', 'ProductProductGroup', 'ProductVariation']
