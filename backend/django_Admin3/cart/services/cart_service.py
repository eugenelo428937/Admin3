import logging
from decimal import Decimal

from django.utils import timezone

from cart.models import Cart, CartItem
from store.models import Product as StoreProduct
from catalog.models import ProductProductVariation
from marking.models import MarkingPaper

logger = logging.getLogger(__name__)

# Constants
CART_VAT_ERROR_FIELDS = ['vat_calculation_error', 'vat_calculation_error_message']
CART_ITEM_VAT_FIELDS = ['vat_region', 'vat_rate', 'vat_amount', 'gross_amount']


class CartService:
    """Facade for all cart business logic — product resolution, item management, and flags."""

    def get_or_create(self, request):
        """Get or create cart for authenticated user or guest session."""
        if request.user.is_authenticated:
            cart, _ = Cart.objects.get_or_create(user=request.user)
        else:
            session_key = request.session.session_key
            if not session_key:
                request.session.save()
                session_key = request.session.session_key
            cart, _ = Cart.objects.get_or_create(session_key=session_key)
        return cart

    def add_item(self, cart, product_id, quantity=1, price_type='standard',
                 actual_price=None, metadata=None):
        """Add a product item to the cart, handling tutorials and variations."""
        metadata = metadata or {}

        product = self._resolve_product(product_id, metadata)
        if not product:
            return None, f"No Product matches the given query (ID: {product_id})"

        # Delegate to tutorial-specific or regular item logic
        if metadata.get('type') == 'tutorial':
            item = self._handle_tutorial_add(cart, product, quantity, price_type, actual_price, metadata)
        else:
            item = self._handle_regular_add(cart, product, quantity, price_type, actual_price, metadata)

        # Update cart flags and trigger VAT
        self._update_cart_flags(cart)
        self._trigger_vat_calculation(cart)

        return item, None

    def add_marking_voucher(self, cart, voucher, quantity=1, actual_price=None):
        """Add a marking voucher item to the cart."""
        item, created = CartItem.objects.get_or_create(
            cart=cart,
            marking_voucher=voucher,
            item_type='marking_voucher',
            defaults={
                'quantity': quantity,
                'actual_price': actual_price or voucher.price,
            }
        )
        if not created:
            item.quantity += quantity
            item.save()

        self._update_cart_flags(cart)
        self._trigger_vat_calculation(cart)
        return item

    def update_item(self, cart, item_id, quantity=None, metadata=None,
                    actual_price=None, price_type=None):
        """Update an existing cart item's quantity, metadata, or price."""
        item = CartItem.objects.get(id=item_id, cart=cart)

        if quantity is not None:
            item.quantity = int(quantity)
        if metadata is not None:
            item.metadata = metadata
        if actual_price is not None:
            item.actual_price = actual_price
        if price_type is not None:
            item.price_type = price_type

        item.save()
        self._trigger_vat_calculation(cart)
        return item

    def remove_item(self, cart, item_id):
        """Remove an item from the cart."""
        item = CartItem.objects.get(id=item_id, cart=cart)
        item.delete()
        self._update_cart_flags(cart)
        self._trigger_vat_calculation(cart)

    def clear(self, cart):
        """Remove all items from the cart."""
        cart.items.all().delete()
        self._update_cart_flags(cart)
        self._trigger_vat_calculation(cart)

    def merge_guest_cart(self, user, session_key):
        """Merge a guest cart into the user's cart on login."""
        try:
            guest_cart = Cart.objects.get(session_key=session_key)
        except Cart.DoesNotExist:
            return

        user_cart, _ = Cart.objects.get_or_create(user=user)

        for item in guest_cart.items.all():
            # Check for duplicate product+price_type+variation
            existing = CartItem.objects.filter(
                cart=user_cart,
                product=item.product,
                price_type=item.price_type,
            )
            if item.metadata.get('variationId'):
                existing = existing.filter(metadata__variationId=item.metadata['variationId'])

            match = existing.first()
            if match:
                match.quantity += item.quantity
                match.save()
            else:
                item.cart = user_cart
                item.save()

        # Move fees
        guest_cart.fees.update(cart=user_cart)
        guest_cart.delete()

        self._update_cart_flags(user_cart)
        self._trigger_vat_calculation(user_cart)

    # ─── Private helpers ────────────────────────────────────────────────

    def _resolve_product(self, product_id, metadata):
        """Resolve a store.Product by ID or via PPV fallback."""
        product = StoreProduct.objects.filter(id=product_id).first()

        if not product and metadata.get('variationId'):
            ppv_id = metadata['variationId']
            product = StoreProduct.objects.filter(
                product_product_variation_id=ppv_id
            ).first()
            if product:
                logger.info(
                    f"Cart add: Resolved ID {product_id} to store.Product {product.id} via PPV {ppv_id}"
                )

        return product

    def _handle_tutorial_add(self, cart, product, quantity, price_type, actual_price, metadata):
        """Handle adding tutorial items with location merging."""
        subject_code = metadata.get('subjectCode')
        new_location = metadata.get('newLocation')

        if not (subject_code and new_location):
            # Fallback to simple creation
            return self._create_item(cart, product, quantity, price_type, actual_price, metadata)

        # Look for existing tutorial with same subject
        existing = CartItem.objects.filter(
            cart=cart,
            price_type=price_type,
            metadata__type='tutorial',
            metadata__subjectCode=subject_code,
        ).first()

        if existing:
            return self._merge_tutorial_locations(existing, new_location, actual_price)

        # Create new tutorial item with locations array
        tutorial_metadata = {
            'type': 'tutorial',
            'subjectCode': subject_code,
            'title': metadata.get('title', f"{subject_code} Tutorial"),
            'locations': [new_location],
            'totalChoiceCount': new_location.get('choiceCount', 0),
        }
        return self._create_item(cart, product, quantity, price_type, actual_price, tutorial_metadata)

    def _merge_tutorial_locations(self, item, new_location, actual_price):
        """Merge a new location into an existing tutorial cart item."""
        locations = item.metadata.get('locations', [])
        location_name = new_location.get('location')

        # Find existing location
        existing_idx = next(
            (i for i, loc in enumerate(locations) if loc.get('location') == location_name),
            None
        )

        if existing_idx is not None:
            # Merge choices
            existing_choices = locations[existing_idx].get('choices', [])
            new_choices = new_location.get('choices', [])
            choice_map = {f"{c.get('variationId')}_{c.get('eventId')}": c for c in existing_choices}
            for c in new_choices:
                choice_map[f"{c.get('variationId')}_{c.get('eventId')}"] = c
            merged = list(choice_map.values())
            locations[existing_idx] = {
                'location': location_name,
                'choices': merged,
                'choiceCount': len(merged),
            }
        else:
            locations.append(new_location)

        item.metadata['locations'] = locations
        item.metadata['totalChoiceCount'] = sum(loc.get('choiceCount', 0) for loc in locations)

        if actual_price and (not item.actual_price or Decimal(str(actual_price)) < item.actual_price):
            item.actual_price = actual_price

        item.save()
        return item

    def _handle_regular_add(self, cart, product, quantity, price_type, actual_price, metadata):
        """Handle adding regular (non-tutorial) items with variation logic."""
        variation_id = metadata.get('variationId')

        if variation_id:
            existing = CartItem.objects.filter(
                cart=cart, product=product, price_type=price_type,
                metadata__variationId=variation_id,
            ).first()
        else:
            existing = CartItem.objects.filter(
                cart=cart, product=product, price_type=price_type,
                metadata__variationId__isnull=True,
            ).first()

        if existing:
            existing.quantity += quantity
            if metadata:
                existing.metadata.update(metadata)
            self._set_marking_flags(existing, product)
            existing.save()
            return existing

        return self._create_item(cart, product, quantity, price_type, actual_price, metadata)

    def _create_item(self, cart, product, quantity, price_type, actual_price, metadata):
        """Create a new CartItem with marking flags set."""
        is_marking = self._is_marking_product(product)
        deadline_info = self._get_expired_deadline_info(product) if is_marking else {}

        return CartItem.objects.create(
            cart=cart,
            product=product,
            quantity=quantity,
            price_type=price_type,
            actual_price=actual_price,
            is_marking=is_marking,
            has_expired_deadline=deadline_info.get('has_expired', False),
            expired_deadlines_count=deadline_info.get('expired_count', 0),
            marking_paper_count=deadline_info.get('total_papers', 0),
            metadata=metadata,
        )

    def _set_marking_flags(self, item, product):
        """Update marking-related flags on an existing item."""
        item.is_marking = self._is_marking_product(product)
        if item.is_marking:
            info = self._get_expired_deadline_info(product)
            item.has_expired_deadline = info.get('has_expired', False)
            item.expired_deadlines_count = info.get('expired_count', 0)
            item.marking_paper_count = info.get('total_papers', 0)
        else:
            item.has_expired_deadline = False
            item.expired_deadlines_count = 0
            item.marking_paper_count = 0

    # ─── Product type detection ─────────────────────────────────────────

    def _is_marking_product(self, product):
        """Check if a product is a marking product."""
        try:
            product_name = product.product.fullname.lower()
            group_name = getattr(product.product, 'group_name', '')
            return 'marking' in product_name or group_name == 'Markings'
        except Exception:
            return False

    def _get_expired_deadline_info(self, product):
        """Get expired deadline information for a marking product."""
        try:
            current_time = timezone.now()
            papers = MarkingPaper.objects.filter(exam_session_subject_product=product)
            total = papers.count()
            expired = papers.filter(deadline__lt=current_time).count()
            return {'has_expired': expired > 0, 'expired_count': expired, 'total_papers': total}
        except Exception:
            return {'has_expired': False, 'expired_count': 0, 'total_papers': 0}

    def _is_digital_product(self, cart_item):
        """Check if cart item is a digital product (eBook, Hub)."""
        try:
            metadata = cart_item.metadata or {}
            if metadata.get('variationId'):
                try:
                    ppv = ProductProductVariation.objects.select_related('product_variation').get(
                        id=metadata['variationId']
                    )
                    if ppv.product_variation.variation_type.lower() in ['ebook', 'hub']:
                        return True
                except ProductProductVariation.DoesNotExist:
                    pass

            variation_name = (metadata.get('variationName') or '').lower()
            if 'ebook' in variation_name or 'hub' in variation_name:
                return True

            if cart_item.product:
                product = cart_item.product.product
                if product and hasattr(product, 'code') and product.code == 'OC':
                    return True
            return False
        except Exception:
            return False

    def _is_tutorial_product(self, cart_item):
        """Check if cart item is a tutorial product."""
        try:
            metadata = cart_item.metadata or {}
            if metadata.get('type') == 'tutorial':
                return True
            if cart_item.product:
                product = cart_item.product.product
                if product and hasattr(product, 'code'):
                    if product.code in ['T', 'TUT'] or 'tutorial' in product.fullname.lower():
                        return True
            return False
        except Exception:
            return False

    def _is_material_product(self, cart_item):
        """Check if cart item is a material product (printed, eBook, hub)."""
        try:
            metadata = cart_item.metadata or {}
            if metadata.get('variationId'):
                try:
                    ppv = ProductProductVariation.objects.select_related('product_variation').get(
                        id=metadata['variationId']
                    )
                    if ppv.product_variation.variation_type.lower() in ['ebook', 'printed', 'hub']:
                        return True
                except ProductProductVariation.DoesNotExist:
                    pass

            variation_name = (metadata.get('variationName') or '').lower()
            if any(t in variation_name for t in ['ebook', 'printed', 'hub']):
                return True

            if cart_item.product:
                product = cart_item.product.product
                if product and hasattr(product, 'code'):
                    if product.code in ['M', 'MAT', 'BOOK'] or 'material' in product.fullname.lower():
                        return True
            return False
        except Exception:
            return False

    def _update_cart_flags(self, cart):
        """Update cart-level boolean flags based on item contents."""
        has_marking = False
        has_digital = False
        has_tutorial = False
        has_material = False

        for item in cart.items.all():
            if item.is_marking:
                has_marking = True
            if self._is_digital_product(item):
                has_digital = True
            if self._is_tutorial_product(item):
                has_tutorial = True
            if self._is_material_product(item):
                has_material = True
            if has_marking and has_digital and has_tutorial and has_material:
                break

        updated = False
        for flag, val in [('has_marking', has_marking), ('has_digital', has_digital),
                          ('has_tutorial', has_tutorial), ('has_material', has_material)]:
            if getattr(cart, flag) != val:
                setattr(cart, flag, val)
                updated = True
        if updated:
            cart.save()

    def calculate_vat(self, cart):
        """
        Calculate VAT for all cart items via rules engine.

        Calls the rules engine per-item, aggregates totals, stores result
        in cart.vat_result, and updates individual CartItem VAT fields.

        Returns:
            dict: VAT result with 'totals', 'items', 'region' keys.
        """
        from rules_engine.services.rule_engine import rule_engine

        user_context = self._resolve_user_context(cart)
        items_result = []
        total_net = Decimal('0.00')
        total_vat = Decimal('0.00')
        region = 'ROW'

        for cart_item in cart.items.all():
            net_amount = (cart_item.actual_price or Decimal('0.00')) * cart_item.quantity
            product_type = self._get_item_product_type(cart_item)
            product_code = self._get_item_product_code(cart_item)

            context = {
                'user': user_context,
                'cart_item': {
                    'id': str(cart_item.id),
                    'product_type': product_type,
                    'product_code': product_code,
                    'net_amount': float(net_amount),
                },
            }

            result = rule_engine.execute('cart_calculate_vat', context)

            # Extract VAT data from rules result
            vat_info = result.get('vat', {})
            item_result = result.get('cart_item', {})
            item_region = vat_info.get('region', 'ROW')
            vat_rate = Decimal(str(vat_info.get('rate', '0.0000')))
            vat_amount = Decimal(str(item_result.get('vat_amount', '0.00')))
            gross_amount = Decimal(str(item_result.get('gross_amount', str(net_amount))))

            items_result.append({
                'id': str(cart_item.id),
                'vat_region': item_region,
                'vat_rate': str(vat_rate),
                'vat_amount': str(vat_amount),
                'gross_amount': str(gross_amount),
                'net_amount': str(net_amount),
            })

            total_net += net_amount
            total_vat += vat_amount
            region = item_region  # Use last item's region as overall

        total_gross = total_net + total_vat

        vat_result = {
            'region': region,
            'totals': {
                'net': str(total_net),
                'vat': str(total_vat),
                'gross': str(total_gross),
            },
            'items': items_result,
        }

        # Store in cart and update item fields
        cart.vat_result = vat_result
        cart.vat_last_calculated_at = timezone.now()
        cart.vat_calculation_error = False
        cart.vat_calculation_error_message = None
        cart.save(update_fields=[
            'vat_result', 'vat_last_calculated_at',
            'vat_calculation_error', 'vat_calculation_error_message',
        ])
        self._update_cart_item_vat_fields(cart, vat_result)

        return vat_result

    def _trigger_vat_calculation(self, cart):
        """Trigger VAT calculation, handling errors gracefully."""
        try:
            self.calculate_vat(cart)
        except Exception as e:
            logger.error(f"VAT calculation failed for cart {cart.id}: {e}")
            cart.vat_calculation_error = True
            cart.vat_calculation_error_message = str(e)
            cart.save(update_fields=CART_VAT_ERROR_FIELDS)

    def _resolve_user_context(self, cart):
        """Build user context with country code for rules engine."""
        user_id = 'anonymous'
        country = 'GB'  # Default UK

        if cart.user and cart.user.is_authenticated:
            user_id = str(cart.user.id)
            country = self._resolve_user_country(cart.user)

        return {'id': user_id, 'country_code': country}

    def _resolve_user_country(self, user):
        """Resolve user's country from their HOME address profile."""
        try:
            if hasattr(user, 'userprofile') and user.userprofile:
                profile = user.userprofile
                if hasattr(profile, 'addresses'):
                    home = profile.addresses.filter(address_type='HOME').first()
                    if home and home.country:
                        from country.models import Country
                        from django.db.models import Q
                        country_obj = Country.objects.filter(
                            Q(name=home.country) | Q(iso_code=home.country)
                        ).first()
                        if country_obj:
                            return country_obj.iso_code
                        return home.country
        except Exception:
            pass
        return 'GB'

    def _get_item_product_type(self, cart_item):
        """Determine product type for rules engine context."""
        metadata = cart_item.metadata or {}
        VARIATION_MAP = {
            'eBook': 'Digital', 'Hub': 'Digital',
            'Printed': 'Printed', 'Tutorial': 'Tutorial', 'Marking': 'Marking',
        }

        if 'variationType' in metadata:
            return VARIATION_MAP.get(metadata['variationType'], 'Digital')
        if metadata.get('is_digital'):
            return 'Digital'
        if metadata.get('type') == 'tutorial':
            return 'Tutorial'
        if cart_item.item_type == 'fee':
            return 'Fee'
        return 'Digital'

    def _get_item_product_code(self, cart_item):
        """Extract product code for rules engine (FC, PBOR, etc.)."""
        try:
            if cart_item.product and cart_item.product.product:
                return cart_item.product.product.code or ''
        except (AttributeError, Exception):
            pass
        return ''

    def _update_cart_item_vat_fields(self, cart, vat_result):
        """Update CartItem VAT fields from calculation result."""
        region = vat_result.get('region', 'UNKNOWN')
        items_vat = vat_result.get('items', [])
        vat_by_id = {item.get('id'): item for item in items_vat}

        for cart_item in cart.items.all():
            vat_data = vat_by_id.get(str(cart_item.id), {})
            cart_item.vat_region = vat_data.get('vat_region', region)
            cart_item.vat_rate = Decimal(str(vat_data.get('vat_rate', '0.0000')))
            cart_item.vat_amount = Decimal(str(vat_data.get('vat_amount', '0.00')))
            cart_item.gross_amount = Decimal(str(vat_data.get('gross_amount', '0.00')))
            cart_item.save(update_fields=CART_ITEM_VAT_FIELDS)


# Module-level singleton
cart_service = CartService()
