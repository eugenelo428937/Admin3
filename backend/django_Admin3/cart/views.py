from django.shortcuts import render
from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import transaction
from .models import Cart, CartItem, ActedOrder, ActedOrderItem, OrderUserAcknowledgment
from .serializers import CartSerializer, CartItemSerializer, ActedOrderSerializer
from products.models import Product
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
from marking.models import MarkingPaper
from utils.email_service import email_service
import logging
from django.utils import timezone

logger = logging.getLogger(__name__)

class CartViewSet(viewsets.ViewSet):
    """
    API endpoints for cart operations: fetch, add, update, remove items.
    Handles both authenticated users and guests (via session_key).
    """
    permission_classes = [AllowAny]
    
    def dispatch(self, request, *args, **kwargs):
        print(f"[CartViewSet.dispatch] {request.method} {request.path}")
        return super().dispatch(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def _is_marking_product(self, product):
        """Check if a product is a marking product"""
        product_name = product.product.fullname.lower()
        group_name = getattr(product.product, 'group_name', '')
        return 'marking' in product_name or group_name == 'Markings'
    
    def _has_expired_deadlines(self, product):
        """Check if a marking product has expired deadlines"""
        if not self._is_marking_product(product):
            return False
        
        try:
            current_time = timezone.now()
            marking_papers = MarkingPaper.objects.filter(exam_session_subject_product=product)
            
            for paper in marking_papers:
                if paper.deadline < current_time:
                    return True
            return False
        except Exception as e:
            logger.warning(f"Error checking expired deadlines for product {product.id}: {str(e)}")
            return False
    
    def _get_expired_deadline_info(self, product):
        """Get detailed expired deadline information for a marking product"""
        if not self._is_marking_product(product):
            return {'has_expired': False, 'expired_count': 0, 'total_papers': 0}
        
        try:
            current_time = timezone.now()
            marking_papers = MarkingPaper.objects.filter(exam_session_subject_product=product)
            total_papers = marking_papers.count()
            expired_count = marking_papers.filter(deadline__lt=current_time).count()
            
            return {
                'has_expired': expired_count > 0,
                'expired_count': expired_count,
                'total_papers': total_papers
            }
        except Exception as e:
            logger.warning(f"Error getting expired deadline info for product {product.id}: {str(e)}")
            return {'has_expired': False, 'expired_count': 0, 'total_papers': 0}
    
    def _is_digital_product(self, cart_item):
        """Check if cart item contains digital products (eBooks, Online Classroom)"""
        try:
            # Check metadata for Vitalsource eBook
            metadata = cart_item.metadata or {}
            if metadata.get('variationName') == 'Vitalsource eBook':
                return True

            # Check product code for Online Classroom
            if hasattr(cart_item, 'product') and cart_item.product:
                product = cart_item.product.product  # ExamSessionSubjectProduct -> Product
                if product and hasattr(product, 'code') and product.code == 'OC':
                    return True

            return False
        except Exception as e:
            logger.warning(f"Error checking digital product for cart item {cart_item.id}: {str(e)}")
            return False

    def _update_cart_flags(self, cart):
        """Update cart-level flags based on cart contents"""
        has_marking = False
        has_digital = False

        for item in cart.items.all():
            if item.is_marking:
                has_marking = True

            # Check if this item is a digital product
            if self._is_digital_product(item):
                has_digital = True

            # Early exit if both flags are set
            if has_marking and has_digital:
                break

        # Update flags if changed
        cart_updated = False
        if cart.has_marking != has_marking:
            cart.has_marking = has_marking
            cart_updated = True

        if cart.has_digital != has_digital:
            cart.has_digital = has_digital
            cart_updated = True

        if cart_updated:
            cart.save()
    
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
        """GET /cart/ - Get current cart with user context"""
        cart = self.get_cart(request)
        serializer = CartSerializer(cart, context={'request': request})
        data = serializer.data
        data['test_field'] = 'This is a test'
        return Response(data)

    @action(detail=False, methods=['post'], url_path='add')
    def add(self, request):
        """POST /cart/add/ - Add item to cart"""
        cart = self.get_cart(request)
        product_id = request.data.get('current_product')
        quantity = int(request.data.get('quantity', 1))
        price_type = request.data.get('price_type', 'standard')
        actual_price = request.data.get('actual_price')
        metadata = request.data.get('metadata', {})
        
        product = get_object_or_404(ExamSessionSubjectProduct, id=product_id)
        
        # For tutorials, group by subject code across all locations
        if metadata.get('type') == 'tutorial':
            subject_code = metadata.get('subjectCode')
            new_location = metadata.get('newLocation')
            
            if subject_code and new_location:
                # Look for existing tutorial item with same subject code
                existing_item = CartItem.objects.filter(
                    cart=cart,
                    price_type=price_type,
                    metadata__type='tutorial',
                    metadata__subjectCode=subject_code
                ).first()
                
                if existing_item:
                    # Merge locations: check if this location already exists
                    existing_locations = existing_item.metadata.get('locations', [])
                    
                    # Find if this location already exists
                    location_name = new_location.get('location')
                    existing_location_index = None
                    for i, loc in enumerate(existing_locations):
                        if loc.get('location') == location_name:
                            existing_location_index = i
                            break
                    
                    if existing_location_index is not None:
                        # Location exists - merge choices
                        existing_location = existing_locations[existing_location_index]
                        existing_choices = existing_location.get('choices', [])
                        new_choices = new_location.get('choices', [])
                        
                        # Merge choices by creating a map to avoid duplicates
                        choice_map = {}
                        
                        # Add existing choices to map
                        for choice in existing_choices:
                            key = f"{choice.get('variationId')}_{choice.get('eventId')}"
                            choice_map[key] = choice
                        
                        # Add new choices to map (will overwrite if same event/variation)
                        for choice in new_choices:
                            key = f"{choice.get('variationId')}_{choice.get('eventId')}"
                            choice_map[key] = choice
                        
                        # Update the location with merged choices
                        merged_choices = list(choice_map.values())
                        existing_locations[existing_location_index] = {
                            'location': location_name,
                            'choices': merged_choices,
                            'choiceCount': len(merged_choices)
                        }
                    else:
                        # Location doesn't exist - add as new location
                        existing_locations.append(new_location)
                    
                    existing_item.metadata['locations'] = existing_locations
                    
                    # Update total choice count
                    total_choices = sum(loc.get('choiceCount', 0) for loc in existing_locations)
                    existing_item.metadata['totalChoiceCount'] = total_choices
                    
                    # Keep the best price (usually from 1st choice)
                    if actual_price and (not existing_item.actual_price or actual_price < existing_item.actual_price):
                        existing_item.actual_price = actual_price
                    
                    existing_item.save()
                    item = existing_item
                    created = False
                else:
                    # Create new tutorial item with locations array
                    tutorial_metadata = {
                        'type': 'tutorial',
                        'subjectCode': subject_code,
                        'title': metadata.get('title', f"{subject_code} Tutorial"),
                        'locations': [new_location],
                        'totalChoiceCount': new_location.get('choiceCount', 0)
                    }
                    
                    # Set marking flags for tutorial items
                    is_marking = self._is_marking_product(product)
                    deadline_info = self._get_expired_deadline_info(product) if is_marking else {}
                    has_expired_deadline = deadline_info.get('has_expired', False)
                    expired_deadlines_count = deadline_info.get('expired_count', 0)
                    marking_paper_count = deadline_info.get('total_papers', 0)
                    
                    item, created = CartItem.objects.get_or_create(
                        cart=cart,
                        product=product,
                        price_type=price_type,
                        metadata=tutorial_metadata,
                        defaults={
                            'quantity': quantity,
                            'actual_price': actual_price,
                            'is_marking': is_marking,
                            'has_expired_deadline': has_expired_deadline,
                            'expired_deadlines_count': expired_deadlines_count,
                            'marking_paper_count': marking_paper_count
                        }
                    )
            else:
                # Fallback to legacy tutorial behavior
                # Set marking flags for legacy tutorial items
                is_marking = self._is_marking_product(product)
                deadline_info = self._get_expired_deadline_info(product) if is_marking else {}
                has_expired_deadline = deadline_info.get('has_expired', False)
                expired_deadlines_count = deadline_info.get('expired_count', 0)
                marking_paper_count = deadline_info.get('total_papers', 0)
                
                item, created = CartItem.objects.get_or_create(
                    cart=cart, 
                    product=product,
                    price_type=price_type,
                    metadata=metadata,
                    defaults={
                        'quantity': quantity,
                        'actual_price': actual_price,
                        'is_marking': is_marking,
                        'has_expired_deadline': has_expired_deadline,
                        'expired_deadlines_count': expired_deadlines_count,
                        'marking_paper_count': marking_paper_count
                    }
                )
        else:
            # For regular (non-tutorial) items, handle variations properly
            variation_id = metadata.get('variationId')
            
            if variation_id:
                # For products with variations, each variation should be a separate cart item
                # Check for existing item with same product, price_type, AND variationId
                existing_item = CartItem.objects.filter(
                    cart=cart,
                    product=product,
                    price_type=price_type,
                    metadata__variationId=variation_id
                ).first()
                
                if existing_item:
                    # Found existing item with same variation, update quantity
                    existing_item.quantity += quantity
                    if metadata:
                        existing_item.metadata.update(metadata)

                    # Update marking flags in case they weren't set before
                    existing_item.is_marking = self._is_marking_product(product)
                    if existing_item.is_marking:
                        deadline_info = self._get_expired_deadline_info(product)
                        existing_item.has_expired_deadline = deadline_info.get('has_expired', False)
                        existing_item.expired_deadlines_count = deadline_info.get('expired_count', 0)
                        existing_item.marking_paper_count = deadline_info.get('total_papers', 0)
                    else:
                        existing_item.has_expired_deadline = False
                        existing_item.expired_deadlines_count = 0
                        existing_item.marking_paper_count = 0

                    existing_item.save()
                    item = existing_item
                    created = False
                else:
                    # Create new item for this specific variation
                    # Set marking flags
                    is_marking = self._is_marking_product(product)
                    deadline_info = self._get_expired_deadline_info(product) if is_marking else {}
                    has_expired_deadline = deadline_info.get('has_expired', False)
                    expired_deadlines_count = deadline_info.get('expired_count', 0)
                    marking_paper_count = deadline_info.get('total_papers', 0)

                    item = CartItem.objects.create(
                        cart=cart,
                        product=product,
                        price_type=price_type,
                        quantity=quantity,
                        actual_price=actual_price,
                        is_marking=is_marking,
                        has_expired_deadline=has_expired_deadline,
                        expired_deadlines_count=expired_deadlines_count,
                        marking_paper_count=marking_paper_count,
                        metadata=metadata
                    )
                    created = True
            else:
                # For items without variations, check for existing item without variation
                existing_item = CartItem.objects.filter(
                    cart=cart,
                    product=product,
                    price_type=price_type,
                    metadata__variationId__isnull=True  # No variation ID
                ).first()
                
                if existing_item:
                    # Found existing item without variation, update quantity
                    existing_item.quantity += quantity
                    if metadata:
                        existing_item.metadata.update(metadata)

                    # Update marking flags in case they weren't set before
                    existing_item.is_marking = self._is_marking_product(product)
                    if existing_item.is_marking:
                        deadline_info = self._get_expired_deadline_info(product)
                        existing_item.has_expired_deadline = deadline_info.get('has_expired', False)
                        existing_item.expired_deadlines_count = deadline_info.get('expired_count', 0)
                        existing_item.marking_paper_count = deadline_info.get('total_papers', 0)
                    else:
                        existing_item.has_expired_deadline = False
                        existing_item.expired_deadlines_count = 0
                        existing_item.marking_paper_count = 0

                    existing_item.save()
                    item = existing_item
                    created = False
                else:
                    # Create new item without variation
                    # Set marking flags
                    is_marking = self._is_marking_product(product)
                    deadline_info = self._get_expired_deadline_info(product) if is_marking else {}
                    has_expired_deadline = deadline_info.get('has_expired', False)
                    expired_deadlines_count = deadline_info.get('expired_count', 0)
                    marking_paper_count = deadline_info.get('total_papers', 0)

                    item = CartItem.objects.create(
                        cart=cart,
                        product=product,
                        price_type=price_type,
                        quantity=quantity,
                        actual_price=actual_price,
                        is_marking=is_marking,
                        has_expired_deadline=has_expired_deadline,
                        expired_deadlines_count=expired_deadlines_count,
                        marking_paper_count=marking_paper_count,
                        metadata=metadata
                    )
                    created = True
        
        if not created:
            # If item already exists but we didn't create new one, 
            # we may need to update the price if provided
            if actual_price is not None:
                item.actual_price = actual_price
                item.save()
        
        # Update cart-level flags based on new contents
        self._update_cart_flags(cart)
        
        # Get updated cart and return response
        cart = self.get_cart(request)
        serializer = CartSerializer(cart)
        return Response(serializer.data)

    @action(detail=False, methods=['patch'], url_path='update_item')
    def update_item(self, request):
        """PATCH /cart/update_item/ - Update quantity of an item in cart"""
        item_id = request.data.get('item_id')
        quantity = int(request.data.get('quantity', 1))
        item = get_object_or_404(CartItem, id=item_id)
        item.quantity = quantity
        item.save()
        cart = self.get_cart(request)
        serializer = CartSerializer(cart)
        return Response(serializer.data)

    @action(detail=False, methods=['delete'], url_path='remove')
    def remove(self, request):
        """DELETE /cart/remove/ - Remove item from cart"""
        item_id = request.data.get('item_id')
        item = get_object_or_404(CartItem, id=item_id)
        cart = item.cart
        item.delete()
        
        # Update cart-level flags after removing item
        self._update_cart_flags(cart)
        
        cart = self.get_cart(request)
        serializer = CartSerializer(cart)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='clear')
    def clear(self, request):
        """POST /cart/clear/ - Remove all items from cart"""
        cart = self.get_cart(request)
        cart.items.all().delete()
        
        # Update cart-level flags after clearing
        self._update_cart_flags(cart)
        
        return Response(CartSerializer(cart).data)

    @action(detail=False, methods=['post'], url_path='checkout', permission_classes=[IsAuthenticated])
    def checkout(self, request):
        """POST /cart/checkout/ - Create an order from the authenticated user's cart"""
        user = request.user
        cart = self.get_cart(request)
        if not cart.items.exists():
            return Response({'detail': 'Cart is empty.'}, status=status.HTTP_400_BAD_REQUEST)

        # Extract payment data from request
        payment_data = request.data
        employer_code = payment_data.get('employer_code', None)
        is_invoice = payment_data.get('is_invoice', False)
        payment_method = payment_data.get('payment_method', 'card')
        card_data = payment_data.get('card_data', None)
        
        # Extract T&C acceptance data
        terms_acceptance_data = payment_data.get('terms_acceptance', {})
        general_terms_accepted = terms_acceptance_data.get('general_terms_accepted', False)
        terms_version = terms_acceptance_data.get('terms_version', '1.0')
        product_acknowledgments = terms_acceptance_data.get('product_acknowledgments', {})

        # Validate payment data BEFORE creating order
        if payment_method == 'card' and not card_data:
            return Response({'detail': 'Card data is required for card payments.'},
                          status=status.HTTP_400_BAD_REQUEST)

        if payment_method == 'invoice' and not employer_code:
            return Response({'detail': 'Employer code is required for invoice payments.'},
                          status=status.HTTP_400_BAD_REQUEST)

        # Get client information
        client_ip = self._get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        with transaction.atomic():
            # Create order and items first
            order = ActedOrder.objects.create(user=user)
            order_items = []
            
            for item in cart.items.all():
                order_item = ActedOrderItem.objects.create(
                    order=order,
                    product=item.product,
                    quantity=item.quantity,
                    price_type=item.price_type,
                    actual_price=item.actual_price,
                    metadata=item.metadata
                )
                order_items.append(order_item)
            
            # Calculate totals using the rules engine (same as frontend)
            try:
                from rules_engine.engine import evaluate_checkout_rules
                from rules_engine.custom_functions import calculate_vat_standard
                
                # Format cart items for VAT calculation 
                cart_items_for_vat = [
                    {
                        'id': item.id,
                        'product_id': item.product.product.id,
                        'subject_code': item.product.exam_session_subject.subject.code,
                        'product_name': item.product.product.fullname,
                        'product_code': item.product.product.code,
                        'product_type': getattr(item.product, 'type', None),
                        'quantity': item.quantity,
                        'price_type': item.price_type,
                        'actual_price': str(item.actual_price) if item.actual_price else '0',
                        'metadata': item.metadata
                    }
                    for item in cart.items.all()
                ]
                
                # Calculate VAT using standard UK VAT rate (20%)
                vat_params = {
                    'function': 'calculate_vat_standard',
                    'vat_rate': 0.2,
                    'description': 'Standard UK VAT at 20%',
                    'threshold_amount': 0,
                    'exempt_product_types': ['book', 'educational_material']
                }
                
                vat_result = calculate_vat_standard(cart_items_for_vat, vat_params)
                
                # Update order with calculated totals
                order.subtotal = vat_result['total_net']
                order.vat_amount = vat_result['total_vat']
                order.total_amount = vat_result['total_gross']
                order.vat_rate = vat_result['vat_rate']
                order.vat_country = 'GB'
                order.vat_calculation_type = 'standard_vat'
                order.calculations_applied = {'vat_calculation': vat_result}
                order.save()
                
                # Update individual order items with VAT details
                item_calculations = {calc['item_id']: calc for calc in vat_result['item_calculations']}
                for order_item in order_items:
                    cart_item_id = None
                    # Find corresponding cart item ID
                    for cart_item in cart.items.all():
                        if (cart_item.product_id == order_item.product_id and 
                            cart_item.quantity == order_item.quantity and
                            cart_item.price_type == order_item.price_type):
                            cart_item_id = cart_item.id
                            break
                    
                    if cart_item_id and cart_item_id in item_calculations:
                        calc = item_calculations[cart_item_id]
                        order_item.net_amount = calc['net_amount']
                        order_item.vat_amount = calc['vat_amount']
                        order_item.gross_amount = calc['gross_amount']
                        order_item.vat_rate = calc['vat_rate']
                        order_item.is_vat_exempt = calc['is_exempt']
                        order_item.save()
                        
            except Exception as e:
                logger.warning(f"VAT calculation failed during checkout: {str(e)}, using basic totals")
                # Fallback: calculate basic totals without VAT
                subtotal = sum(float(item.actual_price or 0) * item.quantity for item in cart.items.all())
                order.subtotal = subtotal
                order.total_amount = subtotal  # No VAT if calculation fails
                order.save()

            # Transfer session acknowledgments to order before T&C processing
            self._transfer_session_acknowledgments_to_order(request, order, cart)

            # Create T&C acceptance record
            try:
                # Get rules engine evaluation data for checkout_terms entry point
                from rules_engine.engine import rules_engine
                rules_evaluation = rules_engine.evaluate_rules(
                    entry_point_code='checkout_terms',
                    user=user,
                    order_id=order.id
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
                
                # Serialize full cart data for storage
                cart_data = []
                for item in cart.items.all():
                    cart_data.append({
                        'id': item.id,
                        'product_id': item.product.product.id,
                        'product_name': item.product.product.fullname,
                        'subject_code': item.product.exam_session_subject.subject.code,
                        'exam_session_code': item.product.exam_session_subject.exam_session.session_code,
                        'quantity': item.quantity,
                        'price_type': item.price_type,
                        'actual_price': float(item.actual_price),
                        'metadata': item.metadata,
                        'is_marking': item.is_marking,
                        'has_expired_deadline': item.has_expired_deadline
                    })
                
                # Create Terms & Conditions acknowledgment record
                terms_acknowledgment = OrderUserAcknowledgment.objects.create(
                    order=order,
                    is_accepted=general_terms_accepted,
                    ip_address=client_ip,
                    user_agent=user_agent,
                    acknowledgment_data=cart_data,
                    rules_engine_context={}  # Will be populated with all acknowledged rules below
                )
                
                logger.info(f"T&C acceptance created for order {order.id}: accepted={general_terms_accepted}")
                
            except Exception as e:
                logger.warning(f"Failed to create T&C acceptance record for order {order.id}: {str(e)}")
                # Continue with checkout - T&C acceptance is recorded but not blocking
            
            # Process expired deadline acknowledgments if any
            try:
                # Check if there are expired deadline acknowledgments in product_acknowledgments
                expired_deadline_rules = [k for k in product_acknowledgments.keys() if 'expired' in k.lower() and 'deadline' in k.lower()]
                
                if expired_deadline_rules:
                    # Get the rule evaluation for checkout_start to find expired deadline rule
                    from rules_engine.engine import rules_engine
                    from rules_engine.models import Rule, MessageTemplate
                    
                    checkout_evaluation = rules_engine.evaluate_rules(
                        entry_point_code='checkout_start',
                        user=user,
                        cart_items=list(cart.items.all())
                    )
                    
                    # Find the expired deadline rule and template
                    expired_deadline_rule_id = None
                    expired_deadline_template_id = None
                    
                    if checkout_evaluation.get('success') and checkout_evaluation.get('acknowledgments'):
                        for ack in checkout_evaluation['acknowledgments']:
                            if ('expired' in ack.get('title', '').lower() and 
                                'deadline' in ack.get('title', '').lower()):
                                expired_deadline_rule_id = ack.get('rule_id')
                                expired_deadline_template_id = ack.get('template_id')
                                break
                    
                    # If we didn't find it in evaluation, look for it by name
                    if not expired_deadline_rule_id:
                        try:
                            rule = Rule.objects.filter(
                                name__icontains='Expired Marking Deadline',
                                is_active=True
                            ).first()
                            if rule:
                                expired_deadline_rule_id = rule.id
                                # Get template from rule actions
                                for action in rule.actions.all():
                                    if action.message_template:
                                        expired_deadline_template_id = action.message_template.id
                                        break
                        except Exception as rule_lookup_error:
                            logger.warning(f"Failed to lookup expired deadline rule: {str(rule_lookup_error)}")
                    
                    # Collect all acknowledged rules data for context
                    acknowledged_rules = []
                    
                    # Add T&C rule if found
                    if rule_id and template_id:
                        acknowledged_rules.append({
                            'rule_id': rule_id,
                            'template_id': template_id,
                            'type': 'terms_conditions',
                            'title': 'Terms & Conditions',
                            'trigger_type': 'checkout_terms',
                            'success': True,
                            'can_proceed': True,
                            'json_content': None  # T&C doesn't have JSON content typically
                        })
                    
                    # Add expired deadline rule if found
                    if checkout_evaluation:
                        for ack in checkout_evaluation.get('acknowledgments', []):
                            acknowledged_rules.append({
                                'rule_id': ack.get('rule_id'),
                                'template_id': ack.get('template_id'), 
                                'type': 'expired_deadline',
                                'title': ack.get('title'),
                                'trigger_type': 'checkout_start',
                                'success': True,
                                'can_proceed': True,
                                'json_content': ack.get('json_content')
                            })
                    
                    # Update the terms acknowledgment with all rules context
                    terms_acknowledgment.rules_engine_context = {
                        'acknowledged_rules': acknowledged_rules,
                        'evaluation_results': {
                            'terms_evaluation': rules_evaluation,
                            'checkout_evaluation': checkout_evaluation
                        }
                    }
                    terms_acknowledgment.save()
                    
                    logger.info(f"Expired deadline acknowledgment created for order {order.id}: {len(expired_deadline_rules)} rules acknowledged")
                    
            except Exception as e:
                logger.warning(f"Failed to create expired deadline acknowledgment for order {order.id}: {str(e)}")
                # Continue with checkout - acknowledgment is recorded but not blocking

            # Process payment based on payment method
            from .services import payment_service
            payment_result = None
            if payment_method == 'card':
                payment_result = payment_service.process_card_payment(order, card_data, client_ip, user_agent)
                if not payment_result['success']:
                    # Payment failed - rollback order creation
                    raise Exception(f"Payment failed: {payment_result.get('error_message', 'Unknown error')}")
            elif payment_method == 'invoice':
                payment_result = payment_service.process_invoice_payment(order, client_ip, user_agent)
                if not payment_result['success']:
                    # Invoice creation failed - rollback order creation
                    raise Exception(f"Invoice creation failed: {payment_result.get('error_message', 'Unknown error')}")

            # Clear cart after successful order creation and payment processing
            cart.items.all().delete()
            
            # Send order confirmation email with enhanced email management system
            try:
                # Get user country for dynamic content rules
                user_country = None
                try:
                    if hasattr(user, 'userprofile'):
                        home_address = user.userprofile.addresses.filter(address_type='HOME').first()
                        if home_address:
                            user_country = home_address.country
                except Exception as e:
                    logger.warning(f"Could not get user country: {str(e)}")
                
                # Fallback to default country if no address found (for testing dynamic content rules)
                if not user_country:
                    user_country = "United Kingdom"  # Default for testing
                    logger.info(f"Using default country '{user_country}' for user {user.username}")
                
                # Prepare comprehensive order data for email service
                order_data = {
                    'customer_name': user.get_full_name() or user.username,
                    'first_name': user.first_name or user.username,
                    'last_name': user.last_name or '',
                    'student_number': getattr(user, 'student_number', None) or str(user.id),                    
                    'order_number': f"ORD-{order.id:06d}",  # Format as ORD-000001
                    'total_amount': float(order.total_amount),  # Now correctly calculated
                    'created_at': order.created_at,
                    'user': {  # Add user object for dynamic content rules
                        'country': user_country,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                        'username': user.username,
                        'email': user.email
                    },
                    'items': []
                }
                
                # Prepare detailed item information
                for item in order.items.all():
                    # Get product groups for product type information
                    product_groups = item.product.product.groups.all()
                    product_type = product_groups.first().name if product_groups.exists() else None
                    
                    item_data = {
                        'name': item.product.product.fullname,
                        'product_name': item.product.product.fullname,
                        'product_code': item.product.product.code,  # Add full product code (e.g., CB1/CC/25A)
                        'product_type': product_type,  # Add product type from FilterGroup
                        'subject_code': getattr(item.product.exam_session_subject.subject, 'code', 'N/A'),
                        'session_code': getattr(item.product.exam_session_subject.exam_session, 'session_code', 'N/A'),
                        'quantity': item.quantity,
                        'actual_price': float(item.actual_price),
                        'line_total': float(item.actual_price * item.quantity),
                        'price_type': item.price_type,
                        'metadata': item.metadata or {}
                    }
                    
                    # Add tutorial-specific information if applicable
                    if item.metadata and item.metadata.get('type') == 'tutorial':
                        item_data.update({
                            'is_tutorial': True,
                            'tutorial_title': item.metadata.get('title', ''),
                            'tutorial_locations': item.metadata.get('locations', []),
                            'total_choices': item.metadata.get('totalChoiceCount', 0)
                        })
                    
                    # Add variation information if applicable
                    if item.metadata and item.metadata.get('variationName'):
                        item_data['variation'] = item.metadata.get('variationName')
                    
                    order_data['items'].append(item_data)
                
                # Use calculated totals from the order (not recalculating)
                order_data['subtotal'] = float(order.subtotal)
                order_data['vat_amount'] = float(order.vat_amount)
                order_data['discount_amount'] = 0  # No discount system yet
                order_data['item_count'] = len(order_data['items'])
                order_data['total_items'] = sum(item['quantity'] for item in order_data['items'])
                
                # Add new payment and order fields
                order_data['employer_code'] = employer_code
                order_data['is_invoice'] = is_invoice
                order_data['payment_method'] = payment_method
                
                # Check if any items are digital based on specific variation types, not product groups
                has_digital_items = False
                for item in order.items.all():
                    # Check if this item has a variation that is digital
                    if item.metadata and item.metadata.get('variationId'):
                        try:
                            # Get the ProductProductVariation from the variationId stored in metadata
                            from products.models import ProductProductVariation
                            ppv = ProductProductVariation.objects.select_related('product_variation').get(
                                id=item.metadata.get('variationId')
                            )
                            variation_type = ppv.product_variation.variation_type.lower()
                            if variation_type in ['ebook', 'hub']:
                                has_digital_items = True
                                break
                        except ProductProductVariation.DoesNotExist:
                            # Fallback to checking product groups if variation not found
                            if item.product.product.groups.filter(id__in=[14, 11]).exists():
                                has_digital_items = True
                                break
                    else:
                        # Fallback to checking product groups for items without variations
                        if item.product.product.groups.filter(id__in=[14, 11]).exists():
                            has_digital_items = True
                            break
                
                order_data['has_digital_items'] = has_digital_items
                
                # Send email using enhanced email service with queue support
                success = email_service.send_order_confirmation(
                    user_email=user.email,
                    order_data=order_data,
                    use_mjml=True,
                    enhance_outlook=True,
                    use_queue=True,  # Use queue for better performance
                    user=user
                )
                
                if success:
                    logger.info(f"Order confirmation email queued successfully for order {order_data['order_number']} to {user.email}")
                else:
                    logger.warning(f"Order confirmation email failed to queue for order {order_data['order_number']} to {user.email}")
                    
            except Exception as e:
                # Log the error but don't fail the order
                logger.error(f"Failed to send order confirmation email for order #{order.id}: {str(e)}")
                # Could also add this to an email retry queue here if needed
        
        serializer = ActedOrderSerializer(order)
        return Response({
            'order': serializer.data,
            'payment': payment_result,
            'message': 'Order created successfully'
        }, status=status.HTTP_201_CREATED)

    def _get_client_ip(self, request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    def _transfer_session_acknowledgments_to_order(self, request, order, cart):
        """
        Transfer session-based acknowledgments to order acknowledgments table
        FIXED: Only transfer acknowledgments for rules that actually matched in current execution
        """
        try:
            session_acknowledgments = request.session.get('user_acknowledgments', [])
            if not session_acknowledgments:
                logger.info(f"No session acknowledgments found for order {order.id}")
                return

            logger.info(f"Found {len(session_acknowledgments)} session acknowledgments for order {order.id}")

            # CRITICAL FIX: Get rules that actually matched in current execution
            matched_rule_ids = self._get_matched_rules_for_current_execution(order, cart)
            logger.info(f"Rules that matched in current execution: {matched_rule_ids}")

            # Filter acknowledgments to only include those for matched rules
            valid_acknowledgments = []
            stale_acknowledgments = []

            for ack in session_acknowledgments:
                message_id = str(ack.get('message_id', ''))
                ack_key = ack.get('ack_key', '')

                # Check if this acknowledgment corresponds to a rule that matched
                is_valid = (
                    message_id in matched_rule_ids or
                    ack_key in matched_rule_ids or
                    any(rule_id for rule_id in matched_rule_ids if str(rule_id) == message_id)
                )

                if is_valid:
                    valid_acknowledgments.append(ack)
                    logger.info(f"Valid acknowledgment: message_id={message_id}, ack_key={ack_key}")
                else:
                    stale_acknowledgments.append(ack)
                    logger.info(f"Stale acknowledgment (rule didn't match): message_id={message_id}, ack_key={ack_key}")

            if not valid_acknowledgments:
                logger.info(f"No valid acknowledgments to transfer for order {order.id}")
                # Clear stale acknowledgments from session
                request.session['user_acknowledgments'] = []
                request.session.modified = True
                return

            logger.info(f"Transferring {len(valid_acknowledgments)} valid acknowledgments (discarding {len(stale_acknowledgments)} stale ones)")

            # Group valid acknowledgments by message_id for aggregation
            acknowledgment_groups = {}
            for ack in valid_acknowledgments:
                message_id = ack.get('message_id')
                if message_id not in acknowledgment_groups:
                    acknowledgment_groups[message_id] = []
                acknowledgment_groups[message_id].append(ack)

            # Create order acknowledgments for each group
            for message_id, acks in acknowledgment_groups.items():
                # Determine acknowledgment type based on ack_key
                acknowledgment_type = 'custom'
                for ack in acks:
                    ack_key = ack.get('ack_key', '')
                    if 'terms' in ack_key.lower():
                        acknowledgment_type = 'terms_conditions'
                    elif 'expired' in ack_key.lower() and 'deadline' in ack_key.lower():
                        acknowledgment_type = 'deadline_expired'
                    elif 'warning' in ack_key.lower():
                        acknowledgment_type = 'warning'

                # Get the most recent acknowledgment for this message_id
                latest_ack = max(acks, key=lambda x: x.get('acknowledged_timestamp', ''))

                # Create acknowledgment data with all entry points
                acknowledgment_data = {
                    'session_acknowledgments': acks,
                    'entry_points': list(set(ack.get('entry_point_location') for ack in acks)),
                    'total_acknowledgments': len(acks),
                    'first_acknowledged': min(acks, key=lambda x: x.get('acknowledged_timestamp', '')).get('acknowledged_timestamp'),
                    'last_acknowledged': latest_ack.get('acknowledged_timestamp'),
                    'ack_keys': list(set(ack.get('ack_key') for ack in acks)),
                    'validation_info': {
                        'validated_against_current_execution': True,
                        'matched_rule_ids': list(matched_rule_ids),
                        'stale_acknowledgments_discarded': len(stale_acknowledgments)
                    }
                }

                # Create the order acknowledgment record
                order_acknowledgment = OrderUserAcknowledgment.objects.create(
                    order=order,
                    acknowledgment_type=acknowledgment_type,
                    rule_id=message_id,  # Use message_id as rule_id reference
                    template_id=message_id,  # Use message_id as template reference
                    title=f'Session Acknowledgment {message_id}',
                    content_summary=f'Validated acknowledgment for message {message_id} across {len(set(ack.get("entry_point_location") for ack in acks))} entry points',
                    is_accepted=latest_ack.get('acknowledged', False),
                    ip_address=latest_ack.get('ip_address', ''),
                    user_agent=latest_ack.get('user_agent', ''),
                    content_version='1.0',
                    acknowledgment_data=acknowledgment_data,
                    rules_engine_context={
                        'transferred_from_session': True,
                        'session_id': request.session.session_key,
                        'transfer_timestamp': timezone.now().isoformat(),
                        'validated_against_rules': True,
                        'matched_rule_ids': list(matched_rule_ids),
                        'original_session_data': session_acknowledgments,
                        'stale_acknowledgments_count': len(stale_acknowledgments)
                    }
                )

                logger.info(f"Created validated order acknowledgment {order_acknowledgment.id} for message {message_id} with type {acknowledgment_type}")

            # Clear session acknowledgments after successful transfer
            request.session['user_acknowledgments'] = []
            request.session.modified = True

            logger.info(f"Successfully transferred {len(valid_acknowledgments)} valid acknowledgments to order {order.id}, discarded {len(stale_acknowledgments)} stale ones")

        except Exception as e:
            logger.error(f"Failed to transfer session acknowledgments to order {order.id}: {str(e)}")
            # Don't raise exception - acknowledgment transfer failure shouldn't block checkout

    def _get_matched_rules_for_current_execution(self, order, cart):
        """
        Execute rules engine for checkout_terms and return which rules actually matched
        Uses the cart that's being processed for checkout to ensure accurate rule matching
        """
        try:
            if not cart:
                logger.warning(f"No cart provided for order {order.id}, cannot validate acknowledgments")
                return set()

            # Build context for rules execution
            cart_items = cart.items.all().select_related('product__product', 'product__exam_session_subject__subject')

            # Use the cart's has_digital flag instead of manually detecting
            has_digital = cart.has_digital

            # Calculate total from cart items since Cart model doesn't have subtotal
            total = sum(item.actual_price or 0 for item in cart_items)

            context = {
                'cart': {
                    'id': cart.id,
                    'user_id': cart.user.id if cart.user else None,
                    'has_digital': has_digital,
                    'total': float(total),
                    'items': []
                },
                'user': {
                    'id': order.user.id,
                    'email': order.user.email,
                    'is_authenticated': True
                } if order.user else None,
                'session': {
                    'ip_address': '127.0.0.1',
                    'session_id': 'checkout_validation'
                },
                'acknowledgments': {}
            }

            # Add cart items
            for item in cart_items:
                context['cart']['items'].append({
                    'id': item.id,
                    'product_id': item.product.product.id,
                    'quantity': item.quantity,
                    'actual_price': str(item.actual_price),
                    'is_digital': has_digital
                })

            # Execute rules engine
            from rules_engine.services.rule_engine import rule_engine
            result = rule_engine.execute('checkout_terms', context)

            if not result.get('success'):
                logger.warning(f"Rules execution failed for order {order.id}: {result.get('error')}")
                return set()

            # Extract rule IDs that actually matched and executed
            matched_rule_ids = set()

            # Check rules_executed list for rules that had condition_result=True
            for rule_exec in result.get('rules_executed', []):
                if rule_exec.get('condition_result'):
                    matched_rule_ids.add(rule_exec.get('rule_id'))

            # Also check messages for template_ids that were generated
            for message in result.get('messages', []):
                template_id = message.get('template_id')
                if template_id:
                    matched_rule_ids.add(str(template_id))

            logger.info(f"Rules that matched for order {order.id}: {matched_rule_ids}")
            return matched_rule_ids

        except Exception as e:
            logger.error(f"Error executing rules for validation in order {order.id}: {e}")
            return set()

    @action(detail=False, methods=['get'], url_path='orders', permission_classes=[IsAuthenticated])
    def orders(self, request):
        """GET /cart/orders/ - Get order history for the authenticated user"""
        user = request.user
        orders = ActedOrder.objects.filter(user=user).order_by('-created_at')
        serializer = ActedOrderSerializer(orders, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='test-order-email', permission_classes=[IsAuthenticated])
    def test_order_email(self, request):
        """POST /cart/test-order-email/ - Send test order confirmation email for development"""
        user = request.user
        test_email = request.data.get('email', user.email)
        
        # Get user country for testing dynamic content rules
        user_country = None
        try:
            if hasattr(user, 'userprofile'):
                home_address = user.userprofile.addresses.filter(address_type='HOME').first()
                if home_address:
                    user_country = home_address.country
        except Exception as e:
            logger.warning(f"Could not get user country for test: {str(e)}")
        
        # Create sample order data for testing
        test_order_data = {
            'customer_name': user.get_full_name() or user.username,
            'first_name': user.first_name or 'Test',
            'last_name': user.last_name or 'Customer',
            'student_number': getattr(user, 'student_number', None) or str(user.id),
            'order_number': f"ORD-TEST-{user.id:06d}",
            'total_amount': 299.99,
            'created_at': timezone.now(),
            'user': {  # Add user object for dynamic content rules testing
                'country': user_country or 'United Kingdom',  # Default for testing
                'first_name': user.first_name or 'Test',
                'last_name': user.last_name or 'Customer',
                'username': user.username,
                'email': user.email
            },
            'items': [
                {
                    'name': 'Advanced Financial Reporting',
                    'product_name': 'Advanced Financial Reporting',
                    'product_code': 'AFR/ST/25A',  # Add product code
                    'product_type': 'Study Text',  # Add product type
                    'subject_code': 'AFR',
                    'session_code': 'DEC24',
                    'quantity': 1,
                    'actual_price': 149.99,
                    'line_total': 149.99,
                    'price_type': 'standard',
                    'metadata': {},
                    'is_tutorial': False
                },
                {
                    'name': 'Strategic Business Management',
                    'product_name': 'Strategic Business Management',
                    'product_code': 'SBM/ST/25A',  # Add product code
                    'product_type': 'Study Text',  # Add product type
                    'subject_code': 'SBM',
                    'session_code': 'DEC24',
                    'quantity': 1,
                    'actual_price': 150.00,
                    'line_total': 150.00,
                    'price_type': 'standard',
                    'metadata': {},
                    'is_tutorial': False
                }
            ],
            'subtotal': 299.99,
            'item_count': 2,
            'total_items': 2
        }
        
        try:
            # Send test email
            success = email_service.send_order_confirmation(
                user_email=test_email,
                order_data=test_order_data,
                use_mjml=True,
                enhance_outlook=True,
                use_queue=False,  # Send immediately for testing
                user=user
            )
            
            if success:
                logger.info(f"Test order confirmation email sent successfully to {test_email}")
                return Response({
                    'success': True,
                    'message': f'Test order confirmation email sent successfully to {test_email}',
                    'order_data': test_order_data
                })
            else:
                return Response({
                    'success': False,
                    'message': 'Failed to send test order confirmation email'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"Error sending test order confirmation email: {str(e)}")
            return Response({
                'success': False,
                'message': f'Error sending test email: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
            # Handle tutorial items specially
            if item.metadata.get('type') == 'tutorial':
                subject_code = item.metadata.get('subjectCode')
                if subject_code and item.metadata.get('locations'):
                    # Look for existing tutorial item with same subject code
                    existing_item = CartItem.objects.filter(
                        cart=user_cart,
                        price_type=item.price_type,
                        metadata__type='tutorial',
                        metadata__subjectCode=subject_code
                    ).first()
                    
                    if existing_item:
                        # Merge locations from guest cart into user cart
                        existing_locations = existing_item.metadata.get('locations', [])
                        guest_locations = item.metadata.get('locations', [])
                        
                        # Merge each guest location with existing locations
                        for guest_location in guest_locations:
                            location_name = guest_location.get('location')
                            existing_location_index = None
                            
                            # Find if this location already exists
                            for i, loc in enumerate(existing_locations):
                                if loc.get('location') == location_name:
                                    existing_location_index = i
                                    break
                            
                            if existing_location_index is not None:
                                # Location exists - merge choices
                                existing_location = existing_locations[existing_location_index]
                                existing_choices = existing_location.get('choices', [])
                                guest_choices = guest_location.get('choices', [])
                                
                                # Merge choices by creating a map to avoid duplicates
                                choice_map = {}
                                
                                # Add existing choices to map
                                for choice in existing_choices:
                                    key = f"{choice.get('variationId')}_{choice.get('eventId')}"
                                    choice_map[key] = choice
                                
                                # Add guest choices to map (will overwrite if same event/variation)
                                for choice in guest_choices:
                                    key = f"{choice.get('variationId')}_{choice.get('eventId')}"
                                    choice_map[key] = choice
                                
                                # Update the location with merged choices
                                merged_choices = list(choice_map.values())
                                existing_locations[existing_location_index] = {
                                    'location': location_name,
                                    'choices': merged_choices,
                                    'choiceCount': len(merged_choices)
                                }
                            else:
                                # Location doesn't exist - add as new location
                                existing_locations.append(guest_location)
                        
                        existing_item.metadata['locations'] = existing_locations
                        
                        # Update total choice count
                        total_choices = sum(loc.get('choiceCount', 0) for loc in existing_locations)
                        existing_item.metadata['totalChoiceCount'] = total_choices
                        
                        existing_item.save()
                        continue
            
            # For non-tutorial items or if tutorial merging didn't happen
            variation_id = item.metadata.get('variationId')
            
            if variation_id:
                # For items with variations, check for exact variation match
                existing_user_item = CartItem.objects.filter(
                    cart=user_cart,
                    product=item.product,
                    price_type=item.price_type,
                    metadata__variationId=variation_id
                ).first()
                
                if existing_user_item:
                    existing_user_item.quantity += item.quantity
                    existing_user_item.save()
                else:
                    # Create new item for this specific variation
                    CartItem.objects.create(
                        cart=user_cart,
                        product=item.product,
                        price_type=item.price_type,
                        quantity=item.quantity,
                        actual_price=item.actual_price,
                        metadata=item.metadata
                    )
            else:
                # For items without variations, check for existing item without variation
                existing_user_item = CartItem.objects.filter(
                    cart=user_cart,
                    product=item.product,
                    price_type=item.price_type,
                    metadata__variationId__isnull=True  # No variation ID
                ).first()
                
                if existing_user_item:
                    existing_user_item.quantity += item.quantity
                    existing_user_item.save()
                else:
                    # Create new item without variation
                    CartItem.objects.create(
                        cart=user_cart,
                        product=item.product,
                        price_type=item.price_type,
                        quantity=item.quantity,
                        actual_price=item.actual_price,
                        metadata=item.metadata
                    )
        
        guest_cart.delete()
