"""
URL configuration for the catalog API.

Endpoints:
- /api/catalog/subjects/          - Subject CRUD (SubjectViewSet)
- /api/catalog/exam-sessions/     - ExamSession CRUD (ExamSessionViewSet)
- /api/catalog/products/          - Product CRUD (ProductViewSet)
- /api/catalog/bundles/           - Bundle list/detail (BundleViewSet)
- /api/catalog/navigation-data/   - Combined navigation data
- /api/catalog/search/            - Fuzzy search
- /api/catalog/advanced-search/   - Advanced product search

URL Naming Convention:
- Router endpoints use hyphenated paths (e.g., exam-sessions, not exam_sessions)
- Function-based views use hyphenated paths (e.g., navigation-data)
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

# ViewSet imports
from .views import (
    SubjectViewSet,
    ExamSessionViewSet,
    ProductViewSet,
    BundleViewSet,
    ExamSessionSubjectViewSet,
    ProductVariationViewSet,
    ProductProductVariationViewSet,
    ProductBundleAdminViewSet,
    ProductBundleProductViewSet,
    RecommendationViewSet,
    SubjectAdminViewSet,
    SessionSetupViewSet,
    navigation_data,
    fuzzy_search,
    advanced_product_search,
)

app_name = 'catalog'

# Create router and register ViewSets
router = DefaultRouter()
router.register(r'subjects', SubjectViewSet, basename='subject')
router.register(r'exam-sessions', ExamSessionViewSet, basename='exam-session')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'bundles', BundleViewSet, basename='bundle')
router.register(r'exam-session-subjects', ExamSessionSubjectViewSet, basename='exam-session-subject')
router.register(r'product-variations', ProductVariationViewSet, basename='product-variation')
router.register(r'product-product-variations', ProductProductVariationViewSet, basename='product-product-variation')
router.register(r'product-bundles', ProductBundleAdminViewSet, basename='product-bundle')
router.register(r'bundle-products', ProductBundleProductViewSet, basename='bundle-product')
router.register(r'recommendations', RecommendationViewSet, basename='recommendation')
router.register(r'admin-subjects', SubjectAdminViewSet, basename='admin-subject')
router.register(r'session-setup', SessionSetupViewSet, basename='session-setup')

urlpatterns = [
    # Function-based views
    path('navigation-data/', navigation_data, name='navigation-data'),
    path('search/', fuzzy_search, name='fuzzy-search'),
    path('advanced-search/', advanced_product_search, name='advanced-search'),

    # Router URLs (ViewSets)
    path('', include(router.urls)),
]
