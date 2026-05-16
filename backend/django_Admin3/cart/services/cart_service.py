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

# Tutorial choice rank label → integer (matches frontend
# `tutorialMetadataBuilder.ts`).
TUTORIAL_RANK_MAP = {'1st': 1, '2nd': 2, '3rd': 3}
TUTORIAL_RANK_LABEL = {v: k for k, v in TUTORIAL_RANK_MAP.items()}
MAX_TUTORIAL_RANKS_PER_SUBJECT = 3


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

        # Server-side availability gate (active flags + date window).
        # Frontend disables the button for UX, but a stale page or direct
        # API call must still be rejected here.
        if not product.is_available_now():
            return None, "product_unavailable"

        # Delegate to tutorial-specific or regular item logic
        if metadata.get('type') == 'tutorial':
            item = self._handle_tutorial_add(cart, product, quantity, price_type, actual_price, metadata)
        else:
            item = self._handle_regular_add(cart, product, quantity, price_type, actual_price, metadata)

        # Update cart flags and trigger VAT
        self._update_cart_flags(cart)
        self._trigger_vat_calculation(cart)

        return item, None

    def add_generic_item(self, cart, generic_item, quantity=1, actual_price=None):
        """Add a ``store.GenericItem`` (e.g. marking voucher) to the cart.

        This replaces the legacy ``add_marking_voucher`` method removed in
        Task 24 (Release B). All generic catalog items (vouchers, gift cards,
        etc.) share a single code path that attaches the cart line to the
        item's ``Purchasable`` row.
        """
        item, created = CartItem.objects.get_or_create(
            cart=cart,
            purchasable_id=generic_item.purchasable_ptr_id,
            defaults={
                'quantity': quantity,
                'actual_price': actual_price,
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
        """Update an existing cart item's quantity, metadata, or price.

        If the metadata payload contains tutorial choices for an existing
        tutorial cart line, the choices are reconciled through the same
        relational upsert path used by add_item — keeping
        metadata.locations[].choices[] and CartTutorialChoice rows in sync.
        """
        item = CartItem.objects.get(id=item_id, cart=cart)

        if quantity is not None:
            item.quantity = int(quantity)
        if actual_price is not None:
            item.actual_price = actual_price
        if price_type is not None:
            item.price_type = price_type

        if metadata is not None:
            incoming = (metadata.get('newLocation') or {}).get('choices') or []
            if incoming and item.tutorial_choices.exists():
                # Tutorial cart line — route through relational upsert.
                # Student is best-effort (None allowed for guest/no-Student).
                student = self._resolve_student(cart)
                from django.db import transaction
                with transaction.atomic():
                    self._upsert_tutorial_choices(item, student, incoming)
                    self._refresh_tutorial_metadata(item)
            else:
                item.metadata = metadata

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
            # Task 23: match by the unified purchasable FK (product rows are
            # MTI subclasses so purchasable_id == product_id).
            existing = CartItem.objects.filter(
                cart=user_cart,
                purchasable_id=item.purchasable_id,
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

        # Best-effort backfill: any tutorial_choices that came across
        # without a student now get linked to the user's Student row, if
        # one exists. Choices added while logged-out will have student=
        # None; choices added later (or if user has no Student) stay
        # null. Checkout enforces only auth_user, not student-presence.
        from students.models import Student
        from tutorials.models import CartTutorialChoice
        student = Student.objects.filter(user=user).first()
        if student is not None:
            CartTutorialChoice.objects.filter(
                cart_item__cart=user_cart, student__isnull=True,
            ).update(student=student)

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

    def _resolve_student(self, cart):
        """Best-effort: return the cart owner's Student row if any.
        Returns None for guest carts and for authenticated users without
        a Student profile. The hard auth gate lives at checkout
        (OrderBuilder), not here — anyone can add a tutorial to cart.
        """
        from students.models import Student
        user = getattr(cart, 'user', None)
        if user is None or not user.is_authenticated:
            return None
        return Student.objects.filter(user=user).first()

    def _handle_tutorial_add(self, cart, product, quantity, price_type,
                            actual_price, metadata):
        """Add a tutorial product line: one CartItem per (cart, product),
        plus up to 3 CartTutorialChoice rows (rank 1/2/3) per cart_item.

        Open to guests and to authenticated users without a Student row;
        student_id on each choice row is best-effort and may be NULL.
        """
        student = self._resolve_student(cart)

        subject_code = metadata.get('subjectCode')
        new_location = metadata.get('newLocation') or {}
        incoming_choices = new_location.get('choices', [])

        # Defensive fallback: if frontend sends a non-conforming payload
        # (no subject + no choices), treat it as a regular add — preserves
        # the old permissive behavior for non-tutorial-shape requests
        # that happen to be tagged type='tutorial'.
        if not (subject_code and incoming_choices):
            return self._create_item(
                cart, product, quantity, price_type, actual_price, metadata,
            )

        # Find-or-create AND choice upsert/refresh share one atomic block:
        # if _upsert_tutorial_choices raises (invalid rank, OC event,
        # subject mismatch), the freshly-created cart_item must roll back
        # too — otherwise an orphan line with empty seed metadata stays
        # in the cart.
        from django.db import transaction
        with transaction.atomic():
            # Find or create the cart_item for (cart, product). Uses the
            # purchasable FK as the merge key — NOT metadata.subjectCode.
            item = CartItem.objects.filter(
                cart=cart, purchasable_id=product.pk, price_type=price_type,
            ).first()
            if item is None:
                # Strip choice data from initial metadata so it doesn't go
                # stale. _refresh_tutorial_metadata will rebuild it from rows.
                seed_metadata = {
                    'type': 'tutorial',
                    'subjectCode': subject_code,
                    'title': metadata.get('title', f"{subject_code} Tutorial"),
                    'locations': [],
                    'totalChoiceCount': 0,
                }
                item = self._create_item(
                    cart, product, quantity, price_type, actual_price,
                    seed_metadata,
                )
            self._upsert_tutorial_choices(item, student, incoming_choices)
            self._refresh_tutorial_metadata(item)

        # Lower the line price if the new add brought a cheaper option,
        # mirroring the prior _merge_tutorial_locations behavior. Outside
        # the atomic block — idempotent UPDATE on an already-committed
        # row.
        if actual_price is not None:
            new_price = Decimal(str(actual_price))
            current_price = (
                Decimal(str(item.actual_price))
                if item.actual_price is not None else None
            )
            if current_price is None or new_price < current_price:
                item.actual_price = new_price
                item.save(update_fields=['actual_price'])

        return item

    def _upsert_tutorial_choices(self, item, student, incoming):
        """Reconcile incoming `[{choice, eventId, ...}]` payload against
        the cart_item's CartTutorialChoice rows.

        For each incoming row:
          - resolve label → rank (1/2/3); reject unknown labels
          - delete any existing row for this rank OR this event_id
            on this cart_item (so a re-submit replaces cleanly)
          - create the new row, full_clean()-validated (OC + subject)

        Caps at 3 rows; raises ValidationError if exceeded.
        """
        from django.core.exceptions import ValidationError
        from tutorials.models import CartTutorialChoice

        for c in incoming:
            rank = TUTORIAL_RANK_MAP.get(c.get('choice'))
            event_id = c.get('eventId')
            if rank is None:
                raise ValidationError(
                    f"Invalid choice rank label: {c.get('choice')!r}. "
                    f"Expected one of {sorted(TUTORIAL_RANK_MAP)}.")
            if event_id is None:
                raise ValidationError(
                    f"Tutorial choice payload missing eventId: {c!r}")

            # Replace conflicts: existing rank, or existing event for this
            # cart_item.
            CartTutorialChoice.objects.filter(
                cart_item=item, choice_rank=rank,
            ).delete()
            CartTutorialChoice.objects.filter(
                cart_item=item, tutorial_event_id=event_id,
            ).delete()

            choice = CartTutorialChoice(
                cart_item=item, student=student,
                tutorial_event_id=event_id, choice_rank=rank,
            )
            choice.full_clean()  # raises on OC / subject mismatch
            choice.save()

        if item.tutorial_choices.count() > MAX_TUTORIAL_RANKS_PER_SUBJECT:
            raise ValidationError(
                f"At most {MAX_TUTORIAL_RANKS_PER_SUBJECT} tutorial "
                f"choices per subject.")

    def _refresh_tutorial_metadata(self, item):
        """Rebuild `item.metadata.locations[].choices[]` from the
        relational rows so legacy readers (admin views, email templates,
        older frontend code) stay consistent during the transition.

        Output shape matches `frontend/.../tutorialMetadataBuilder.ts`:
          {type, subjectCode, title, locations: [
            {location, choices: [{choice, eventId, eventCode, eventTitle,
              venue, location, startDate, endDate, variationId,
              variationName}], choiceCount}
          ], totalChoiceCount}
        Choices grouped by event location, ordered by rank within each.
        """
        rows = list(item.tutorial_choices.select_related(
            # Phase 4d: store_product is typed as TutorialProduct (Phase 4b
            # retarget). Variation info reads from the subclass fields
            # (format / tutorial_location), not the legacy PPV chain — which
            # will be removed by Phase 5.
            'tutorial_event__store_product__tutorial_location',
            'tutorial_event__store_product__exam_session_subject__subject',
            'tutorial_event__location',
            'tutorial_event__venue',
        ).order_by('choice_rank'))

        metadata = item.metadata or {}
        subject_code = metadata.get('subjectCode')
        if subject_code is None and rows:
            subject_code = (
                rows[0].tutorial_event.store_product
                .exam_session_subject.subject.code
            )

        title = metadata.get('title') or f"{subject_code} Tutorial"

        # Group by location label
        by_location = {}
        for row in rows:
            ev = row.tutorial_event
            sp = ev.store_product  # TutorialProduct (Phase 4b retarget)
            # ev.location and ev.venue are FKs to TutorialLocation /
            # TutorialVenue. Coerce to str() before writing to JSONB
            # metadata — both models' __str__ returns self.name.
            loc_obj = ev.location
            loc_label = (str(loc_obj) if loc_obj is not None else None) or 'TBD'
            venue = str(ev.venue) if ev.venue_id is not None else ''
            choice_dict = {
                'choice': TUTORIAL_RANK_LABEL[row.choice_rank],
                'eventId': ev.id,
                'eventCode': ev.code,
                'eventTitle': str(ev),
                'venue': venue,
                'location': loc_label,
                # Phase 5b (2026-05-16): legacy Date columns dropped; sourced
                # from lms_start_date / lms_end_date (DateTime). .date()
                # preserves the date-only API shape the cart UI expects.
                'startDate': ev.lms_start_date.date().isoformat() if ev.lms_start_date else None,
                'endDate': ev.lms_end_date.date().isoformat() if ev.lms_end_date else None,
                # Phase 4d: variation info from TutorialProduct subclass.
                # variationId is the TutorialProduct PK (shared with Product via MTI);
                # variationName is the human-readable Format choice label.
                'variationId': sp.id,
                'variationName': sp.get_format_display(),
            }
            by_location.setdefault(loc_label, []).append(choice_dict)

        locations_list = []
        for loc_label, choices in by_location.items():
            locations_list.append({
                'location': loc_label,
                'choices': choices,
                'choiceCount': len(choices),
            })

        item.metadata = {
            'type': 'tutorial',
            'subjectCode': subject_code,
            'title': title,
            'locations': locations_list,
            'totalChoiceCount': sum(len(loc['choices'])
                                    for loc in locations_list),
        }
        item.save(update_fields=['metadata'])

    def _handle_regular_add(self, cart, product, quantity, price_type, actual_price, metadata):
        """Handle adding regular (non-tutorial) items with variation logic."""
        variation_id = metadata.get('variationId')

        # Task 23: filter by unified purchasable FK (product_id == purchasable_id
        # under MTI).
        if variation_id:
            existing = CartItem.objects.filter(
                cart=cart, purchasable_id=product.pk, price_type=price_type,
                metadata__variationId=variation_id,
            ).first()
        else:
            existing = CartItem.objects.filter(
                cart=cart, purchasable_id=product.pk, price_type=price_type,
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

        # Task 23: product-backed cart lines persist via the unified purchasable
        # FK. Product is an MTI subclass of Purchasable, so product.pk ==
        # purchasable_ptr_id.
        return CartItem.objects.create(
            cart=cart,
            purchasable_id=product.pk,
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
            papers = MarkingPaper.objects.filter(purchasable=product)
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
        """Check if cart item is a tutorial product. Prefers the relational
        CartTutorialChoice rows; falls back to legacy metadata for old rows
        that pre-date the relational migration."""
        # Relational check (only meaningful for persisted rows). Wrapped
        # in its own try so an unsaved CartItem (no PK → manager raises)
        # falls through to the metadata/code checks below.
        try:
            if cart_item.pk and cart_item.tutorial_choices.exists():
                return True
        except Exception:
            pass
        try:
            metadata = cart_item.metadata or {}
            if metadata.get('type') == 'tutorial':
                return True
            if cart_item.product:
                product = cart_item.product.product
                if product and hasattr(product, 'code'):
                    if (product.code in ['T', 'TUT']
                            or 'tutorial' in product.fullname.lower()):
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
