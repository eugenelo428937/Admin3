from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TutorialEventViewSet, TutorialEventListView, TutorialProductListView, TutorialProductVariationListView, TutorialProductListAllView, TutorialViewSet, get_all_tutorial_products, get_tutorial_product_variations, clear_tutorial_cache

router = DefaultRouter()
router.register(r'events', TutorialEventViewSet)
router.register(r'events', TutorialViewSet, basename='tutorial-event')

urlpatterns = [
    path('list/', TutorialEventListView.as_view(), name='tutorial-event-list'),
    path('products/', TutorialProductListView.as_view(), name='tutorial-products'),
    path('products/all/', TutorialProductListAllView.as_view(), name='tutorial-products-all'),
    path('products/<int:product_id>/variations/', TutorialProductVariationListView.as_view(), name='tutorial-product-variations'),
    path('cache/clear/', clear_tutorial_cache, name='tutorial-cache-clear'),
] + router.urls
