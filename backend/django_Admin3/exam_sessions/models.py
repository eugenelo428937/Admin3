"""Backward compatibility re-export for ExamSession model.

The ExamSession model has been moved to catalog.models as part of the
catalog consolidation (001-catalog-consolidation).

This module re-exports ExamSession for backward compatibility with existing code.

DEPRECATED: New code should import from catalog.models instead:
    from catalog.models import ExamSession
"""
from catalog.models import ExamSession

__all__ = ['ExamSession']
