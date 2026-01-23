from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny

from .models import CartItem
from .serializers import CartSerializer
from .services.cart_service import cart_service

import logging

logger = logging.getLogger(__name__)


class CartViewSet(viewsets.ViewSet):
    """Cart API — delegates all business logic to CartService."""
    permission_classes = [AllowAny]

    def list(self, request):
        """GET /cart/ - Get current cart."""
        cart = cart_service.get_or_create(request)
        serializer = CartSerializer(cart, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='add')
    def add(self, request):
        """POST /cart/add/ - Add item to cart."""
        cart = cart_service.get_or_create(request)
        product_id = request.data.get('current_product')
        quantity = int(request.data.get('quantity', 1))
        price_type = request.data.get('price_type', 'standard')
        actual_price = request.data.get('actual_price')
        metadata = request.data.get('metadata', {})

        item, error = cart_service.add_item(
            cart, product_id, quantity, price_type, actual_price, metadata
        )
        if error:
            return Response({'detail': error}, status=status.HTTP_404_NOT_FOUND)

        cart.refresh_from_db()
        serializer = CartSerializer(cart, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['patch'], url_path='update_item')
    def update_item(self, request):
        """PATCH /cart/update_item/ - Update cart item."""
        cart = cart_service.get_or_create(request)
        item_id = request.data.get('item_id')

        try:
            cart_service.update_item(
                cart, item_id,
                quantity=request.data.get('quantity'),
                metadata=request.data.get('metadata'),
                actual_price=request.data.get('actual_price'),
                price_type=request.data.get('price_type'),
            )
        except CartItem.DoesNotExist:
            return Response({'detail': 'Item not found.'}, status=status.HTTP_404_NOT_FOUND)

        cart.refresh_from_db()
        serializer = CartSerializer(cart, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['delete'], url_path='remove')
    def remove(self, request):
        """DELETE /cart/remove/ - Remove item from cart."""
        cart = cart_service.get_or_create(request)
        item_id = request.data.get('item_id')

        try:
            cart_service.remove_item(cart, item_id)
        except CartItem.DoesNotExist:
            return Response({'detail': 'Item not found.'}, status=status.HTTP_404_NOT_FOUND)

        cart.refresh_from_db()
        serializer = CartSerializer(cart, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='clear')
    def clear(self, request):
        """POST /cart/clear/ - Remove all items from cart."""
        cart = cart_service.get_or_create(request)
        cart_service.clear(cart)

        cart.refresh_from_db()
        serializer = CartSerializer(cart, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='vat/recalculate')
    def vat_recalculate(self, request):
        """POST /cart/vat/recalculate/ - Force fresh VAT calculation."""
        cart = cart_service.get_or_create(request)
        cart_service._trigger_vat_calculation(cart)

        cart.refresh_from_db()
        serializer = CartSerializer(cart, context={'request': request})
        return Response(serializer.data)
