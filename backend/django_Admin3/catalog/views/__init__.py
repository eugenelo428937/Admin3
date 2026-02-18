"""
Catalog views package.

Re-exports all catalog views for convenient imports:
    from catalog.views import SubjectViewSet, ProductViewSet

ViewSet modules:
- subject_views: SubjectViewSet
- exam_session_views: ExamSessionViewSet
- product_views: ProductViewSet
- bundle_views: BundleViewSet
- navigation_views: navigation_data, fuzzy_search, advanced_product_search
"""

# ViewSet imports
from .subject_views import SubjectViewSet
from .exam_session_views import ExamSessionViewSet
from .product_views import ProductViewSet
from .bundle_views import BundleViewSet

# Admin ViewSet imports
from .exam_session_subject_views import ExamSessionSubjectViewSet
from .product_variation_views import ProductVariationViewSet, ProductProductVariationViewSet
from .product_bundle_views import ProductBundleAdminViewSet, ProductBundleProductViewSet
from .recommendation_views import RecommendationViewSet
from .subject_admin_views import SubjectAdminViewSet

# Function-based view imports
from .navigation_views import navigation_data, fuzzy_search, advanced_product_search

__all__ = [
    # ViewSets
    'SubjectViewSet',
    'ExamSessionViewSet',
    'ProductViewSet',
    'BundleViewSet',
    # Admin ViewSets
    'ExamSessionSubjectViewSet',
    'ProductVariationViewSet',
    'ProductProductVariationViewSet',
    'ProductBundleAdminViewSet',
    'ProductBundleProductViewSet',
    'RecommendationViewSet',
    'SubjectAdminViewSet',
    # Function-based views
    'navigation_data',
    'fuzzy_search',
    'advanced_product_search',
]
