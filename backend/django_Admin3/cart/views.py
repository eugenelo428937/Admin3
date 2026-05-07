from django.core.exceptions import ValidationError as DjangoValidationError

from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny

from .models import Cart, CartItem
from .serializers import CartSerializer
from .services.cart_service import cart_service

import logging

logger = logging.getLogger(__name__)


def _validation_error_payload(exc):
    """Convert a django ValidationError to a JSON-friendly dict.

    Cart-service tutorial validation (auth gate, invalid rank, OC,
    subject mismatch, missing student) raises
    ``django.core.exceptions.ValidationError`` — surface those as 400
    responses with the original message(s) instead of letting them
    bubble up as 500s through the default DRF handler.
    """
    if hasattr(exc, 'message_dict'):
        return exc.message_dict
    if hasattr(exc, 'messages'):
        return {'detail': exc.messages}
    return {'detail': str(exc)}


def _hydrate_cart_for_read(cart):
    """Re-fetch a Cart instance with prefetches optimised for serialization.

    Task 9: avoids N+1 on the new ``items.tutorial_choices`` reverse relation
    while also covering the existing items/fees collections so a single read
    response stays cheap.
    """
    return (
        Cart.objects
        .prefetch_related(
            'items',
            'fees',
            'items__tutorial_choices__tutorial_event__store_product__exam_session_subject__subject',
            'items__tutorial_choices__student',
        )
        .get(pk=cart.pk)
    )


class CartViewSet(viewsets.ViewSet):
    """Cart API — delegates all business logic to CartService."""
    permission_classes = [AllowAny]

    def list(self, request):
        """GET /cart/ - Get current cart."""
        cart = cart_service.get_or_create(request)
        cart = _hydrate_cart_for_read(cart)
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

        try:
            item, error = cart_service.add_item(
                cart, product_id, quantity, price_type, actual_price, metadata
            )
        except DjangoValidationError as exc:
            # Surface tutorial-path validation errors as 400 instead of
            # letting them bubble to a 500 (no DRF EXCEPTION_HANDLER is
            # configured for django.core.exceptions.ValidationError).
            return Response(_validation_error_payload(exc),
                            status=status.HTTP_400_BAD_REQUEST)
        if error == "product_unavailable":
            return Response(
                {'error': 'product_unavailable',
                 'detail': 'This product is no longer available for purchase.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if error:
            return Response({'detail': error}, status=status.HTTP_404_NOT_FOUND)

        cart.refresh_from_db()
        cart = _hydrate_cart_for_read(cart)
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
        except DjangoValidationError as exc:
            return Response(_validation_error_payload(exc),
                            status=status.HTTP_400_BAD_REQUEST)

        cart.refresh_from_db()
        cart = _hydrate_cart_for_read(cart)
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
        cart = _hydrate_cart_for_read(cart)
        serializer = CartSerializer(cart, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='clear')
    def clear(self, request):
        """POST /cart/clear/ - Remove all items from cart."""
        cart = cart_service.get_or_create(request)
        cart_service.clear(cart)

        cart.refresh_from_db()
        cart = _hydrate_cart_for_read(cart)
        serializer = CartSerializer(cart, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='vat/recalculate')
    def vat_recalculate(self, request):
        """POST /cart/vat/recalculate/ - Force fresh VAT calculation."""
        cart = cart_service.get_or_create(request)
        cart_service._trigger_vat_calculation(cart)

        cart.refresh_from_db()
        cart = _hydrate_cart_for_read(cart)
        serializer = CartSerializer(cart, context={'request': request})
        return Response(serializer.data)
