from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import transaction
from .engine import rules_engine, evaluate_checkout_rules, evaluate_cart_add_rules
from .models import Rule, MessageTemplate, UserAcknowledgment, HolidayCalendar
from .serializers import (
    RuleSerializer, MessageTemplateSerializer, UserAcknowledgmentSerializer,
    HolidayCalendarSerializer
)
import logging
from django.utils import timezone

logger = logging.getLogger(__name__)


class RulesEngineViewSet(viewsets.ViewSet):
    """
    API endpoints for rules engine operations
    """
    permission_classes = [AllowAny]

    @action(detail=False, methods=['post'], url_path='evaluate')
    def evaluate_rules(self, request):
        """POST /rules/evaluate/ - Evaluate rules for a given trigger"""
        try:
            trigger_type = request.data.get('trigger_type')
            if not trigger_type:
                return Response(
                    {'error': 'trigger_type is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            user = request.user if request.user.is_authenticated else None
            context_data = request.data.get('context', {})
            
            # Special handling for cart-related triggers
            if trigger_type == 'checkout_start' and 'cart_items' in context_data:
                # Get cart items from the cart service
                from cart.models import CartItem
                cart_item_ids = context_data.get('cart_items', [])
                cart_items = list(CartItem.objects.filter(id__in=cart_item_ids).select_related('product', 'product__product'))
                result = evaluate_checkout_rules(user, cart_items, **context_data)
            else:
                result = rules_engine.evaluate_rules(trigger_type, user, **context_data)
                
            return Response(result)
            
        except Exception as e:
            logger.error(f"Error evaluating rules: {str(e)}")
            return Response(
                {'error': 'Internal server error', 'details': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='acknowledge', permission_classes=[IsAuthenticated])
    def acknowledge_rule(self, request):
        """POST /rules/acknowledge/ - Acknowledge a rule or select an optional rule"""
        try:
            rule_id = request.data.get('rule_id')
            template_id = request.data.get('template_id')
            acknowledgment_type = request.data.get('acknowledgment_type', 'required')
            is_selected = request.data.get('is_selected', True)
            
            if not rule_id:
                return Response(
                    {'error': 'rule_id is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            rule = get_object_or_404(Rule, id=rule_id)
            message_template = None
            if template_id:
                message_template = get_object_or_404(MessageTemplate, id=template_id)

            # Get client IP and user agent for tracking
            ip_address = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0] or \
                        request.META.get('REMOTE_ADDR', '')
            user_agent = request.META.get('HTTP_USER_AGENT', '')

            # Create or update acknowledgment
            acknowledgment, created = UserAcknowledgment.objects.update_or_create(
                user=request.user,
                rule=rule,
                message_template=message_template,
                defaults={
                    'acknowledgment_type': acknowledgment_type,
                    'is_selected': is_selected,
                    'ip_address': ip_address,
                    'user_agent': user_agent,
                    'session_data': {
                        'request_data': request.data,
                        'timestamp': timezone.now().isoformat()
                    }
                }
            )

            action = "created" if created else "updated"
            return Response({
                'success': True,
                'message': f'Rule acknowledgment {action} successfully',
                'acknowledgment_id': acknowledgment.id,
                'acknowledgment_type': acknowledgment_type,
                'is_selected': is_selected
            })

        except Exception as e:
            logger.error(f"Error acknowledging rule: {str(e)}")
            return Response(
                {'error': 'Internal server error', 'details': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='pending-acknowledgments', permission_classes=[IsAuthenticated])
    def pending_acknowledgments(self, request):
        """GET /rules/pending-acknowledgments/ - Get pending acknowledgments"""
        try:
            trigger_type = request.query_params.get('trigger_type')
            pending = rules_engine.get_pending_acknowledgments(request.user, trigger_type)
            
            return Response({
                'success': True,
                'pending_acknowledgments': pending
            })
            
        except Exception as e:
            logger.error(f"Error getting pending acknowledgments: {str(e)}")
            return Response(
                {'error': 'Internal server error', 'details': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='checkout-validation', permission_classes=[IsAuthenticated])
    def checkout_validation(self, request):
        """POST /rules/checkout-validation/ - Validate checkout and get required acknowledgments"""
        try:
            # Get user's cart
            from cart.models import Cart
            cart = Cart.objects.get(user=request.user)
            cart_items = cart.items.all()
            
            # Evaluate checkout rules
            result = evaluate_checkout_rules(request.user, cart_items)
            
            return Response(result)
            
        except Exception as e:
            logger.error(f"Error validating checkout: {str(e)}")
            return Response(
                {'error': 'Internal server error', 'details': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='user-selections', permission_classes=[IsAuthenticated])
    def user_selections(self, request):
        """GET /rules/user-selections/ - Get user's previous rule selections"""
        try:
            trigger_type = request.query_params.get('trigger_type')
            
            # Get user's acknowledgments
            queryset = UserAcknowledgment.objects.filter(user=request.user)
            if trigger_type:
                queryset = queryset.filter(rule__trigger_type=trigger_type)
            
            selections = {}
            for ack in queryset:
                selections[ack.rule.id] = {
                    'rule_id': ack.rule.id,
                    'rule_name': ack.rule.name,
                    'acknowledgment_type': ack.acknowledgment_type,
                    'is_selected': ack.is_selected,
                    'acknowledged_at': ack.acknowledged_at.isoformat(),
                    'template_id': ack.message_template.id if ack.message_template else None
                }
            
            return Response({
                'success': True,
                'selections': selections
            })

        except Exception as e:
            logger.error(f"Error getting user selections: {str(e)}")
            return Response(
                {'error': 'Internal server error', 'details': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='calculate-vat', permission_classes=[IsAuthenticated])
    def calculate_vat(self, request):
        """POST /rules/calculate-vat/ - Calculate VAT using rules engine"""
        try:
            # Get parameters from request
            cart_items_data = request.data.get('cart_items', [])
            user_country = request.data.get('user_country', 'GB')
            customer_type = request.data.get('customer_type', 'individual')
            
            # Get user's actual cart items if no specific items provided
            if not cart_items_data:
                from cart.models import Cart
                try:
                    cart = Cart.objects.get(user=request.user)
                    cart_items = cart.items.all().select_related('product', 'product__product')
                except Cart.DoesNotExist:
                    return Response({
                        'error': 'No cart found for user and no cart items provided'
                    }, status=status.HTTP_400_BAD_REQUEST)
            else:
                # If specific cart items provided, get them from database
                from cart.models import CartItem
                cart_item_ids = [item.get('id') for item in cart_items_data if item.get('id')]
                cart_items = CartItem.objects.filter(id__in=cart_item_ids).select_related('product', 'product__product')
            
            # Prepare context for VAT calculation
            context = {
                'user_country': user_country,
                'customer_type': customer_type,
                'is_business_customer': customer_type == 'business',
                'user': request.user
            }
            
            # Evaluate checkout rules to get calculations
            result = evaluate_checkout_rules(request.user, cart_items, **context)
            
            # Extract VAT calculations from the results
            vat_calculations = []
            total_calculations = {
                'subtotal': 0,
                'total_vat': 0,
                'total_gross': 0,
                'calculations_applied': []
            }
            
            if result.get('calculations'):
                for calc in result['calculations']:
                    if calc.get('calculation_type') == 'vat':
                        vat_calculations.append(calc)
                        calc_result = calc.get('result', {})
                        
                        # Aggregate totals
                        total_calculations['subtotal'] += calc_result.get('total_net', 0)
                        total_calculations['total_vat'] += calc_result.get('total_vat', 0)
                        total_calculations['total_gross'] += calc_result.get('total_gross', 0)
                        total_calculations['calculations_applied'].append({
                            'rule_id': calc.get('rule_id'),
                            'rule_name': calc.get('rule_name'),
                            'calculation_type': calc.get('calculation_type'),
                            'function_name': calc.get('result', {}).get('function_name'),
                            'applied_at': calc.get('applied_at')
                        })
            
            return Response({
                'success': True,
                'vat_calculations': vat_calculations,
                'totals': total_calculations,
                'user_country': user_country,
                'customer_type': customer_type,
                'cart_item_count': len(cart_items)
            })

        except Exception as e:
            logger.error(f"Error calculating VAT: {str(e)}")
            return Response(
                {'error': 'Internal server error', 'details': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class RuleViewSet(viewsets.ModelViewSet):
    """
    CRUD operations for rules (admin use)
    """
    queryset = Rule.objects.all()
    serializer_class = RuleSerializer
    permission_classes = [IsAuthenticated]  # Restrict to authenticated users

    def get_queryset(self):
        """Filter rules based on query parameters"""
        queryset = Rule.objects.all()
        trigger_type = self.request.query_params.get('trigger_type')
        is_active = self.request.query_params.get('is_active')
        
        if trigger_type:
            queryset = queryset.filter(trigger_type=trigger_type)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
            
        return queryset.order_by('priority', 'id')


class MessageTemplateViewSet(viewsets.ModelViewSet):
    """
    CRUD operations for message templates (admin use)
    """
    queryset = MessageTemplate.objects.all()
    serializer_class = MessageTemplateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter templates based on query parameters"""
        queryset = MessageTemplate.objects.all()
        message_type = self.request.query_params.get('message_type')
        is_active = self.request.query_params.get('is_active')
        
        if message_type:
            queryset = queryset.filter(message_type=message_type)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
            
        return queryset.order_by('name')


class HolidayCalendarViewSet(viewsets.ModelViewSet):
    """
    CRUD operations for holiday calendar (admin use)
    """
    queryset = HolidayCalendar.objects.all()
    serializer_class = HolidayCalendarSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter holidays based on query parameters"""
        queryset = HolidayCalendar.objects.all()
        country = self.request.query_params.get('country')
        year = self.request.query_params.get('year')
        
        if country:
            queryset = queryset.filter(country=country)
        if year:
            queryset = queryset.filter(date__year=year)
            
        return queryset.order_by('date')


class UserAcknowledgmentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only view for user acknowledgments (for audit purposes)
    """
    queryset = UserAcknowledgment.objects.all()
    serializer_class = UserAcknowledgmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter acknowledgments - users can only see their own"""
        if self.request.user.is_staff:
            # Staff can see all acknowledgments
            return UserAcknowledgment.objects.all().order_by('-acknowledged_at')
        else:
            # Regular users can only see their own
            return UserAcknowledgment.objects.filter(
                user=self.request.user
            ).order_by('-acknowledged_at') 