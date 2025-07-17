from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.utils import timezone

from .models import MarkingVoucher
from .serializers import (
    MarkingVoucherSerializer, 
    AddMarkingVoucherToCartSerializer
)
from cart.models import Cart
from cart.services import CartService


class MarkingVoucherListView(generics.ListAPIView):
    """
    List all available marking vouchers
    """
    serializer_class = MarkingVoucherSerializer
    
    def get_queryset(self):
        # Only show active vouchers that are currently available
        return MarkingVoucher.objects.filter(
            is_active=True
        ).filter(
            Q(expiry_date__isnull=True) | Q(expiry_date__gte=timezone.now())
        )


class MarkingVoucherDetailView(generics.RetrieveAPIView):
    """
    Get details of a specific marking voucher
    """
    serializer_class = MarkingVoucherSerializer
    
    def get_queryset(self):
        return MarkingVoucher.objects.filter(is_active=True)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_voucher_to_cart(request):
    """
    Add a marking voucher to the user's cart
    """
    serializer = AddMarkingVoucherToCartSerializer(data=request.data)
    if serializer.is_valid():
        voucher_id = serializer.validated_data['voucher_id']
        quantity = serializer.validated_data['quantity']
        
        try:
            voucher = MarkingVoucher.objects.get(id=voucher_id)
            
            # Check if voucher is available
            if not voucher.is_available:
                return Response(
                    {'error': 'Voucher is not available'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get or create cart
            cart, created = Cart.objects.get_or_create(user=request.user)
            
            # Use cart service to add voucher
            cart_service = CartService()
            cart_item = cart_service.add_marking_voucher(cart, voucher_id, quantity)
            
            return Response({
                'message': 'Voucher added to cart successfully',
                'cart_item_id': cart_item.id,
                'quantity': cart_item.quantity,
                'price': str(cart_item.actual_price)
            }, status=status.HTTP_201_CREATED)
            
        except MarkingVoucher.DoesNotExist:
            return Response(
                {'error': 'Voucher not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
