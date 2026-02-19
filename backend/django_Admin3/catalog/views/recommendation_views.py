"""ProductVariationRecommendation views for the catalog admin API."""
from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from catalog.models import ProductVariationRecommendation
from catalog.permissions import IsSuperUser
from catalog.serializers import RecommendationAdminSerializer, RecommendationListSerializer


class RecommendationViewSet(viewsets.ModelViewSet):
    """CRUD ViewSet for ProductVariationRecommendation.

    Read operations: AllowAny
    Write operations: IsSuperUser
    """
    queryset = ProductVariationRecommendation.objects.select_related(
        'product_product_variation__product',
        'product_product_variation__product_variation',
        'recommended_product_product_variation__product',
        'recommended_product_product_variation__product_variation',
    ).all()

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsSuperUser]
        return [permission() for permission in permission_classes]

    def get_serializer_class(self):
        if self.action == 'list':
            return RecommendationListSerializer
        return RecommendationAdminSerializer
