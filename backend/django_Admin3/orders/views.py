from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from cart.models import Cart
from orders.models import Order
from orders.serializers.order_serializer import OrderSerializer, OrderDetailSerializer
from orders.services.checkout_orchestrator import (
    CheckoutOrchestrator,
    CheckoutValidationError,
    CheckoutBlockedError,
    PaymentFailedError,
)


class CheckoutView(APIView):
    """POST /api/orders/checkout/ — Convert cart to order."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        try:
            cart = Cart.objects.get(user=user)
        except Cart.DoesNotExist:
            return Response(
                {'detail': 'No cart found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        orchestrator = CheckoutOrchestrator(
            cart=cart,
            user=user,
            request_data=request.data,
            request=request,
        )

        try:
            result = orchestrator.execute()
        except CheckoutValidationError as e:
            return Response(
                {'detail': str(e), 'success': False},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except CheckoutBlockedError as e:
            return Response(
                {
                    'detail': str(e),
                    'blocked': True,
                    'required_acknowledgments': e.required_acknowledgments,
                    'success': False,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except PaymentFailedError as e:
            return Response(
                {
                    'detail': f"Payment failed: {str(e)}",
                    'error_code': e.error_code,
                    'success': False,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        order = result['order']
        payment_result = result['payment_result']

        return Response({
            'success': True,
            'order': OrderSerializer(order).data,
            'payment': {
                'payment_id': payment_result.payment_id,
                'transaction_id': payment_result.transaction_id,
                'message': payment_result.message,
            },
        }, status=status.HTTP_201_CREATED)


class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/orders/ and GET /api/orders/{id}/ — Order history."""
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return OrderDetailSerializer
        return OrderSerializer
