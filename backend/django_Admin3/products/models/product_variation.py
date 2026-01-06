"""Backward compatibility re-export for ProductVariation model.

This model has been moved to catalog.models as part of the
catalog consolidation (001-catalog-consolidation).

This module re-exports it for backward compatibility with existing code
that imports from products.models.product_variation.

DEPRECATED: New code should import from catalog.models instead:
    from catalog.models import ProductVariation
"""
from catalog.models import ProductVariation

__all__ = ['ProductVariation']
