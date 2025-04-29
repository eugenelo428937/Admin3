from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .models import Product, ProductType, ProductSubtype
from .serializers import ProductSerializer, ProductTypeSerializer, ProductSubtypeSerializer
from rest_framework import status

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]
    
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

class ProductTypeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ProductType.objects.all()
    serializer_class = ProductTypeSerializer
    permission_classes = [AllowAny]

    @action(detail=True, methods=['get'], url_path='subtypes')
    def subtypes(self, request, pk=None):
        subtypes = ProductSubtype.objects.filter(product_type_id=pk)
        serializer = ProductSubtypeSerializer(subtypes, many=True)
        return Response(serializer.data)

class ProductSubtypeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ProductSubtype.objects.all()
    serializer_class = ProductSubtypeSerializer
    permission_classes = [AllowAny]
