from rest_framework.routers import DefaultRouter
from .views import MarkingPaperViewSet

router = DefaultRouter()
router.register(r'papers', MarkingPaperViewSet, basename='markingpaper')

urlpatterns = router.urls
