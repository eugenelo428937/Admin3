from rest_framework.routers import DefaultRouter
from .views import CountryViewSet

router = DefaultRouter()
router.register(r'', CountryViewSet, basename='country')

urlpatterns = router.urls
