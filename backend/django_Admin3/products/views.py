from rest_framework import viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .models import Product, ProductCategory, ProductSubcategory
from .models.product_main_category import ProductMainCategory
from .serializers import ProductSerializer, ProductCategorySerializer, ProductSubcategorySerializer, ProductMainCategoryHierarchySerializer
from rest_framework import status

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        category_id = self.request.query_params.get('category')
        if category_id:
            queryset = queryset.filter(product_category_id=category_id)
        return queryset
    
    @action(detail=False, methods=['post'], url_path='bulk-import')
    def bulk_import_products(self, request):
        products_data = request.data.get('products', [])
        created = []
        errors = []

        for product_data in products_data:
            serializer = self.get_serializer(data=product_data)
            if serializer.is_valid():
                serializer.save()
                created.append(serializer.data)
            else:
                errors.append({
                    'data': product_data,
                    'errors': serializer.errors
                })

        return Response({
            'created': created,
            'errors': errors
        }, status=status.HTTP_400_BAD_REQUEST if errors else status.HTTP_201_CREATED)

class ProductCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ProductCategory.objects.all()
    serializer_class = ProductCategorySerializer
    permission_classes = [AllowAny]

    @action(detail=True, methods=['get'], url_path='subcategories')
    def subcategories(self, request, pk=None):
        subcategories = ProductSubcategory.objects.filter(product_category_id=pk)
        serializer = ProductSubcategorySerializer(subcategories, many=True)
        return Response(serializer.data)

class ProductSubcategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ProductSubcategory.objects.all()
    serializer_class = ProductSubcategorySerializer
    permission_classes = [AllowAny]

@api_view(['GET'])
@permission_classes([AllowAny])
def all_product_categories(request):
    queryset = ProductMainCategory.objects.order_by('name')
    serializer = ProductMainCategoryHierarchySerializer(queryset, many=True)
    return Response({'results': serializer.data})
