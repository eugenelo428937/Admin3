"""
Exam sessions serializers - DEPRECATED.

This module is a thin wrapper that re-exports from catalog.serializers for backward compatibility.
All business logic has been migrated to the catalog app as part of API consolidation.

DEPRECATION NOTICE:
- New code should import from catalog.serializers directly
- This module will be removed in a future release
- Migration path: `from catalog.serializers import ExamSessionSerializer`

See: specs/002-catalog-api-consolidation/
"""
import warnings

# Re-export from catalog for backward compatibility
from catalog.serializers import ExamSessionSerializer

# Emit deprecation warning on import
warnings.warn(
    "Importing ExamSessionSerializer from exam_sessions.serializers is deprecated. "
    "Use 'from catalog.serializers import ExamSessionSerializer' instead.",
    DeprecationWarning,
    stacklevel=2
)

__all__ = ['ExamSessionSerializer']
