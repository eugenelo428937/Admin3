"""Backward compatibility re-export for Subject model.

The Subject model has been moved to catalog.models as part of the
catalog consolidation (001-catalog-consolidation).

This module re-exports Subject for backward compatibility with existing code.

DEPRECATED: New code should import from catalog.models instead:
    from catalog.models import Subject
"""
from catalog.models import Subject

__all__ = ['Subject']
