from django.shortcuts import render
from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import transaction
from decimal import Decimal
from .models import Cart, CartItem, CartFee, ActedOrder, ActedOrderItem, OrderUserAcknowledgment, OrderUserPreference, OrderUserContact, OrderDeliveryDetail
from .serializers import CartSerializer, CartItemSerializer, ActedOrderSerializer
from store.models import Product as StoreProduct
from catalog.models import ProductProductVariation
from marking.models import MarkingPaper
from utils.email_service import email_service
from .services.vat_orchestrator import vat_orchestrator
import logging
from django.utils import timezone

logger = logging.getLogger(__name__)

# Constants
CART_VAT_ERROR_FIELDS = ['vat_calculation_error', 'vat_calculation_error_message']
CART_ITEM_VAT_FIELDS = ['vat_region', 'vat_rate', 'vat_amount', 'gross_amount']

class CartViewSet(viewsets.ViewSet):
    """
    API endpoints for cart operations: fetch, add, update, remove items.
    Handles both authenticated users and guests (via session_key).
    """
    permission_classes = [AllowAny]
    
    def dispatch(self, request, *args, **kwargs):

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
        """Check if cart item contains digital products (eBooks, Online Classroom, Hub)"""
        try:
            metadata = cart_item.metadata or {}

            # PRIMARY: Check variation_type via variationId (most reliable)
            if metadata.get('variationId'):
                # ProductProductVariation imported at top from catalog.models
                try:
                    ppv = ProductProductVariation.objects.select_related('product_variation').get(
                        id=metadata.get('variationId')
                    )
                    variation_type = ppv.product_variation.variation_type.lower()
                    if variation_type in ['ebook', 'hub']:
                        return True
                except ProductProductVariation.DoesNotExist:
                    pass

            # FALLBACK: Check variationName contains 'ebook' or 'hub' (case insensitive)
            variation_name = (metadata.get('variationName') or '').lower()
            if 'ebook' in variation_name or 'hub' in variation_name:
                return True

            # Check product code for Online Classroom
            if hasattr(cart_item, 'product') and cart_item.product:
                product = cart_item.product.product  # store.Product -> catalog.Product via .product property
                if product and hasattr(product, 'code') and product.code == 'OC':
                    return True

            return False
        except Exception as e:
            logger.warning(f"Error checking digital product for cart item {cart_item.id}: {str(e)}")
            return False

    def _is_tutorial_product(self, cart_item):
        """Check if cart item is a tutorial product"""
        try:
            metadata = cart_item.metadata or {}
            # Check if it's explicitly marked as tutorial in metadata
            if metadata.get('type') == 'tutorial':
                return True

            # Check product code for Tutorial
            if hasattr(cart_item, 'product') and cart_item.product:
                product = cart_item.product.product  # store.Product -> catalog.Product via .product property
                if product and hasattr(product, 'code'):
                    # Tutorial codes typically start with 'T' or have 'Tutorial' in name
                    if product.code in ['T', 'TUT'] or 'tutorial' in product.fullname.lower():
                        return True

            return False
        except Exception as e:
            logger.warning(f"Error checking tutorial product for cart item {cart_item.id}: {str(e)}")
            return False

    def _is_material_product(self, cart_item):
        """Check if cart item is a material product (printed book or eBook)"""
        try:
            metadata = cart_item.metadata or {}

            # PRIMARY: Check variation_type via variationId (most reliable)
            if metadata.get('variationId'):
                # ProductProductVariation imported at top from catalog.models
                try:
                    ppv = ProductProductVariation.objects.select_related('product_variation').get(
                        id=metadata.get('variationId')
                    )
                    variation_type = ppv.product_variation.variation_type.lower()
                    if variation_type in ['ebook', 'printed', 'hub']:
                        return True
                except ProductProductVariation.DoesNotExist:
                    pass

            # FALLBACK: Check variationName contains material-related terms (case insensitive)
            variation_name = (metadata.get('variationName') or '').lower()
            if 'ebook' in variation_name or 'printed' in variation_name or 'hub' in variation_name:
                return True

            # Check product code for Materials
            if hasattr(cart_item, 'product') and cart_item.product:
                product = cart_item.product.product  # store.Product -> catalog.Product via .product property
                if product and hasattr(product, 'code'):
                    # Material codes typically have 'M' or 'MAT'
                    if product.code in ['M', 'MAT', 'BOOK'] or 'material' in product.fullname.lower():
                        return True

            return False
        except Exception as e:
            logger.warning(f"Error checking material product for cart item {cart_item.id}: {str(e)}")
            return False

    def _update_cart_flags(self, cart):
        """Update cart-level flags based on cart contents"""
        has_marking = False
        has_digital = False
        has_tutorial = False
        has_material = False

        for item in cart.items.all():
            if item.is_marking:
                has_marking = True

            # Check if this item is a digital product
            if self._is_digital_product(item):
                has_digital = True

            # Check if this item is a tutorial product
            if self._is_tutorial_product(item):
                has_tutorial = True

            # Check if this item is a material product
            if self._is_material_product(item):
                has_material = True

            # Early exit if all flags are set
            if has_marking and has_digital and has_tutorial and has_material:
                break

        # Update flags if changed
        cart_updated = False
        if cart.has_marking != has_marking:
            cart.has_marking = has_marking
            cart_updated = True

        if cart.has_digital != has_digital:
            cart.has_digital = has_digital
            cart_updated = True

        if cart.has_tutorial != has_tutorial:
            cart.has_tutorial = has_tutorial
            cart_updated = True

        if cart.has_material != has_material:
            cart.has_material = has_material
            cart_updated = True

        if cart_updated:
            cart.save()

    def _trigger_vat_calculation(self, cart):
        """
        Trigger VAT calculation for cart using VAT orchestrator service (Phase 5).

        Handles errors gracefully by setting cart error flags.
        Updates individual CartItem VAT fields from orchestrator result.
        """
        try:
            # Execute VAT calculation via orchestrator
            result = vat_orchestrator.execute_vat_calculation(cart)

            # Update individual CartItem VAT fields from orchestrator result
            self._update_cart_item_vat_fields(cart, result)

            # Clear error flags on success
            cart.vat_calculation_error = False
            cart.vat_calculation_error_message = None
            cart.save(update_fields=CART_VAT_ERROR_FIELDS)

            logger.info(f"VAT calculation successful for cart {cart.id}: {result.get('region')}")

        except Exception as e:
            # Log error and set error flags
            logger.error(f"VAT calculation failed for cart {cart.id}: {str(e)}")

            cart.vat_calculation_error = True
            cart.vat_calculation_error_message = str(e)
            cart.save(update_fields=CART_VAT_ERROR_FIELDS)

    def _update_cart_item_vat_fields(self, cart, vat_result):
        """
        Update CartItem VAT fields from orchestrator result.

        Extracts VAT data from orchestrator result and updates
        individual cart item fields for backward compatibility.
        """
        # Get region and items from result
        region = vat_result.get('region', 'UNKNOWN')
        items_vat = vat_result.get('items', [])

        # Create lookup map by item ID
        vat_by_item_id = {item.get('id'): item for item in items_vat}

        # Update each cart item's VAT fields
        for cart_item in cart.items.all():
            item_id_str = str(cart_item.id)
            vat_data = vat_by_item_id.get(item_id_str, {})

            # Update VAT fields
            cart_item.vat_region = vat_data.get('vat_region', region)
            cart_item.vat_rate = Decimal(str(vat_data.get('vat_rate', '0.0000')))
            cart_item.vat_amount = Decimal(str(vat_data.get('vat_amount', '0.00')))
            cart_item.gross_amount = Decimal(str(vat_data.get('gross_amount', '0.00')))

            cart_item.save(update_fields=CART_ITEM_VAT_FIELDS)

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

        # Try to find store.Product by ID first
        product = StoreProduct.objects.filter(id=product_id).first()

        # If not found, the frontend may be sending an ESSP ID with variationId (PPV ID)
        # Look up store.Product via the PPV ID from metadata
        if not product and metadata.get('variationId'):
            ppv_id = metadata.get('variationId')
            product = StoreProduct.objects.filter(
                product_product_variation_id=ppv_id
            ).first()
            if product:
                logger.info(
                    f"Cart add: Resolved ESSP ID {product_id} to store.Product {product.id} "
                    f"via PPV ID {ppv_id}"
                )

        if not product:
            logger.warning(
                f"Cart add: Could not find store.Product for ID {product_id} "
                f"or variationId {metadata.get('variationId')}"
            )
            return Response(
                {"detail": "No Product matches the given query."},
                status=status.HTTP_404_NOT_FOUND
            )
        
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

        # Trigger VAT calculation (Phase 5)
        self._trigger_vat_calculation(cart)

        # Get updated cart and return response
        cart = self.get_cart(request)
        serializer = CartSerializer(cart, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['patch'], url_path='update_item')
    def update_item(self, request):
        """PATCH /cart/update_item/ - Update cart item (quantity, metadata, price)"""
        item_id = request.data.get('item_id')
        quantity = request.data.get('quantity')
        metadata = request.data.get('metadata')
        actual_price = request.data.get('actual_price')
        price_type = request.data.get('price_type')

        item = get_object_or_404(CartItem, id=item_id)

        # Update quantity if provided
        if quantity is not None:
            item.quantity = int(quantity)

        # Update metadata if provided (important for tutorial choice updates)
        if metadata is not None:
            item.metadata = metadata

        # Update actual_price if provided
        if actual_price is not None:
            item.actual_price = actual_price

        # Update price_type if provided
        if price_type is not None:
            item.price_type = price_type

        item.save()

        # Trigger VAT recalculation after item update (Phase 5)
        cart = self.get_cart(request)
        self._trigger_vat_calculation(cart)

        serializer = CartSerializer(cart, context={'request': request})
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

        # Trigger VAT recalculation after item removal (Phase 5)
        self._trigger_vat_calculation(cart)

        cart = self.get_cart(request)
        serializer = CartSerializer(cart, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='clear')
    def clear(self, request):
        """POST /cart/clear/ - Remove all items from cart"""
        cart = self.get_cart(request)
        cart.items.all().delete()

        # Update cart-level flags after clearing
        self._update_cart_flags(cart)

        # Trigger VAT recalculation for empty cart (Phase 5)
        self._trigger_vat_calculation(cart)

        serializer = CartSerializer(cart, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='vat/recalculate')
    def vat_recalculate(self, request):
        """
        POST /cart/vat/recalculate/ - Force fresh VAT calculation for cart

        Phase 5: Manual VAT recalculation endpoint using VAT orchestrator
        """
        cart = self.get_cart(request)

        # Trigger VAT calculation via orchestrator (handles errors internally)
        self._trigger_vat_calculation(cart)

        # Return full cart data with fresh VAT totals
        serializer = CartSerializer(cart, context={'request': request})
        return Response(serializer.data)

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
        user_preferences = payment_data.get('user_preferences', {})

        # Extract T&C acceptance data - support both nested and root-level formats
        terms_acceptance_data = payment_data.get('terms_acceptance', {})
        # Check root level first (new format), then nested (legacy format)
        general_terms_accepted = payment_data.get('general_terms_accepted',
                                                  terms_acceptance_data.get('general_terms_accepted', False))
        terms_version = terms_acceptance_data.get('terms_version', '1.0')
        product_acknowledgments = terms_acceptance_data.get('product_acknowledgments', {})

        # Validate payment data BEFORE creating order
        if payment_method == 'card' and not card_data:
            return Response({'detail': 'Card data is required for card payments.'},
                          status=status.HTTP_400_BAD_REQUEST)

        if payment_method == 'invoice' and not employer_code:
            return Response({'detail': 'Employer code is required for invoice payments.'},
                          status=status.HTTP_400_BAD_REQUEST)

        # CRITICAL FIX: Validate blocking acknowledgments before order creation
        from rules_engine.services.rule_engine import rule_engine

        # Build context for checkout_payment rules validation
        cart_total = sum(float(item.actual_price or 0) * item.quantity for item in cart.items.all())

        checkout_context = {
            'cart': {
                'id': cart.id,
                'total': cart_total,
                'has_tutorial': cart.has_tutorial,
                'has_material': cart.has_material,
                'has_marking': cart.has_marking,
                'has_digital': cart.has_digital,
                'items': [
                    {
                        'id': item.id,
                        'product_id': item.product.product.id,
                        'quantity': item.quantity,
                        'actual_price': str(item.actual_price or 0),
                        'metadata': item.metadata or {}
                    }
                    for item in cart.items.all()
                ]
            },
            'payment': {
                'method': payment_method,
                'is_card': payment_method == 'card'
            },
            'user': {
                'id': user.id,
                'email': user.email,
                'is_authenticated': True
            },
            # Include session acknowledgments to check for blocking conditions
            'acknowledgments': {}
        }

        # Add session acknowledgments to context for validation
        session_acknowledgments = request.session.get('user_acknowledgments', [])
        if session_acknowledgments:
            for ack in session_acknowledgments:
                ack_key = ack.get('ack_key')
                if ack_key:
                    checkout_context['acknowledgments'][ack_key] = {
                        'acknowledged': ack.get('acknowledged', False),
                        'message_id': ack.get('message_id'),
                        'timestamp': ack.get('acknowledged_timestamp'),
                        'entry_point_location': ack.get('entry_point_location')
                    }


        # Execute checkout_payment rules to check for blocking conditions
        try:
            validation_result = rule_engine.execute('checkout_payment', checkout_context)

            # Check if any rules are blocking the checkout
            if validation_result.get('blocked'):
                blocking_message = "Checkout cannot proceed. Please complete all required acknowledgments."

                # Extract specific blocking reasons if available
                required_acknowledgments = validation_result.get('required_acknowledgments', [])
                if required_acknowledgments:
                    blocking_details = [f"Required: {req.get('title', req.get('ack_key', 'Unknown'))}"
                                      for req in required_acknowledgments]
                    blocking_message = f"Checkout blocked. Missing required acknowledgments: {', '.join(blocking_details)}"

                logger.warning(f"🚨 [Checkout Blocked] User {user.id} checkout blocked: {blocking_message}")

                return Response({
                    'detail': blocking_message,
                    'blocked': True,
                    'required_acknowledgments': required_acknowledgments,
                    'blocking_rules': validation_result.get('blocking_rules', [])
                }, status=status.HTTP_400_BAD_REQUEST)


        except Exception as e:
            logger.error(f"❌ [Checkout Validation] Failed to validate blocking acknowledgments: {str(e)}")
            # For safety, allow checkout to proceed if validation fails (log the error)
            logger.warning(f"⚠️  [Checkout Validation] Proceeding with checkout despite validation error for user {user.id}")

        # END OF BLOCKING VALIDATION FIX

        # Get client information
        client_ip = self._get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        # IMPORTANT: Calculate VAT OUTSIDE transaction.atomic() block
        # If VAT calculation fails inside atomic block, it breaks the transaction
        try:
            vat_result = vat_orchestrator.execute_vat_calculation(cart)
            vat_totals = vat_result.get('totals', {})
            vat_items = vat_result.get('items', [])
            region = vat_result.get('region', 'UNKNOWN')

            # Create VAT item lookup by cart item ID (orchestrator uses 'id' not 'item_id')
            vat_by_item_id = {str(item.get('id')): item for item in vat_items}
        except Exception as e:
            logger.error(f"Failed to calculate VAT for cart {cart.id}: {str(e)}")
            # Fallback to zero VAT (using orchestrator field names)
            vat_totals = {
                'net': '0.00',
                'vat': '0.00',
                'gross': '0.00'
            }
            vat_by_item_id = {}
            region = 'UNKNOWN'
            # Create fallback vat_result to avoid UnboundLocalError
            vat_result = {
                'totals': vat_totals,
                'items': [],
                'region': region,
                'error': str(e),
                'fallback': True
            }

        # Now enter atomic block for order creation with calculated VAT data
        with transaction.atomic():
            # Convert VAT totals to Decimal and create order
            order = ActedOrder.objects.create(
                user=user,
                subtotal=Decimal(vat_totals.get('net', '0.00')),
                vat_amount=Decimal(vat_totals.get('vat', '0.00')),
                total_amount=Decimal(vat_totals.get('gross', '0.00')),
                vat_rate=Decimal('0.00'),  # Rate is stored per-item, not order-level
                vat_country=region if region != 'UNKNOWN' else None,
                vat_calculation_type='rules_engine_vat_v1',
                calculations_applied={'vat_result': vat_result}  # Store full VAT result
            )
            order_items = []

            for item in cart.items.all():
                # Get VAT info for this item (orchestrator uses string IDs)
                vat_info = vat_by_item_id.get(str(item.id), {})

                # Orchestrator returns string values, convert to Decimal
                # Calculate net_amount from item's actual_price * quantity
                item_net = (item.actual_price or Decimal('0.00')) * item.quantity

                # Get VAT amount from orchestrator result (string to Decimal)
                vat_amount = Decimal(str(vat_info.get('vat_amount', '0.00')))

                # Calculate VAT rate as decimal fraction (e.g., 0.20 for 20%, not 20.00)
                # Field is DECIMAL(5,4) which stores values like 0.2000
                if item_net > 0:
                    vat_rate = (vat_amount / item_net).quantize(Decimal('0.0001'))
                else:
                    vat_rate = Decimal('0.0000')

                # Calculate gross amount (net + VAT per unit)
                net_amount = item.actual_price or Decimal('0.00')
                vat_per_unit = vat_amount / item.quantity if item.quantity > 0 else Decimal('0.00')
                gross_amount = net_amount + vat_per_unit

                order_item = ActedOrderItem.objects.create(
                    order=order,
                    product=item.product,
                    quantity=item.quantity,
                    price_type=item.price_type,
                    actual_price=item.actual_price,
                    net_amount=net_amount,
                    vat_amount=vat_amount,
                    gross_amount=gross_amount,
                    vat_rate=vat_rate,
                    is_vat_exempt=(vat_rate == Decimal('0.00')),
                    metadata=item.metadata
                )
                order_items.append(order_item)

            # Add cart fees as order items (fees are typically VAT-exempt or have their own VAT treatment)
            for fee in cart.fees.all():
                fee_order_item = ActedOrderItem.objects.create(
                    order=order,
                    item_type='fee',
                    quantity=1,
                    actual_price=fee.amount,
                    net_amount=fee.amount,
                    vat_amount=Decimal('0.00'),
                    gross_amount=fee.amount,
                    vat_rate=Decimal('0.00'),
                    is_vat_exempt=True,
                    metadata={
                        'fee_type': fee.fee_type,
                        'fee_name': fee.name,
                        'fee_description': fee.description,
                        'fee_currency': fee.currency,
                        'fee_id': fee.id
                    }
                )
                order_items.append(fee_order_item)

            # Save user preferences to order
            if user_preferences:
                try:
                    self._save_user_preferences_to_order(order, user_preferences)
                except Exception as e:
                    logger.warning(f"Failed to save user preferences for order {order.id}: {str(e)}")
                    # Continue with checkout - preference saving failure shouldn't block checkout

            # CRITICAL FIX: Always extract essential contact and delivery data for order records
            # This runs regardless of whether user_preferences exist from rules engine
            try:
                self._extract_and_save_essential_order_data(order, user, user_preferences)
            except Exception as e:
                logger.warning(f"Failed to extract essential order data for order {order.id}: {str(e)}")
                # Continue with checkout - this is logged but shouldn't block

            # Transfer session acknowledgments to order before T&C processing
            self._transfer_session_acknowledgments_to_order(request, order, cart)

            # Create T&C acceptance record
            try:
                # Get rules engine evaluation data for checkout_terms entry point
                from rules_engine.services.rule_engine import rule_engine
                rules_evaluation = rule_engine.evaluate_rules(
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
                
            except Exception as e:
                logger.warning(f"Failed to create T&C acceptance record for order {order.id}: {str(e)}")
                # Continue with checkout - T&C acceptance is recorded but not blocking
            
            # Process expired deadline acknowledgments if any
            try:
                # Check if there are expired deadline acknowledgments in product_acknowledgments
                expired_deadline_rules = [k for k in product_acknowledgments.keys() if 'expired' in k.lower() and 'deadline' in k.lower()]
                
                if expired_deadline_rules:
                    # Get the rule evaluation for checkout_start to find expired deadline rule
                    from rules_engine.services.rule_engine import rule_engine
                    from rules_engine.models import Rule, MessageTemplate

                    checkout_evaluation = rule_engine.evaluate_rules(
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
                    
            except Exception as e:
                logger.warning(f"Failed to create expired deadline acknowledgment for order {order.id}: {str(e)}")
                # Continue with checkout - acknowledgment is recorded but not blocking

            # Process payment based on payment method
            from .services import payment_service
            payment_result = None
            if payment_method == 'card':
                payment_result = payment_service.process_card_payment(order, card_data, client_ip, user_agent)
                if not payment_result['success']:
                    # Payment failed - delete order and return error response
                    order.delete()
                    return Response({
                        'detail': f"Payment failed: {payment_result.get('error_message', 'Unknown error')}",
                        'error_code': payment_result.get('error_code', 'PAYMENT_FAILED'),
                        'success': False
                    }, status=status.HTTP_400_BAD_REQUEST)
            elif payment_method == 'invoice':
                payment_result = payment_service.process_invoice_payment(order, client_ip, user_agent)
                if not payment_result['success']:
                    # Invoice creation failed - delete order and return error response
                    order.delete()
                    return Response({
                        'detail': f"Invoice creation failed: {payment_result.get('error_message', 'Unknown error')}",
                        'error_code': payment_result.get('error_code', 'INVOICE_FAILED'),
                        'success': False
                    }, status=status.HTTP_400_BAD_REQUEST)

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
                order_data['vat_amount'] = 0  # VAT will be calculated by new rules engine
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
                            # ProductProductVariation imported at top from catalog.models
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
                    pass
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
        CRITICAL FIX: Transfer ALL session acknowledgments to separate database records.

        Session acknowledgments were collected when rules matched during the user's journey.
        During checkout, we should preserve ALL of them as separate records, not filter them out.
        Each acknowledgment (terms & conditions, tutorial credit card, digital consent, etc.)
        must be stored as a SEPARATE row in acted_order_user_acknowledgments table.
        """
        try:
            session_acknowledgments = request.session.get('user_acknowledgments', [])
            if not session_acknowledgments:
                return

            # CRITICAL FIX: Get rules that matched in current execution for audit purposes only
            matched_rule_ids = self._get_matched_rules_for_current_execution(order, cart)

            # FIXED: Transfer ALL session acknowledgments as separate records
            # No filtering - each acknowledgment gets its own database row
            valid_acknowledgments = session_acknowledgments

            # Create a separate order acknowledgment record for each acknowledgment
            # This ensures each acknowledgment (terms, digital consent, tutorial credit card, etc.)
            # gets its own row in the database
            for ack in valid_acknowledgments:
                message_id = ack.get('message_id')
                ack_key = ack.get('ack_key', '')
                entry_point = ack.get('entry_point_location', '')

                # Determine acknowledgment type based on ack_key and entry_point
                acknowledgment_type = 'custom'
                if 'terms' in ack_key.lower():
                    acknowledgment_type = 'terms_conditions'
                elif 'expired' in ack_key.lower() and 'deadline' in ack_key.lower():
                    acknowledgment_type = 'deadline_expired'
                elif 'warning' in ack_key.lower():
                    acknowledgment_type = 'warning'
                elif ('credit_card' in ack_key.lower() or 'tutorial' in ack_key.lower()) and entry_point == 'checkout_payment':
                    acknowledgment_type = 'product_specific'
                elif 'digital' in ack_key.lower() and 'consent' in ack_key.lower():
                    acknowledgment_type = 'digital_consent'

                # Create acknowledgment data for this specific acknowledgment
                acknowledgment_data = {
                    'ack_key': ack_key,
                    'message_id': message_id,
                    'entry_point': entry_point,
                    'acknowledged_timestamp': ack.get('acknowledged_timestamp'),
                    'ip_address': ack.get('ip_address', ''),
                    'user_agent': ack.get('user_agent', ''),
                    'validation_info': {
                        'transfer_mode': 'all_session_acknowledgments_preserved',
                        'matched_rule_ids_at_transfer': list(matched_rule_ids),
                        'no_filtering_applied': True
                    }
                }

                # Determine a more descriptive title based on ack_key
                title = f'Session Acknowledgment {message_id}'
                if 'terms' in ack_key.lower():
                    title = 'Terms and Conditions Acknowledgment'
                elif 'tutorial_credit_card' in ack_key.lower():
                    title = 'Tutorial Credit Card Payment Acknowledgment'
                elif 'digital' in ack_key.lower() and 'consent' in ack_key.lower():
                    title = 'Digital Content Consent'
                elif 'expired' in ack_key.lower() and 'deadline' in ack_key.lower():
                    title = 'Expired Deadline Warning Acknowledgment'

                # Create the order acknowledgment record - one per acknowledgment
                # Extract rule_id as integer if possible, otherwise use None
                try:
                    if message_id is not None:
                        if isinstance(message_id, int):
                            rule_id_int = message_id
                        elif isinstance(message_id, str) and message_id.isdigit():
                            rule_id_int = int(message_id)
                        else:
                            rule_id_int = None
                    else:
                        rule_id_int = None
                except (ValueError, TypeError):
                    rule_id_int = None

                # Extract template_id as integer if possible
                try:
                    if message_id is not None:
                        if isinstance(message_id, int):
                            template_id_int = message_id
                        elif isinstance(message_id, str) and message_id.isdigit():
                            template_id_int = int(message_id)
                        else:
                            template_id_int = None
                    else:
                        template_id_int = None
                except (ValueError, TypeError):
                    template_id_int = None

                # Get IP address - use None for empty/invalid values (GenericIPAddressField)
                ip_addr = ack.get('ip_address')
                if not ip_addr or ip_addr == '':
                    ip_addr = None

                order_acknowledgment = OrderUserAcknowledgment.objects.create(
                    order=order,
                    acknowledgment_type=acknowledgment_type,
                    rule_id=rule_id_int,  # Use integer rule_id or None
                    template_id=template_id_int,  # Use integer template_id or None
                    title=title,
                    content_summary=f'User acknowledged {ack_key} at {entry_point}',
                    is_accepted=ack.get('acknowledged', False),
                    ip_address=ip_addr,
                    user_agent=ack.get('user_agent', ''),
                    content_version='1.0',
                    acknowledgment_data=acknowledgment_data,
                    rules_engine_context={
                        'transferred_from_session': True,
                        'session_id': request.session.session_key,
                        'transfer_timestamp': timezone.now().isoformat(),
                        'validation_note': 'All session acknowledgments transferred as separate records',
                        'matched_rule_ids_at_transfer': list(matched_rule_ids),
                        'entry_point': entry_point,
                        'ack_key': ack_key,
                        'original_message_id': message_id,
                        # Store ONLY this specific acknowledgment, not all session data
                        'original_acknowledgment': ack
                    }
                )

            # Clear session acknowledgments after successful transfer
            request.session['user_acknowledgments'] = []
            request.session.modified = True

        except Exception as e:
            logger.error(f"Failed to transfer session acknowledgments to order {order.id}: {str(e)}")
            # Don't raise exception - acknowledgment transfer failure shouldn't block checkout

    def _get_matched_rules_for_current_execution(self, order, cart):
        """
        Execute rules engine for ALL checkout entry points and return which rules actually matched
        Uses the cart that's being processed for checkout to ensure accurate rule matching

        CRITICAL FIX: Previous version only checked checkout_terms entry point, but acknowledgments
        can come from checkout_terms, checkout_payment, and other entry points throughout the flow.
        This was causing valid acknowledgments to be incorrectly marked as "stale" and discarded.
        """
        try:
            if not cart:
                logger.warning(f"No cart provided for order {order.id}, cannot validate acknowledgments")
                return set()

            # Build context for rules execution
            cart_items = cart.items.all().select_related('product__product', 'product__exam_session_subject__subject')

            # Use the cart's has_digital flag instead of manually detecting
            has_digital = cart.has_digital
            has_tutorial = cart.has_tutorial

            # Calculate total from cart items since Cart model doesn't have subtotal
            total = sum(item.actual_price or 0 for item in cart_items)

            context = {
                'cart': {
                    'id': cart.id,
                    'user_id': cart.user.id if cart.user else None,
                    'has_digital': has_digital,
                    'has_tutorial': has_tutorial,
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

            # Execute rules engine for ALL relevant entry points that can generate acknowledgments
            # This ensures we validate acknowledgments from the entire checkout flow, not just checkout_terms
            entry_points_to_check = ['checkout_terms', 'checkout_payment']
            matched_rule_ids = set()

            from rules_engine.services.rule_engine import rule_engine

            for entry_point in entry_points_to_check:
                result = rule_engine.execute(entry_point, context)

                if not result.get('success'):
                    logger.warning(f"Rules execution failed for entry point '{entry_point}' on order {order.id}: {result.get('error')}")
                    continue

                # Extract rule IDs that actually matched and executed for this entry point
                entry_point_matched_ids = set()

                # Check rules_executed list for rules that had condition_result=True
                for rule_exec in result.get('rules_executed', []):
                    if rule_exec.get('condition_result'):
                        rule_id = rule_exec.get('rule_id')
                        entry_point_matched_ids.add(rule_id)
                        matched_rule_ids.add(rule_id)

                # Also check messages for template_ids that were generated
                for message in result.get('messages', []):
                    template_id = message.get('template_id')
                    if template_id:
                        entry_point_matched_ids.add(str(template_id))
                        matched_rule_ids.add(str(template_id))

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

    def _save_user_preferences_to_order(self, order, user_preferences):
        """Save user preferences from checkout to order preferences table"""
        from rules_engine.models import ActedRule

        for preference_key, preference_data in user_preferences.items():
            try:
                # Extract preference details
                value = preference_data.get('value', '')
                input_type = preference_data.get('inputType', 'text')
                rule_id = preference_data.get('ruleId')

                # Skip empty preferences
                if not value and value != 0 and value != False:
                    continue

                # Find the rule if rule_id is provided
                rule = None
                if rule_id:
                    try:
                        # Try to get rule by numeric ID first, then by rule_code string
                        if str(rule_id).isdigit():
                            rule = ActedRule.objects.get(id=int(rule_id))
                        else:
                            rule = ActedRule.objects.get(rule_code=rule_id)
                    except ActedRule.DoesNotExist:
                        logger.warning(f"Rule with ID/rule_id {rule_id} not found for preference {preference_key}")
                        # Continue without rule reference

                # Create the order preference record
                order_preference = OrderUserPreference.objects.create(
                    order=order,
                    rule=rule,
                    preference_key=preference_key,
                    preference_value={
                        'value': value,
                        'input_type': input_type,
                        'collected_at': timezone.now().isoformat()
                    }
                )

            except Exception as e:
                logger.error(f"Failed to save preference '{preference_key}': {str(e)}")
                # Continue with other preferences

        # NEW: Also extract and save delivery address data to new specialized models
        # NOTE: Contact data extraction is handled by _extract_and_save_essential_order_data above
        self._extract_and_save_delivery_preferences(order, user_preferences)

    def _extract_and_save_contact_data(self, order, user_preferences):
        """Extract contact information from user preferences and save to OrderUserContact"""
        from .models import OrderUserContact

        # Check if we have contact data in the preferences
        contact_data = {}

        # Map preference keys to contact fields (including country codes)
        contact_mapping = {
            'home_phone': 'home_phone',
            'home_phone_country': 'home_phone_country',
            'mobile_phone': 'mobile_phone',
            'mobile_phone_country': 'mobile_phone_country',
            'work_phone': 'work_phone',
            'work_phone_country': 'work_phone_country',
            'email_address': 'email_address',
            'email': 'email_address'  # Alternative key
        }

        for pref_key, pref_data in user_preferences.items():
            if pref_key in contact_mapping:
                value = pref_data.get('value', '') if isinstance(pref_data, dict) else pref_data
                if value:  # Only save non-empty values
                    contact_data[contact_mapping[pref_key]] = value

        # Also check for nested contact object (from "For this order only" submissions)
        if 'contact' in user_preferences:
            contact_prefs = user_preferences['contact']
            if isinstance(contact_prefs, dict):
                for field in ['home_phone', 'home_phone_country', 'mobile_phone', 'mobile_phone_country',
                              'work_phone', 'work_phone_country', 'email_address']:
                    value = contact_prefs.get('value', {}).get(field) or contact_prefs.get(field)
                    if value:
                        contact_data[field] = value

        # Create OrderUserContact record if we have any contact data
        if contact_data:
            try:
                # Check if record already exists
                existing_contact = OrderUserContact.objects.filter(order=order).first()
                if existing_contact:
                    # Update existing record
                    for field, value in contact_data.items():
                        setattr(existing_contact, field, value)
                    existing_contact.save()
                else:
                    # Create new record
                    OrderUserContact.objects.create(order=order, **contact_data)
            except Exception as e:
                logger.error(f"Failed to save OrderUserContact for order {order.id}: {str(e)}")

    def _extract_and_save_delivery_preferences(self, order, user_preferences):
        """Extract delivery/address information from user preferences and save to OrderDeliveryDetail"""
        from .models import OrderDeliveryDetail
        import logging
        logger = logging.getLogger(__name__)


        # Check if we have delivery/address data in the preferences
        delivery_data = {}

        if user_preferences:
            for pref_key, pref_data in user_preferences.items():
                value = pref_data.get('value', '') if isinstance(pref_data, dict) else pref_data

                # Handle the new address data structure from frontend
                if pref_key == 'delivery_address_type':
                    delivery_data['delivery_address_type'] = str(value).lower()

                elif pref_key == 'delivery_address_data':
                    # Parse JSON address data and store complete object in JSONB field
                    try:
                        import json
                        address_data = json.loads(str(value)) if isinstance(value, str) else value

                        if isinstance(address_data, dict):
                            # Store complete address object in JSONB field
                            delivery_data['delivery_address_data'] = address_data
                    except Exception as e:
                        logger.warning(f"🔍 [Backend] Failed to parse delivery address data: {e}")

                elif pref_key == 'invoice_address_type':
                    delivery_data['invoice_address_type'] = str(value).lower()

                elif pref_key == 'invoice_address_data':
                    # Parse JSON address data for invoice and store complete object in JSONB field
                    try:
                        import json
                        address_data = json.loads(str(value)) if isinstance(value, str) else value

                        if isinstance(address_data, dict):
                            # Store complete address object in JSONB field
                            delivery_data['invoice_address_data'] = address_data
                    except Exception as e:
                        logger.warning(f"🔍 [Backend] Failed to parse invoice address data: {e}")

        # Create OrderDeliveryDetail record if we have any delivery data
        if delivery_data:
            try:
                # Check if record already exists
                existing_detail = OrderDeliveryDetail.objects.filter(order=order).first()
                if existing_detail:
                    # Update existing record
                    for field, value in delivery_data.items():
                        setattr(existing_detail, field, value)
                    existing_detail.save()
                else:
                    # Create new record
                    delivery_detail = OrderDeliveryDetail.objects.create(order=order, **delivery_data)
            except Exception as e:
                logger.error(f"❌ [Backend] Failed to save OrderDeliveryDetail for order {order.id}: {str(e)}")
                logger.error(f"❌ [Backend] Delivery data that failed: {delivery_data}")

    def _extract_and_save_essential_order_data(self, order, user, user_preferences=None):
        """
        CRITICAL FIX: Always extract essential contact and delivery data for orders
        This method runs regardless of whether user_preferences exist from rules engine
        """
        import logging
        logger = logging.getLogger(__name__)

        try:
            # Always try to extract contact data (essential for email/phone)
            self._extract_and_save_contact_data_fallback(order, user, user_preferences)
        except Exception as e:
            logger.warning(f"Failed to extract contact data for order {order.id}: {str(e)}")

        try:
            # Always try to extract delivery data (essential for address)
            self._extract_and_save_delivery_preferences_fallback(order, user, user_preferences)
        except Exception as e:
            logger.warning(f"Failed to extract delivery data for order {order.id}: {str(e)}")

    def _extract_and_save_contact_data_fallback(self, order, user, user_preferences=None):
        """Extract contact data from user_preferences or fallback to user profile"""
        from .models import OrderUserContact
        import logging
        logger = logging.getLogger(__name__)

        contact_data = {}

        # Try to get data from user_preferences first
        if user_preferences:
            for pref_key, pref_data in user_preferences.items():
                value = pref_data.get('value', '') if isinstance(pref_data, dict) else pref_data

                # Map preference keys to contact fields with specific mapping (including country codes)
                if pref_key == 'mobile_phone':
                    contact_data['mobile_phone'] = str(value)
                elif pref_key == 'mobile_phone_country':
                    contact_data['mobile_phone_country'] = str(value)
                elif pref_key == 'home_phone':
                    contact_data['home_phone'] = str(value)
                elif pref_key == 'home_phone_country':
                    contact_data['home_phone_country'] = str(value)
                elif pref_key == 'work_phone':
                    contact_data['work_phone'] = str(value)
                elif pref_key == 'work_phone_country':
                    contact_data['work_phone_country'] = str(value)
                elif pref_key == 'email_address' or pref_key == 'email':
                    contact_data['email_address'] = str(value)

        # Fallback to user profile data if no preferences
        if not contact_data.get('email_address') and user:
            contact_data['email_address'] = user.email

        # Get phone from user profile if available
        if not contact_data.get('mobile_phone') and user:
            try:
                if hasattr(user, 'profile') and hasattr(user.profile, 'phone'):
                    contact_data['mobile_phone'] = str(user.profile.phone)
                elif hasattr(user, 'phone'):
                    contact_data['mobile_phone'] = str(user.phone)
            except:
                pass  # No phone data available

        # Create contact record if we have any data
        if contact_data:
            try:
                contact_record = OrderUserContact.objects.create(order=order, **contact_data)
            except Exception as e:
                logger.error(f"❌ [Backend] Failed to create OrderUserContact for order {order.id}: {str(e)}")
                logger.error(f"❌ [Backend] Contact data that failed: {contact_data}")

    def _extract_and_save_delivery_preferences_fallback(self, order, user, user_preferences=None):
        """Extract delivery data from user_preferences or fallback to user profile"""
        from .models import OrderDeliveryDetail
        import logging
        logger = logging.getLogger(__name__)

        delivery_data = {}

        # Try to get data from user_preferences first
        if user_preferences:
            for pref_key, pref_data in user_preferences.items():
                value = pref_data.get('value', '') if isinstance(pref_data, dict) else pref_data

                # Map preference keys to delivery fields
                if 'address' in pref_key.lower():
                    if 'line1' in pref_key.lower() or 'street' in pref_key.lower():
                        delivery_data['delivery_address_line1'] = str(value)
                    elif 'line2' in pref_key.lower():
                        delivery_data['delivery_address_line2'] = str(value)
                    elif 'city' in pref_key.lower():
                        delivery_data['delivery_city'] = str(value)
                    elif 'postcode' in pref_key.lower() or 'postal' in pref_key.lower():
                        delivery_data['delivery_postal_code'] = str(value)
                    elif 'country' in pref_key.lower():
                        delivery_data['delivery_country'] = str(value)

        # Fallback to user profile address data if available
        if not delivery_data and user:
            try:
                if hasattr(user, 'profile'):
                    profile = user.profile
                    if hasattr(profile, 'address_line_1'):
                        delivery_data['delivery_address_line1'] = str(profile.address_line_1)
                    if hasattr(profile, 'address_line_2'):
                        delivery_data['delivery_address_line2'] = str(profile.address_line_2)
                    if hasattr(profile, 'city'):
                        delivery_data['delivery_city'] = str(profile.city)
                    if hasattr(profile, 'postcode'):
                        delivery_data['delivery_postal_code'] = str(profile.postcode)
                    if hasattr(profile, 'country'):
                        delivery_data['delivery_country'] = str(profile.country)
            except:
                pass  # No profile address data available

        # Create delivery record if we have any data
        if delivery_data:
            try:
                OrderDeliveryDetail.objects.create(order=order, **delivery_data)
            except Exception as e:
                logger.error(f"Failed to create OrderDeliveryDetail for order {order.id}: {str(e)}")
