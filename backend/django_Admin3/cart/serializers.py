import logging
from rest_framework import serializers
from store.serializers import PurchasableSerializer
from .models import Cart, CartItem, CartFee, ActedOrder, ActedOrderItem

logger = logging.getLogger(__name__)

class CartItemSerializer(serializers.ModelSerializer):
    # Use SerializerMethodField for fields that need to handle marking vouchers
    subject_code = serializers.SerializerMethodField()
    product_name = serializers.SerializerMethodField()
    product_code = serializers.SerializerMethodField()
    exam_session_code = serializers.SerializerMethodField()
    product_type = serializers.SerializerMethodField()
    current_product = serializers.SerializerMethodField()
    product_id = serializers.SerializerMethodField()

    # Task 23: legacy `product` / `marking_voucher` / `item_type` are now
    # @properties on the model, derived from the unified `purchasable` FK.
    # These helpers stay as thin delegations so existing get_* methods below
    # keep the same call shape.
    @staticmethod
    def _product(obj):
        return obj.product

    @staticmethod
    def _marking_voucher(obj):
        return obj.marking_voucher

    @staticmethod
    def _item_type(obj):
        return obj.item_type

    # Phase 5: VAT fields (stored in CartItem model from orchestrator results)
    net_amount = serializers.SerializerMethodField()
    vat_region = serializers.CharField(read_only=True)
    vat_rate = serializers.DecimalField(max_digits=5, decimal_places=4, read_only=True)
    vat_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    gross_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    # Task 18: unified catalog parent exposed as nested object.
    # Dual-emit alongside the legacy product / marking_voucher fields so the
    # frontend can migrate progressively. Becomes the sole reference after
    # Release B (Tasks 22–24) drops the legacy FKs.
    purchasable = PurchasableSerializer(read_only=True)

    class Meta:
        model = CartItem
        fields = [
            'id', 'current_product', 'product_id', 'product_name', 'product_code', 'subject_code',
            'exam_session_code', 'product_type', 'quantity', 'price_type', 'actual_price', 'metadata',
            'is_marking', 'has_expired_deadline', 'expired_deadlines_count', 'marking_paper_count',
            # Phase 5: VAT fields
            'net_amount', 'vat_region', 'vat_rate', 'vat_amount', 'gross_amount',
            # Task 18: unified purchasable nested object
            'purchasable',
        ]

    def get_subject_code(self, obj):
        """Get subject code - marking vouchers don't have subjects"""
        item_type = self._item_type(obj)
        if item_type == 'marking_voucher':
            return None  # Marking vouchers are not tied to subjects
        product = self._product(obj)
        if product:
            return product.exam_session_subject.subject.code
        return None

    def get_product_name(self, obj):
        """Get product name - handles marking vouchers"""
        item_type = self._item_type(obj)
        voucher = self._marking_voucher(obj)
        if item_type == 'marking_voucher' and voucher:
            return voucher.name or 'Marking Voucher'
        product = self._product(obj)
        if product:
            return product.product.fullname
        return None

    def get_product_code(self, obj):
        """Get product code - handles marking vouchers"""
        item_type = self._item_type(obj)
        voucher = self._marking_voucher(obj)
        if item_type == 'marking_voucher' and voucher:
            return voucher.code
        product = self._product(obj)
        if product:
            return product.product.code
        return None

    def get_exam_session_code(self, obj):
        """Get exam session code - marking vouchers don't have exam sessions"""
        item_type = self._item_type(obj)
        if item_type == 'marking_voucher':
            return None  # Marking vouchers are not tied to exam sessions
        product = self._product(obj)
        if product:
            return product.exam_session_subject.exam_session.session_code
        return None

    def get_current_product(self, obj):
        """Get current product ID - returns None for marking vouchers"""
        item_type = self._item_type(obj)
        if item_type == 'marking_voucher':
            return None
        product = self._product(obj)
        if product:
            return product.id
        return None

    def get_product_id(self, obj):
        """Get product ID - returns voucher ID for marking vouchers"""
        item_type = self._item_type(obj)
        voucher = self._marking_voucher(obj)
        if item_type == 'marking_voucher' and voucher:
            return voucher.id
        product = self._product(obj)
        if product:
            return product.product.id
        return None

    def get_net_amount(self, obj):
        """
        Calculate net amount for cart item (price × quantity).

        Returns the line total before VAT. This is used for display purposes
        and VAT calculations are performed by the orchestrator service.

        Args:
            obj (CartItem): Cart item instance

        Returns:
            Decimal: Net amount (actual_price × quantity)
        """
        from decimal import Decimal
        return (obj.actual_price or Decimal('0.00')) * obj.quantity

    def get_product_type(self, obj):
        """Determine product type based on item type, product name, or group"""
        item_type = self._item_type(obj)

        # Handle fee items (no product)
        if item_type == 'fee':
            return 'fee'

        # Handle marking voucher items
        if item_type == 'marking_voucher':
            return 'marking_voucher'

        product = self._product(obj)
        if not product:
            return None

        product_name = product.product.fullname.lower()

        if hasattr(product.product, 'group_name') and product.product.group_name:
            group_name = product.product.group_name.lower()
            if 'tutorial' in group_name:
                return 'tutorial'
            elif 'marking' in group_name:
                return 'marking'

        # Fallback to product name if group_name is not available
        if 'tutorial' in product_name:
            return 'tutorial'
        elif 'marking' in product_name:
            return 'marking'

        return 'material'

class CartFeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CartFee
        fields = ['id', 'fee_type', 'name', 'description', 'amount', 'currency', 'is_refundable', 'applied_at', 'applied_by_rule', 'metadata']

class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    fees = CartFeeSerializer(many=True, read_only=True)
    user_context = serializers.SerializerMethodField()
    vat_calculations = serializers.SerializerMethodField()  # Legacy support (deprecated - use vat_totals)
    vat_totals = serializers.SerializerMethodField()  # Phase 5: VAT totals from JSONB storage
    vat_last_calculated_at = serializers.DateTimeField(read_only=True)
    vat_calculation_error = serializers.BooleanField(read_only=True)
    vat_calculation_error_message = serializers.CharField(read_only=True)

    class Meta:
        model = Cart
        fields = [
            'id', 'user', 'session_key', 'items', 'fees', 'created_at', 'updated_at',
            'has_marking', 'has_digital', 'has_tutorial', 'has_material',
            'user_context', 'vat_calculations',  # Legacy (deprecated)
            # Phase 5: VAT fields
            'vat_totals', 'vat_last_calculated_at', 'vat_calculation_error', 'vat_calculation_error_message'
        ]
    
    def get_user_context(self, obj):
        """Get user context including IP and country information and acknowledgments"""

        request = self.context.get('request')
        if not request:
            return {
                'id': 0,
                'email': '',
                'is_authenticated': False,
                'ip': '',
                'home_country': None,
                'work_country': None,
                'acknowledgments': []
            }

        # Check if user attribute exists and is authenticated
        if hasattr(request, 'user') and request.user.is_authenticated:
            user_context = {
                'id': request.user.id,
                'email': request.user.email,
                'is_authenticated': True,
                'ip': request.META.get('REMOTE_ADDR', ''),
                'home_country': None,
                'work_country': None,
                'acknowledgments': []
            }

            # Get user address information
            try:
                from userprofile.models import UserProfile
                from userprofile.models.address import UserProfileAddress

                user_profile = UserProfile.objects.get(user=request.user)

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
                pass

            # Get session-based acknowledgments from session storage
            # This supports acknowledgments that persist across the session
            acknowledgments = request.session.get('user_acknowledgments', [])
            user_context['acknowledgments'] = acknowledgments

            return user_context
        else:
            # For unauthenticated users - also check session for acknowledgments
            acknowledgments = request.session.get('user_acknowledgments', [])
            return {
                'id': 0,
                'email': '',
                'is_authenticated': False,
                'ip': request.META.get('REMOTE_ADDR', ''),
                'home_country': None,
                'work_country': None,
                'acknowledgments': acknowledgments
            }

    def get_vat_totals(self, obj):
        """
        Phase 5: Return VAT totals from cart.vat_result JSONB storage.

        Returns VAT breakdown and totals from orchestrator calculation stored in JSONB.
        Returns a default structure if VAT hasn't been calculated yet.
        """
        # Phase 5: Return vat_result JSONB data directly
        if obj.vat_result and isinstance(obj.vat_result, dict):
            # VAT has been calculated and stored by orchestrator
            return obj.vat_result

        # VAT not yet calculated - return default structure for consistency
        return {
            'success': False,
            'status': 'not_calculated',
            'total_net_amount': '0.00',
            'total_vat_amount': '0.00',
            'total_gross_amount': '0.00',
            'vat_breakdown': [],
            'items': [],
            'region': 'UNKNOWN',
            'message': 'VAT has not been calculated yet'
        }

    def get_vat_calculations(self, obj):
        """
        DEPRECATED: Legacy VAT calculations method.

        This method is deprecated in Phase 5 and maintained only for backward compatibility.
        New code should use get_vat_totals() which returns cart.vat_result JSONB data.

        Phase 5 approach: VAT is calculated by orchestrator service and stored in cart.vat_result.
        This method now delegates to get_vat_totals() for consistency.

        Returns:
            dict or None: VAT totals from cart.vat_result JSONB storage
        """
        logger.warning(
            "get_vat_calculations() is deprecated. Use get_vat_totals() instead. "
            "This method will be removed in a future version."
        )

        # Phase 5: Delegate to get_vat_totals() which returns cart.vat_result
        return self.get_vat_totals(obj)

class ActedOrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.SerializerMethodField()
    product_code = serializers.SerializerMethodField()
    subject_code = serializers.SerializerMethodField()
    exam_session_code = serializers.SerializerMethodField()
    product_type = serializers.SerializerMethodField()
    # Task 19: convert legacy `product` and `item_type` to SerializerMethodFields
    # so they fall back to the purchasable-derived shims when the legacy FK
    # is null on a row created by new code paths.
    product = serializers.SerializerMethodField()
    item_type = serializers.SerializerMethodField()
    # Task 18: dual-emit unified catalog parent (if present on the row).
    purchasable = PurchasableSerializer(read_only=True)

    class Meta:
        model = ActedOrderItem
        fields = [
            'id', 'item_type', 'product', 'product_name', 'product_code', 'subject_code',
            'exam_session_code', 'product_type', 'quantity', 'price_type', 'actual_price',
            'metadata',
            # Task 18: unified purchasable nested object
            'purchasable',
        ]

    # Task 23: `product` / `item_type` are now @properties on the model,
    # derived from the unified `purchasable` FK.
    @staticmethod
    def _product(obj):
        return obj.product

    @staticmethod
    def _item_type(obj):
        return obj.item_type

    def get_product(self, obj):
        """Emit legacy product FK as primary-key integer if present, else derive from purchasable shim.

        Historical shape (when `product` was a ModelSerializer FK field on
        ActedOrderItem) was the Product's primary key integer. Preserve that.
        """
        product = self._product(obj)
        return product.pk if product is not None else None

    def get_item_type(self, obj):
        """Emit legacy item_type if set, else derive from purchasable.kind."""
        return self._item_type(obj)

    def get_product_name(self, obj):
        """Get product name or fee name"""
        item_type = self._item_type(obj)
        if item_type == 'fee':
            return obj.metadata.get('fee_name', 'Fee') if obj.metadata else 'Fee'
        product = self._product(obj)
        if product:
            return product.product.fullname
        return None

    def get_product_code(self, obj):
        """Get product code or fee type"""
        item_type = self._item_type(obj)
        if item_type == 'fee':
            return obj.metadata.get('fee_type', 'fee') if obj.metadata else 'fee'
        product = self._product(obj)
        if product:
            return product.product.code
        return None

    def get_subject_code(self, obj):
        """Get subject code (not applicable to fees)"""
        item_type = self._item_type(obj)
        if item_type == 'fee':
            return None
        product = self._product(obj)
        if product:
            return product.exam_session_subject.subject.code
        return None

    def get_exam_session_code(self, obj):
        """Get exam session code (not applicable to fees)"""
        item_type = self._item_type(obj)
        if item_type == 'fee':
            return None
        product = self._product(obj)
        if product:
            return product.exam_session_subject.exam_session.session_code
        return None

    def get_product_type(self, obj):
        """Determine product type based on item type and product info"""
        item_type = self._item_type(obj)
        if item_type == 'fee':
            return 'fee'
        product = self._product(obj)
        if product:
            product_name = product.product.fullname.lower()

            if hasattr(product.product, 'group_name') and product.product.group_name:
                group_name = product.product.group_name.lower()
                if 'tutorial' in group_name:
                    return 'tutorial'
                elif 'marking' in group_name:
                    return 'marking'

            # Fallback to product name if group_name is not available
            if 'tutorial' in product_name:
                return 'tutorial'
            elif 'marking' in product_name:
                return 'marking'

            return 'material'
        return None

class ActedOrderSerializer(serializers.ModelSerializer):
    items = ActedOrderItemSerializer(many=True, read_only=True)
    user = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = ActedOrder
        fields = ['id', 'user', 'created_at', 'updated_at', 'items']
