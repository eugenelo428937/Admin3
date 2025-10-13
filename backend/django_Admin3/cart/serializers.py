from rest_framework import serializers
from .models import Cart, CartItem, CartFee, ActedOrder, ActedOrderItem

class CartItemSerializer(serializers.ModelSerializer):
    subject_code = serializers.CharField(source='product.exam_session_subject.subject.code', read_only=True)
    product_name = serializers.CharField(source='product.product.fullname', read_only=True)
    product_code = serializers.CharField(source='product.product.code', read_only=True)
    exam_session_code = serializers.CharField(source='product.exam_session_subject.exam_session.session_code', read_only=True)
    product_type = serializers.SerializerMethodField()
    current_product = serializers.IntegerField(source='product.id', read_only=True)
    product_id = serializers.IntegerField(source='product.product.id', read_only=True)

    # Phase 4: VAT fields
    net_amount = serializers.SerializerMethodField()
    vat_region = serializers.CharField(read_only=True)
    vat_rate = serializers.DecimalField(max_digits=5, decimal_places=4, read_only=True)
    vat_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    gross_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = CartItem
        fields = [
            'id', 'current_product', 'product_id', 'product_name', 'product_code', 'subject_code',
            'exam_session_code', 'product_type', 'quantity', 'price_type', 'actual_price', 'metadata',
            'is_marking', 'has_expired_deadline', 'expired_deadlines_count', 'marking_paper_count',
            # Phase 4: VAT fields
            'net_amount', 'vat_region', 'vat_rate', 'vat_amount', 'gross_amount'
        ]

    def get_net_amount(self, obj):
        """Calculate net amount (price * quantity)"""
        from decimal import Decimal
        return (obj.actual_price or Decimal('0.00')) * obj.quantity

    def get_product_type(self, obj):
        """Determine product type based on product name or group"""
        # Handle fee items (no product)
        if obj.item_type == 'fee':
            return 'fee'

        if not obj.product:
            return None

        product_name = obj.product.product.fullname.lower()

        if hasattr(obj.product.product, 'group_name') and obj.product.product.group_name:
            group_name = obj.product.product.group_name.lower()
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
    vat_calculations = serializers.SerializerMethodField()  # Legacy support
    vat_totals = serializers.SerializerMethodField()  # Phase 4 VAT totals
    vat_last_calculated_at = serializers.DateTimeField(read_only=True)
    vat_calculation_error = serializers.BooleanField(read_only=True)
    vat_calculation_error_message = serializers.CharField(read_only=True)

    class Meta:
        model = Cart
        fields = [
            'id', 'user', 'session_key', 'items', 'fees', 'created_at', 'updated_at',
            'has_marking', 'has_digital', 'has_tutorial', 'has_material',
            'user_context', 'vat_calculations',  # Legacy
            # Phase 4: VAT fields
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
        Phase 4: Calculate and return VAT totals using Phase 3 rules engine.

        Returns VAT breakdown and totals for all cart items.
        """
        request = self.context.get('request')

        # Get country_code from multiple sources with priority order
        country_code = None

        if request:
            # Priority 1: Serializer context (for explicit override)
            country_code = self.context.get('country_code')

            # Priority 2: Request body (POST data)
            if not country_code and hasattr(request, 'data'):
                country_code = request.data.get('country_code')

            # Priority 3: Query parameter (GET data)
            if not country_code:
                country_code = request.GET.get('country_code')

            # Priority 4: User profile
            if not country_code and hasattr(request, 'user') and request.user.is_authenticated:
                try:
                    from userprofile.models import UserProfile
                    from userprofile.models.address import UserProfileAddress

                    user_profile = UserProfile.objects.get(user=request.user)

                    # Try home address
                    home_address = UserProfileAddress.objects.filter(
                        user_profile=user_profile,
                        address_type='HOME'
                    ).first()

                    if home_address and home_address.country:
                        # Extract country code from country name (need to map country name to code)
                        # For now, default to GB if we can't determine
                        country_code = 'GB'

                except Exception:
                    pass

        # Default to GB if no country found
        if not country_code:
            country_code = 'GB'

        # Call Phase 4 calculate_vat_for_all_items method
        # Check context for update_items flag (used by recalculate endpoint)
        update_items = self.context.get('update_items', False)
        result = obj.calculate_vat_for_all_items(country_code=country_code, update_items=update_items)

        return result

    def get_vat_calculations(self, obj):
        """Calculate and return VAT calculations for cart"""
        # Get user from request context
        request = self.context.get('request')

        # Try to get country from user profile or use default
        country_code = 'GB'  # Default to UK

        if request and hasattr(request, 'user') and request.user.is_authenticated:
            # Try to get user's billing country from profile
            try:
                from userprofile.models import UserProfile
                from userprofile.models.address import UserProfileAddress

                user_profile = UserProfile.objects.get(user=request.user)

                # Try billing address first, then home address
                billing_address = UserProfileAddress.objects.filter(
                    user_profile=user_profile,
                    address_type='BILLING'
                ).first()

                if billing_address and billing_address.country:
                    country_code = billing_address.country
                else:
                    home_address = UserProfileAddress.objects.filter(
                        user_profile=user_profile,
                        address_type='HOME'
                    ).first()

                    if home_address and home_address.country:
                        country_code = home_address.country

            except Exception as e:
                print(f"[CartSerializer.get_vat_calculations] Could not get user country: {e}")

        # Check if VAT is already calculated and stored
        if obj.vat_result and isinstance(obj.vat_result, dict):
            stored_country = obj.vat_result.get('country_code')

            # Return stored result if country matches
            if stored_country == country_code:
                return obj.vat_result

        # Calculate and store VAT
        try:
            obj.calculate_and_save_vat(country_code)
            return obj.vat_result
        except Exception as e:
            # Return empty structure on error to prevent serialization failure

            return {
                'country_code': country_code,
                'vat_rate': '0.00',
                'total_net_amount': '0.00',
                'total_vat_amount': '0.00',
                'total_gross_amount': '0.00',
                'items': [],
                'error': str(e)
            }

class ActedOrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.SerializerMethodField()
    product_code = serializers.SerializerMethodField()
    subject_code = serializers.SerializerMethodField()
    exam_session_code = serializers.SerializerMethodField()
    product_type = serializers.SerializerMethodField()

    class Meta:
        model = ActedOrderItem
        fields = ['id', 'item_type', 'product', 'product_name', 'product_code', 'subject_code', 'exam_session_code', 'product_type', 'quantity', 'price_type', 'actual_price', 'metadata']

    def get_product_name(self, obj):
        """Get product name or fee name"""
        if obj.item_type == 'fee':
            return obj.metadata.get('fee_name', 'Fee')
        elif obj.product:
            return obj.product.product.fullname
        return None

    def get_product_code(self, obj):
        """Get product code or fee type"""
        if obj.item_type == 'fee':
            return obj.metadata.get('fee_type', 'fee')
        elif obj.product:
            return obj.product.product.code
        return None

    def get_subject_code(self, obj):
        """Get subject code (not applicable to fees)"""
        if obj.item_type == 'fee':
            return None
        elif obj.product:
            return obj.product.exam_session_subject.subject.code
        return None

    def get_exam_session_code(self, obj):
        """Get exam session code (not applicable to fees)"""
        if obj.item_type == 'fee':
            return None
        elif obj.product:
            return obj.product.exam_session_subject.exam_session.session_code
        return None

    def get_product_type(self, obj):
        """Determine product type based on item type and product info"""
        if obj.item_type == 'fee':
            return 'fee'
        elif obj.product:
            product_name = obj.product.product.fullname.lower()

            if hasattr(obj.product.product, 'group_name') and obj.product.product.group_name:
                group_name = obj.product.product.group_name.lower()
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
