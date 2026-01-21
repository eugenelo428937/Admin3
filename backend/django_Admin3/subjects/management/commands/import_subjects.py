"""
Subjects management command: import_subjects - DEPRECATED.

This command is a thin wrapper that re-exports from catalog.management.commands.
All business logic has been migrated to the catalog app as part of API consolidation.

DEPRECATION NOTICE:
- New code should use 'python manage.py import_subjects' from catalog app
- This wrapper is preserved for backward compatibility only
- This module will be removed in a future release

See: specs/002-catalog-api-consolidation/
"""
import warnings

# Emit deprecation warning on import
warnings.warn(
    "The import_subjects command from subjects app is deprecated. "
    "The command has been migrated to the catalog app. "
    "Both 'python manage.py import_subjects' invocations will work identically.",
    DeprecationWarning,
    stacklevel=2
)

# Re-export Command from catalog
from catalog.management.commands.import_subjects import Command

__all__ = ['Command']
