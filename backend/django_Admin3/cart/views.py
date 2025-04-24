from django.shortcuts import render
from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import transaction
from .models import Cart, CartItem, ActedOrder, ActedOrderItem
from .serializers import CartSerializer, CartItemSerializer, ActedOrderSerializer
from products.models import Product
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct

class CartViewSet(viewsets.ViewSet):
    """
    API endpoints for cart operations: fetch, add, update, remove items.
    Handles both authenticated users and guests (via session_key).
    """
    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'])
    def get_cart(self, request):
        if request.user.is_authenticated:
            cart, _ = Cart.objects.get_or_create(user=request.user)
        else:
            session_key = request.session.session_key
            if not session_key:
                request.session.save()
                session_key = request.session.session_key
            cart, _ = Cart.objects.get_or_create(session_key=session_key)
        return cart
    
    def list(self, request):
        """GET /cart/ - Get current cart"""
        cart = self.get_cart(request)
        serializer = CartSerializer(cart)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='add')
    def add(self, request):
        """POST /cart/add/ - Add item to cart"""
        cart = self.get_cart(request)
        product_id = request.data.get('product')
        quantity = int(request.data.get('quantity', 1))
        product = get_object_or_404(ExamSessionSubjectProduct, id=product_id)
        item, created = CartItem.objects.get_or_create(cart=cart, product=product)
        if not created:
            item.quantity += quantity
        else:
            item.quantity = quantity
        item.save()
        return Response(CartSerializer(cart).data)

    @action(detail=False, methods=['patch'], url_path='update_item')
    def update_item(self, request):
        """PATCH /cart/update_item/ - Update quantity of a cart item"""
        cart = self.get_cart(request)
        item_id = request.data.get('item_id')
        quantity = int(request.data.get('quantity', 1))
        item = get_object_or_404(CartItem, id=item_id, cart=cart)
        item.quantity = quantity
        item.save()
        return Response(CartSerializer(cart).data)

    @action(detail=False, methods=['delete'], url_path='remove')
    def remove(self, request):
        """DELETE /cart/remove/ - Remove item from cart"""
        cart = self.get_cart(request)
        item_id = request.data.get('item_id')
        item = get_object_or_404(CartItem, id=item_id, cart=cart)
        item.delete()
        return Response(CartSerializer(cart).data)

    @action(detail=False, methods=['post'], url_path='clear')
    def clear(self, request):
        """POST /cart/clear/ - Remove all items from cart"""
        cart = self.get_cart(request)
        cart.items.all().delete()
        return Response(CartSerializer(cart).data)

    @action(detail=False, methods=['post'], url_path='checkout', permission_classes=[IsAuthenticated])
    def checkout(self, request):
        """POST /cart/checkout/ - Create an order from the authenticated user's cart"""
        user = request.user
        cart = self.get_cart(request)
        if not cart.items.exists():
            return Response({'detail': 'Cart is empty.'}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            order = ActedOrder.objects.create(user=user)
            for item in cart.items.all():
                ActedOrderItem.objects.create(
                    order=order,
                    product=item.product,
                    quantity=item.quantity
                )
            cart.items.all().delete()
        serializer = ActedOrderSerializer(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='orders', permission_classes=[IsAuthenticated])
    def orders(self, request):
        """GET /cart/orders/ - Get order history for the authenticated user"""
        user = request.user
        orders = ActedOrder.objects.filter(user=user).order_by('-created_at')
        serializer = ActedOrderSerializer(orders, many=True)
        return Response(serializer.data)

    def merge_guest_cart(self, request, user):
        """
        Merge guest cart (by session_key) into user's cart after login.
        Call this after successful login.
        """
        session_key = request.session.session_key
        if not session_key:
            return
        try:
            guest_cart = Cart.objects.get(session_key=session_key, user__isnull=True)
        except Cart.DoesNotExist:
            return
        user_cart, _ = Cart.objects.get_or_create(user=user)
        for item in guest_cart.items.all():
            user_item, created = CartItem.objects.get_or_create(cart=user_cart, product=item.product)
            if not created:
                user_item.quantity += item.quantity
            else:
                user_item.quantity = item.quantity
            user_item.save()
        guest_cart.delete()
