"""
Exam sessions views - DEPRECATED.

This module is a thin wrapper that re-exports from catalog.views for backward compatibility.
All business logic has been migrated to the catalog app as part of API consolidation.

DEPRECATION NOTICE:
- New code should import from catalog.views directly
- This module will be removed in a future release
- Migration path: `from catalog.views import ExamSessionViewSet`

See: specs/002-catalog-api-consolidation/
"""
import warnings

# Re-export from catalog for backward compatibility
from catalog.views import ExamSessionViewSet

# Emit deprecation warning on import
warnings.warn(
    "Importing ExamSessionViewSet from exam_sessions.views is deprecated. "
    "Use 'from catalog.views import ExamSessionViewSet' instead.",
    DeprecationWarning,
    stacklevel=2
)

__all__ = ['ExamSessionViewSet']
