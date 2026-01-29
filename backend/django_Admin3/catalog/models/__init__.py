"""Catalog models package.

ExamSessionSubject and ExamSessionSubjectProduct live in the catalog parent app.
Other models have been moved to nested apps or other apps:
    - ExamSession: catalog.exam_session.models
    - Subject: catalog.subject.models
    - Product, ProductVariation, ProductProductVariation: catalog.products.models
    - ProductBundle, ProductBundleProduct: catalog.products.bundle.models
    - ProductVariationRecommendation: catalog.products.recommendation.models
    - ProductProductGroup: filtering.models (junction table for filtering)

Note: For backward compatibility during migration, we re-export models
from their new locations. New code should import directly from nested apps.
"""
from .exam_session_subject import ExamSessionSubject

# Re-export from nested apps for backward compatibility during migration
from catalog.exam_session.models import ExamSession
from catalog.subject.models import Subject

# Product models - now in nested apps
from catalog.products.models import Product, ProductVariation, ProductProductVariation
from catalog.products.bundle.models import ProductBundle, ProductBundleProduct
from catalog.products.recommendation.models import ProductVariationRecommendation

# Re-export from filtering app for backward compatibility
from filtering.models import ProductProductGroup

# Models staying in catalog app
from .exam_session_subject_product import ExamSessionSubjectProduct

__all__ = [
    'ExamSessionSubject',
    # Re-exported from nested apps (use new import paths in new code)
    'ExamSession',
    'Subject',
    # Product models (from catalog.products nested apps)
    'Product',
    'ProductVariation',
    'ProductProductVariation',
    'ProductBundle',
    'ProductBundleProduct',
    'ProductVariationRecommendation',
    # Re-exported from filtering app
    'ProductProductGroup',
    # Models staying in catalog
    'ExamSessionSubjectProduct',
]
