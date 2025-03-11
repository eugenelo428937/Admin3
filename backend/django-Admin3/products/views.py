from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from .models import Product
from .serializers import ProductSerializer

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['POST'], url_path='bulk-import')    
    def bulk_import_products(self, request):
        try:
            products_data = request.data.get('products', [])
            created_products = []
            errors = []

            for product_data in products_data:
                serializer = ProductSerializer(data=product_data)
                if serializer.is_valid():
                    serializer.save()
                    created_products.append(serializer.data)
                else:
                    errors.append({
                        'code': product_data.get('code'),
                        'errors': serializer.errors
                    })

            return Response({
                'message': f'Successfully imported {len(created_products)} products',
                'created': created_products,
                'errors': errors
            }, status=status.HTTP_201_CREATED if created_products else status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response({
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
