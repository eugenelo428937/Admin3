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
from core_auth.email_service import EmailService

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
        
        # Note: Quantity updates are now handled within each specific branch above
        # No need for additional quantity updates here
        
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
                    quantity=item.quantity,
                    price_type=item.price_type,
                    actual_price=item.actual_price,
                    metadata=item.metadata
                )
            cart.items.all().delete()
            
            # Send order confirmation email
            try:
                EmailService.send_order_confirmation(order)
            except Exception as e:
                # Log the error but don't fail the order
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to send order confirmation email for order #{order.id}: {str(e)}")
        
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
