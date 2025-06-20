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
                    
                    item, created = CartItem.objects.get_or_create(
                        cart=cart,
                        product=product,
                        price_type=price_type,
                        metadata=tutorial_metadata,
                        defaults={'quantity': quantity, 'actual_price': actual_price}
                    )
            else:
                # Fallback to legacy tutorial behavior
                item, created = CartItem.objects.get_or_create(
                    cart=cart, 
                    product=product,
                    price_type=price_type,
                    metadata=metadata,
                    defaults={'quantity': quantity, 'actual_price': actual_price}
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
                    existing_item.save()
                    item = existing_item
                    created = False
                else:
                    # Create new item for this specific variation
                    item = CartItem.objects.create(
                        cart=cart,
                        product=product,
                        price_type=price_type,
                        quantity=quantity,
                        actual_price=actual_price,
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
                    existing_item.save()
                    item = existing_item
                    created = False
                else:
                    # Create new item without variation
                    item = CartItem.objects.create(
                        cart=cart,
                        product=product,
                        price_type=price_type,
                        quantity=quantity,
                        actual_price=actual_price,
                        metadata=metadata
                    )
                    created = True
        
        if not created:
            # If item already exists but we didn't create new one, 
            # we may need to update the price if provided
            if actual_price is not None:
                item.actual_price = actual_price
                item.save()
        
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
        item.delete()
        cart = self.get_cart(request)
        serializer = CartSerializer(cart)
        return Response(serializer.data)

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
                
            # Clear cart after successful order creation
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
                        'product_type': product_type,  # Add product type from ProductGroup
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
        return Response(serializer.data, status=status.HTTP_201_CREATED)

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
