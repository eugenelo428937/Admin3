"""
DEPRECATED: This module is deprecated in favor of the store app.

Migration Guide:
- ExamSessionSubjectProduct → Use store.Product instead
- ExamSessionSubjectProductVariation → Use store.Product instead
- Price → Use store.Price instead

The store app provides a simplified two-table structure with direct FK relationships,
eliminating the ESSP intermediate table and reducing query joins.

These re-exports are maintained for backward compatibility with existing code
(cart, orders) that hasn't been migrated yet.
"""
import warnings

from .models.exam_session_subject_product import ExamSessionSubjectProduct
from .models.exam_session_subject_product_variation import ExamSessionSubjectProductVariation
from .models.price import Price


def _emit_deprecation_warning(model_name: str, new_model: str):
    """Emit a deprecation warning for legacy model usage."""
    warnings.warn(
        f"{model_name} is deprecated. Use {new_model} from store.models instead. "
        f"See exam_sessions_subjects_products/models.py for migration guide.",
        DeprecationWarning,
        stacklevel=3
    )


# Re-export with deprecation notices
__all__ = [
    'ExamSessionSubjectProduct',
    'ExamSessionSubjectProductVariation',
    'Price',
]

# Note: Deprecation warnings are not emitted on import to avoid noise
# during the transition period. Use the new store models for new code.
