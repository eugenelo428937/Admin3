from django.utils import timezone
import logging
from .serializers import (
    MessageTemplateSerializer,
    ActedRuleSerializer, RuleExecuteSerializer
)
from .models import (
    MessageTemplate, ActedRule, ActedRuleExecution
)
from .services.rule_engine import rule_engine as new_rule_engine
from rest_framework import status, viewsets, generics
from rest_framework.response import Response
from rest_framework.decorators import action, permission_classes, api_view
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
# Legacy engine imports - removed during refactoring
# from .engine import rules_engine, evaluate_checkout_rules, evaluate_cart_add_rules
rules_engine = None
evaluate_checkout_rules = None
evaluate_cart_add_rules = None

logger = logging.getLogger(__name__)


class RulesEngineViewSet(viewsets.ViewSet):
    """
    API endpoints for rules engine operations
    """
    permission_classes = [AllowAny]

    @method_decorator(csrf_exempt)
    @action(detail=False, methods=['post'], url_path='evaluate')
    def evaluate_rules(self, request):
        """POST /rules/evaluate/ - Evaluate rules for entry point or trigger type (LEGACY)"""
        try:
            entry_point_code = request.data.get('entry_point_code')
            trigger_type = request.data.get('trigger_type')

            # Support both new entry_point_code and legacy trigger_type
            if not entry_point_code and not trigger_type:
                return Response(
                    {'error': 'Either entry_point_code or trigger_type is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            user = request.user if request.user.is_authenticated else None
            context_data = request.data.get('context', {})

            # Special handling for cart-related triggers (legacy)
            if (trigger_type == 'checkout_start' or entry_point_code == 'checkout_start') and 'cart_items' in context_data:
                # Get cart items from the cart service
                from cart.models import CartItem
                cart_item_ids = context_data.get('cart_items', [])
                cart_items = list(CartItem.objects.filter(
                    id__in=cart_item_ids).select_related('product', 'product__product'))

                # Remove cart_items from context_data to avoid duplicate argument error
                filtered_context = {
                    k: v for k, v in context_data.items() if k != 'cart_items'}
                result = evaluate_checkout_rules(
                    user, cart_items, **filtered_context)
            else:
                # Use the updated engine that supports both entry_point_code and trigger_type
                result = rules_engine.evaluate_rules(
                    entry_point_code=entry_point_code,
                    trigger_type=trigger_type,
                    user=user,
                    **context_data
                )

            return Response(result)

        except Exception as e:
            logger.error(f"Error evaluating rules: {str(e)}")
            return Response(
                {'error': 'Internal server error', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @method_decorator(csrf_exempt)
    @action(detail=False, methods=['post'], url_path='execute', permission_classes=[AllowAny])
    def execute_rules(self, request):
        """POST /rules/execute/ - JSONB-based rules engine execution"""
        try:
            entry_point = request.data.get(
                'entry_point') or request.data.get('entryPoint')
            context_data = request.data.get('context', {})

            if not entry_point:
                return Response(
                    {'error': 'entry_point is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            auth_header = request.META.get('HTTP_AUTHORIZATION', 'None')
            # Only add user context if not already provided in the request or if authenticated
            # This allows schema validation to work properly when user context is intentionally missing
            if 'user' not in context_data:
                if request.user.is_authenticated:
                    user_context = {
                        'id': request.user.id,  # Use integer, not string
                        'email': request.user.email,
                        'is_authenticated': True,
                        'ip': request.META.get('REMOTE_ADDR', ''),
                        'home_country': None,
                        'work_country': None
                    }

                    # Get user address information for country detection
                    try:
                        from userprofile.models import UserProfile
                        from userprofile.models.address import UserProfileAddress

                        user_profile = UserProfile.objects.get(
                            user=request.user)

                        # Get home address country
                        try:
                            home_address = UserProfileAddress.objects.get(
                                user_profile=user_profile,
                                address_type='HOME'
                            )
                            user_context['home_country'] = home_address.country
                        except UserProfileAddress.DoesNotExist:
                            pass

                        # Get work address country
                        try:
                            work_address = UserProfileAddress.objects.get(
                                user_profile=user_profile,
                                address_type='WORK'
                            )
                            user_context['work_country'] = work_address.country
                        except UserProfileAddress.DoesNotExist:
                            pass

                    except UserProfile.DoesNotExist:
                        # User profile doesn't exist, keep countries as None
                        pass

                    context_data['user'] = user_context
                else:
                    # For unauthenticated users, only add user context if schema validation fails
                    # This allows proper schema validation for rules that require user context
                    pass

            # Add session acknowledgments to context for blocking logic
            session_acknowledgments = request.session.get(
                'user_acknowledgments', [])
            if session_acknowledgments:
                # Convert session acknowledgments to the format expected by rules engine
                acknowledgments_dict = {}
                for ack in session_acknowledgments:
                    if ack.get('entry_point_location') == entry_point:
                        ack_key = ack.get('ack_key')
                        if ack_key:
                            acknowledgments_dict[ack_key] = {
                                'acknowledged': ack.get('acknowledged', False),
                                'message_id': ack.get('message_id'),
                                'timestamp': ack.get('acknowledged_timestamp'),
                                'entry_point_location': ack.get('entry_point_location')
                            }

                if acknowledgments_dict:
                    context_data['acknowledgments'] = acknowledgments_dict

            # Add request metadata
            context_data['request'] = {
                'ip_address': request.META.get('REMOTE_ADDR'),
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                'timestamp': timezone.now().isoformat()
            }

            # Debug: Log the final context being sent to rules engine
            if 'user' in context_data:
                user_ctx = context_data['user']

            # Execute rules engine
            result = new_rule_engine.execute(entry_point, context_data)

            # Check for schema validation errors
            if not result.get('success', True) and 'schema_validation_errors' in result:
                logger.warning(
                    f"Schema validation errors for '{entry_point}': {len(result['schema_validation_errors'])} errors")
                return Response(result, status=status.HTTP_400_BAD_REQUEST)

            return Response(result)

        except Exception as e:
            logger.error(f"❌ Rules Engine API error: {str(e)}")
            return Response(
                {
                    'success': False,
                    'error': 'Internal server error',
                    'details': str(e),
                    'rules_evaluated': 0,
                    'execution_time_ms': 0
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='pending-acknowledgments', permission_classes=[IsAuthenticated])
    def pending_acknowledgments(self, request):
        """GET /rules/pending-acknowledgments/ - Get pending acknowledgments"""
        try:
            trigger_type = request.query_params.get('trigger_type')
            pending = rules_engine.get_pending_acknowledgments(
                request.user, trigger_type)

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

    @action(detail=False, methods=['post'], url_path='accept-terms', permission_classes=[IsAuthenticated])
    def accept_terms(self, request):
        """POST /rules/accept-terms/ - Accept Terms & Conditions during checkout"""
        try:
            from cart.models import ActedOrder, OrderUserAcknowledgment

            order_id = request.data.get('order_id')
            general_terms_accepted = request.data.get(
                'general_terms_accepted', False)
            terms_version = request.data.get('terms_version', '1.0')
            product_acknowledgments = request.data.get(
                'product_acknowledgments', {})

            if not order_id:
                return Response(
                    {'error': 'order_id is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Verify order belongs to user
            try:
                order = ActedOrder.objects.get(id=order_id, user=request.user)
            except ActedOrder.DoesNotExist:
                return Response(
                    {'error': 'Order not found or access denied'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Get client info
            ip_address = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0] or \
                request.META.get('REMOTE_ADDR', '')
            user_agent = request.META.get('HTTP_USER_AGENT', '')

            # Get rules engine evaluation data for this entry point
            rules_evaluation = rules_engine.evaluate_rules(
                entry_point_code='checkout_terms',
                user=request.user,
                order_id=order_id
            )

            # Extract rule_id and template_id from rules evaluation
            rule_id = None
            template_id = None

            if rules_evaluation.get('success') and rules_evaluation.get('messages'):
                # Look for T&C related messages in the evaluation results
                for message in rules_evaluation['messages']:
                    if (message.get('type') in ['message', 'acknowledgment'] and
                            message.get('requires_acknowledgment')):
                        rule_id = message.get('rule_id')
                        template_id = message.get('template_id')
                        break

            # Create or update T&C acknowledgment record
            with transaction.atomic():
                terms_acknowledgment, created = OrderUserAcknowledgment.objects.update_or_create(
                    order=order,
                    acknowledgment_type='terms_conditions',
                    defaults={
                        'rule_id': rule_id,
                        'template_id': template_id,
                        'title': 'Terms & Conditions',
                        'content_summary': f'General Terms & Conditions acceptance (v{terms_version})',
                        'is_accepted': general_terms_accepted,
                        'ip_address': ip_address,
                        'user_agent': user_agent,
                        'content_version': terms_version,
                        'acknowledgment_data': {
                            'products': product_acknowledgments,
                            'general_terms_accepted': general_terms_accepted
                        },
                        'rules_engine_context': {
                            'evaluation_result': rules_evaluation,
                            'accepted_at': timezone.now().isoformat(),
                            'request_data': request.data,
                            'extracted_rule_id': rule_id,
                            'extracted_template_id': template_id
                        }
                    }
                )

            action = "created" if created else "updated"
            return Response({
                'success': True,
                'message': f'Terms & Conditions acceptance {action} successfully',
                'acceptance_id': terms_acceptance.id,
                'order_id': order.id,
                'general_terms_accepted': general_terms_accepted,
                'terms_version': terms_version,
                'accepted_at': terms_acceptance.accepted_at.isoformat()
            })

        except Exception as e:
            logger.error(f"Error accepting terms: {str(e)}")
            return Response(
                {'error': 'Internal server error', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='checkout-terms-status', permission_classes=[IsAuthenticated])
    def checkout_terms_status(self, request):
        """GET /rules/checkout-terms-status/ - Get T&C acceptance status for an order"""
        try:
            from cart.models import ActedOrder, OrderUserAcknowledgment

            order_id = request.query_params.get('order_id')
            if not order_id:
                return Response(
                    {'error': 'order_id is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Verify order belongs to user
            try:
                order = ActedOrder.objects.get(id=order_id, user=request.user)
            except ActedOrder.DoesNotExist:
                return Response(
                    {'error': 'Order not found or access denied'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Check if T&C acknowledgment exists
            try:
                terms_acknowledgment = OrderUserAcknowledgment.objects.get(
                    order=order,
                    acknowledgment_type='terms_conditions'
                )
                return Response({
                    'success': True,
                    'has_acceptance': True,
                    'general_terms_accepted': terms_acknowledgment.general_terms_accepted,
                    'terms_version': terms_acknowledgment.terms_version,
                    'accepted_at': terms_acknowledgment.accepted_at.isoformat(),
                    'product_acknowledgments': terms_acknowledgment.product_acknowledgments
                })
            except OrderUserAcknowledgment.DoesNotExist:
                return Response({
                    'success': True,
                    'has_acceptance': False,
                    'general_terms_accepted': False,
                    'terms_version': None,
                    'accepted_at': None,
                    'product_acknowledgments': {}
                })

        except Exception as e:
            logger.error(f"Error getting T&C status: {str(e)}")
            return Response(
                {'error': 'Internal server error', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='calculate-vat', permission_classes=[AllowAny])
    def calculate_vat(self, request):
        """
        POST /api/rules/engine/calculate-vat/ - Calculate VAT using new VAT service

        Request body:
        {
            "country_code": "GB",  # Required: ISO 3166-1 alpha-2 country code
            "net_amount": "100.00",  # Optional: For single amount calculation
            "cart_items": [  # Optional: For cart calculation
                {"net_price": "50.00", "quantity": 2},
                {"net_price": "30.00", "quantity": 1}
            ]
        }
        """
        try:
            from utils.services.vat_service import VATCalculationService
            from decimal import Decimal
            from django.core.exceptions import ValidationError

            # Get country code from request
            country_code = request.data.get('country_code')

            if not country_code:
                return Response({
                    'error': 'country_code is required'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Initialize VAT service
            vat_service = VATCalculationService()

            # Check if cart items or single amount
            cart_items = request.data.get('cart_items')
            net_amount = request.data.get('net_amount')

            if cart_items is not None:
                # Calculate VAT for cart items
                result = vat_service.calculate_vat_for_cart(
                    country_code=country_code,
                    cart_items=cart_items
                )
            elif net_amount is not None:
                # Calculate VAT for single amount
                try:
                    net_amount_decimal = Decimal(str(net_amount))
                except (ValueError, TypeError):
                    return Response({
                        'error': 'Invalid net_amount format'
                    }, status=status.HTTP_400_BAD_REQUEST)

                result = vat_service.calculate_vat(
                    country_code=country_code,
                    net_amount=net_amount_decimal
                )
            else:
                return Response({
                    'error': 'Either net_amount or cart_items is required'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Convert Decimal values to strings for JSON serialization
            def decimal_to_str(obj):
                if isinstance(obj, Decimal):
                    return str(obj)
                elif isinstance(obj, dict):
                    return {k: decimal_to_str(v) for k, v in obj.items()}
                elif isinstance(obj, list):
                    return [decimal_to_str(item) for item in obj]
                return obj

            result = decimal_to_str(result)

            return Response(result, status=status.HTTP_200_OK)

        except ValidationError as e:
            logger.warning(f"VAT calculation validation error: {str(e)}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error calculating VAT: {str(e)}")
            return Response({
                'error': 'Internal server error',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


# Obsolete RuleViewSet removed during refactoring
# class RuleViewSet(viewsets.ModelViewSet):
#     """
#     CRUD operations for rules (admin use)
#     """
#     queryset = Rule.objects.all()
#     serializer_class = RuleSerializer
#     permission_classes = [IsAuthenticated]  # Restrict to authenticated users

#     def get_queryset(self):
#         """Filter rules based on query parameters"""
#         queryset = Rule.objects.all()
#         trigger_type = self.request.query_params.get('trigger_type')
#         is_active = self.request.query_params.get('is_active')

#         if trigger_type:
#             queryset = queryset.filter(trigger_type=trigger_type)
#         if is_active is not None:
#             queryset = queryset.filter(is_active=is_active.lower() == 'true')

#         return queryset.order_by('priority', 'id')


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

    @action(detail=False, methods=['get'], url_path='template-styles', permission_classes=[AllowAny])
    def get_template_styles(self, request):
        """Get dynamic styles for a specific message template"""
        template_id = request.query_params.get('template_id')
        if not template_id:
            return Response({
                'error': 'template_id parameter is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            template = get_object_or_404(MessageTemplate, id=template_id)
            styles = {}

            # Get template-specific style configuration
            try:
                template_style = MessageTemplateStyle.objects.get(
                    message_template=template)

                # Get theme styles if theme is assigned
                if template_style.theme:
                    theme_styles = ContentStyle.objects.filter(
                        theme=template_style.theme,
                        is_active=True
                    ).order_by('priority')

                    for style in theme_styles:
                        # Add styles by CSS class selector
                        if style.css_class_selector:
                            styles[style.css_class_selector] = style.get_style_object()

                        # Add styles by element type
                        styles[style.element_type] = style.get_style_object()

                # Override with custom styles for this template
                custom_styles = template_style.custom_styles.filter(
                    is_active=True).order_by('priority')
                for style in custom_styles:
                    if style.css_class_selector:
                        styles[style.css_class_selector] = style.get_style_object()
                    styles[style.element_type] = style.get_style_object()

            except MessageTemplateStyle.DoesNotExist:
                # No specific styling configured, use global styles
                global_styles = ContentStyle.objects.filter(
                    theme__isnull=True,
                    is_active=True
                ).order_by('priority')

                for style in global_styles:
                    if style.css_class_selector:
                        styles[style.css_class_selector] = style.get_style_object()
                    styles[style.element_type] = style.get_style_object()

            return Response({
                'template_id': template_id,
                'template_name': template.name,
                'styles': styles,
                'cached_at': timezone.now().isoformat()
            })

        except Exception as e:
            logger.error(
                f"Error fetching template styles for template {template_id}: {str(e)}")
            return Response({
                'template_id': template_id,
                'styles': {},
                'error': 'Failed to fetch styles'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RulesPagination(PageNumberPagination):
    """Custom pagination for rules listing"""
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class ActedRuleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for ActedRule CRUD operations (Stage 9)
    """
    queryset = ActedRule.objects.all()
    serializer_class = ActedRuleSerializer
    # For testing, in production should be [IsAuthenticated]
    permission_classes = [AllowAny]
    pagination_class = RulesPagination
    lookup_field = 'rule_code'

    def get_queryset(self):
        """Filter rules based on entry point and active status"""
        queryset = ActedRule.objects.filter(
            active=True).order_by('priority', 'created_at')

        entry_point = self.request.query_params.get('entry_point')
        if entry_point:
            queryset = queryset.filter(entry_point=entry_point)

        return queryset

    def perform_destroy(self, instance):
        """Soft delete by setting active=False"""
        instance.active = False
        instance.save()


@api_view(['GET'])
@permission_classes([AllowAny])
def rules_by_entrypoint(request, entry_point):
    """
    GET /api/rules/entrypoint/{entry_point}/ - Get rules for specific entry point
    """
    try:
        queryset = ActedRule.objects.filter(
            entry_point=entry_point,
            active=True
        ).order_by('priority', 'created_at')

        # Handle pagination
        page = request.GET.get('page')
        page_size = request.GET.get('page_size')

        if page or page_size:
            paginator = RulesPagination()
            paginated_rules = paginator.paginate_queryset(queryset, request)
            serializer = ActedRuleSerializer(paginated_rules, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = ActedRuleSerializer(queryset, many=True)
        return Response(serializer.data)

    except Exception as e:
        logger.error(
            f"Error getting rules for entry point {entry_point}: {str(e)}")
        return Response(
            {'error': 'Internal server error', 'details': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
# For testing, in production should be [IsAuthenticated]
@permission_classes([AllowAny])
def rules_create(request):
    """
    POST /api/rules/create/ - Create new rule
    """
    try:
        serializer = ActedRuleSerializer(data=request.data)
        if serializer.is_valid():
            rule = serializer.save()
            response_serializer = ActedRuleSerializer(rule)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.error(f"Error creating rule: {str(e)}")
        return Response(
            {'error': 'Internal server error', 'details': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def rules_acknowledge(request):
    """
    POST /api/rules/acknowledge/ - Handle rule acknowledgments with session tracking
    """
    try:
        ack_key = request.data.get('ackKey')
        message_id = request.data.get('message_id')
        acknowledged = request.data.get('acknowledged', True)
        entry_point_location = request.data.get('entry_point_location')

        if not ack_key:
            return Response(
                {'error': 'ackKey is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not entry_point_location:
            return Response(
                {'error': 'entry_point_location is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Ensure session exists - create if needed
        if not request.session.session_key:
            request.session.create()
            logger.info(f"✅ [Acknowledge] Created new session: {request.session.session_key}")

        # Get or initialize session acknowledgments
        session_acknowledgments = request.session.get(
            'user_acknowledgments', [])

        # Find existing acknowledgment for this message_id and entry_point_location
        existing_ack = None
        existing_index = -1

        for i, ack in enumerate(session_acknowledgments):
            if (ack.get('message_id') == message_id and
                    ack.get('entry_point_location') == entry_point_location):
                existing_ack = ack
                existing_index = i
                break

        # Create new acknowledgment record
        acknowledgment_record = {
            'message_id': message_id,
            'acknowledged': acknowledged,
            'acknowledged_timestamp': timezone.now().isoformat(),
            'entry_point_location': entry_point_location,
            'ack_key': ack_key,
            'ip_address': request.META.get('REMOTE_ADDR', ''),
            'user_agent': request.META.get('HTTP_USER_AGENT', '')
        }

        if existing_ack:
            # Update existing acknowledgment
            session_acknowledgments[existing_index] = acknowledgment_record
            action = 'updated'
        else:
            # Add new acknowledgment
            session_acknowledgments.append(acknowledgment_record)
            action = 'created'

        # Save back to session
        request.session['user_acknowledgments'] = session_acknowledgments
        request.session.modified = True
        request.session.save()  # Explicitly save to ensure persistence

        # DEBUG: Log acknowledgment storage
        logger.info(f"✅ [Acknowledge] Session ID: {request.session.session_key}")
        logger.info(f"✅ [Acknowledge] Stored ack_key: {ack_key}")
        logger.info(f"✅ [Acknowledge] Total acknowledgments: {len(session_acknowledgments)}")
        logger.info(f"✅ [Acknowledge] All ack_keys in session: {[a.get('ack_key') for a in session_acknowledgments]}")

        return Response({
            'success': True,
            'message': f'Acknowledgment {action} successfully',
            'ackKey': ack_key,
            'acknowledged': acknowledged,
            'entry_point_location': entry_point_location,
            'action': action,
            'total_acknowledgments': len(session_acknowledgments),
            'session_id': request.session.session_key  # DEBUG: Include session ID
        })

    except Exception as e:
        logger.error(f"Error recording acknowledgment: {str(e)}")
        return Response(
            {'error': 'Internal server error', 'details': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def rules_preferences(request):
    """
    POST /api/rules/preferences/ - Handle user preference saving
    Stage 10 requirement for user preference collection flow
    """
    try:
        preferences = request.data.get('preferences', {})
        user_id = request.data.get('user_id')

        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # For testing, try to get the actual user
        from django.contrib.auth import get_user_model
        User = get_user_model()

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Note: This endpoint saves standalone preferences, not order-specific ones
        # For order-specific preferences, use OrderUserPreference in cart checkout
        saved_preferences = []

        for key, preference_data in preferences.items():
            try:
                # Extract preference details - handle both simple values and complex objects
                if isinstance(preference_data, dict):
                    value = preference_data.get('value', preference_data)
                    input_type = preference_data.get('inputType', 'text')
                    rule_id = preference_data.get('ruleId')
                else:
                    value = preference_data
                    input_type = 'text'
                    rule_id = None

                # Skip empty preferences
                if not value and value != 0 and value != False:
                    continue

                # Find the associated rule if rule_id is provided
                rule = None
                if rule_id:
                    try:
                        # Try to get rule by string rule_code first, then by numeric ID
                        if str(rule_id).isdigit():
                            rule = ActedRule.objects.get(id=int(rule_id))
                        else:
                            rule = ActedRule.objects.get(rule_code=rule_id)
                    except ActedRule.DoesNotExist:
                        logger.warning(
                            f"Rule with ID/rule_code {rule_id} not found for preference {key}")

                # For standalone preferences (not order-specific), we can store in session
                # or create a simple record. For now, just track in the response.
                preference_record = {
                    'user_id': user_id,
                    'preference_key': key,
                    'preference_value': value,
                    'input_type': input_type,
                    'rule_code': rule.rule_code if rule else None,
                    'saved_at': timezone.now().isoformat(),
                    'note': 'Standalone preference - not linked to specific order'
                }
                saved_preferences.append(preference_record)

            except Exception as e:
                logger.error(f"Error processing preference {key}: {str(e)}")
                continue

        return Response({
            'success': True,
            'message': 'Preferences saved successfully',
            'preferences_saved': saved_preferences,
            'count': len(saved_preferences)
        })

    except Exception as e:
        logger.error(f"Error saving preferences: {str(e)}")
        return Response(
            {'error': 'Internal server error', 'details': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def validate_comprehensive_checkout(request):
    """
    POST /api/rules/validate-comprehensive-checkout/ - Validate checkout by checking ALL required acknowledgments from ALL entry points
    """
    try:
        # Build comprehensive context for all validation
        context_data = request.data.get("context", {})

        # Get user info if authenticated
        if request.user.is_authenticated and "user" not in context_data:
            user_context = {
                "id": request.user.id,
                "email": request.user.email,
                "is_authenticated": True,
                "ip": request.META.get("REMOTE_ADDR", ""),
                "home_country": None,
                "work_country": None
            }

            # Get user address information for country detection
            try:
                from userprofile.models import UserProfile
                from userprofile.models.address import UserProfileAddress

                user_profile = UserProfile.objects.get(user=request.user)

                # Get home address country
                try:
                    home_address = UserProfileAddress.objects.get(
                        user_profile=user_profile,
                        address_type="HOME"
                    )
                    user_context["home_country"] = home_address.country
                except UserProfileAddress.DoesNotExist:
                    pass

                # Get work address country
                try:
                    work_address = UserProfileAddress.objects.get(
                        user_profile=user_profile,
                        address_type="WORK"
                    )
                    user_context["work_country"] = work_address.country
                except UserProfileAddress.DoesNotExist:
                    pass

            except UserProfile.DoesNotExist:
                # User profile doesn't exist, keep countries as None
                pass

            context_data["user"] = user_context

        # Get session acknowledgments
        session_acknowledgments = request.session.get(
            "user_acknowledgments", [])

        # DEBUG: Log session info
        logger.info(f"🔍 [Comprehensive Validation] Session ID: {request.session.session_key}")
        logger.info(f"🔍 [Comprehensive Validation] Raw session acknowledgments: {session_acknowledgments}")
        logger.info(f"🔍 [Comprehensive Validation] Ack keys in session: {[a.get('ack_key') for a in session_acknowledgments]}")

        # Convert session acknowledgments to the format expected by rules engine
        acknowledgments_dict = {}
        for ack in session_acknowledgments:
            ack_key = ack.get("ack_key")
            if ack_key and ack.get("acknowledged"):
                acknowledgments_dict[ack_key] = {
                    "acknowledged": True,
                    "timestamp": ack.get("acknowledged_timestamp"),
                    "entry_point_location": ack.get("entry_point_location")
                }

        # DEBUG: Log converted acknowledgments
        logger.info(f"🔍 [Comprehensive Validation] Acknowledgments dict keys: {list(acknowledgments_dict.keys())}")

        # Add acknowledgments to context
        context_data["acknowledgments"] = acknowledgments_dict

        # Collect all required acknowledgments from all entry points
        entry_points_to_check = [
            "checkout_terms",
            "checkout_payment",
            "checkout_preference"
        ]

        all_required_acknowledgments = []
        blocking_rules = []

        for entry_point in entry_points_to_check:
            # Execute rules for this entry point
            result = new_rule_engine.execute(entry_point, context_data)

            if result.get("blocked"):
                blocking_rules.extend(result.get("blocking_rules", []))

            # Collect required acknowledgments
            required_acks = result.get("required_acknowledgments", [])
            for req_ack in required_acks:
                # Add entry point for tracking
                req_ack["entry_point"] = entry_point
                all_required_acknowledgments.append(req_ack)

        # Check which acknowledgments are missing
        missing_acknowledgments = []
        satisfied_acknowledgments = []

        for req_ack in all_required_acknowledgments:
            ack_key = req_ack.get("ackKey")
            if ack_key in acknowledgments_dict:
                satisfied_acknowledgments.append(ack_key)
            else:
                missing_acknowledgments.append(req_ack)

        # Determine if blocked
        blocked = len(missing_acknowledgments) > 0

        return Response({
            "success": True,
            "blocked": blocked,
            "can_proceed": not blocked,
            "all_required_acknowledgments": all_required_acknowledgments,
            "missing_acknowledgments": missing_acknowledgments,
            "satisfied_acknowledgments": satisfied_acknowledgments,
            "blocking_rules": blocking_rules,
            "summary": {
                "total_required": len(all_required_acknowledgments),
                "total_satisfied": len(satisfied_acknowledgments),
                "total_missing": len(missing_acknowledgments)
            },
            # DEBUG: Include session info for troubleshooting
            "_debug": {
                "session_id": request.session.session_key,
                "session_ack_keys": [a.get('ack_key') for a in session_acknowledgments],
                "acknowledgments_dict_keys": list(acknowledgments_dict.keys())
            }
        })

    except Exception as e:
        logger.error(f"❌ [Comprehensive Validation] Error: {str(e)}")
        return Response({
            "success": False,
            "blocked": True,  # Block on error for safety
            "error": str(e),
            "missing_acknowledgments": [],
            "satisfied_acknowledgments": []
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
