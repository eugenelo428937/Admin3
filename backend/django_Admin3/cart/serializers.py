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

    class Meta:
        model = CartItem
        fields = ['id', 'current_product', 'product_id', 'product_name', 'product_code', 'subject_code', 'exam_session_code', 'product_type', 'quantity', 'price_type', 'actual_price', 'metadata', 'is_marking', 'has_expired_deadline', 'expired_deadlines_count', 'marking_paper_count']

    def get_product_type(self, obj):
        """Determine product type based on product name or group"""
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
    vat_calculations = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ['id', 'user', 'session_key', 'items', 'fees', 'created_at', 'updated_at', 'has_marking', 'has_digital', 'has_tutorial', 'has_material', 'user_context', 'vat_calculations']
    
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

    def get_vat_calculations(self, obj):
        """Calculate and return VAT calculations for cart"""
        from vat.service import calculate_vat_for_cart
        from vat.utils import decimal_to_float

        # Get user from request context
        request = self.context.get('request')
        user = request.user if request and hasattr(request, 'user') and request.user.is_authenticated else None

        # Extract client IP for anonymous users (supports proxies via X-Forwarded-For)
        client_ip = None
        if request:
            # X-Forwarded-For header contains comma-separated IPs (client, proxy1, proxy2...)
            # First IP is the original client IP
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                client_ip = x_forwarded_for.split(',')[0].strip()
            else:
                client_ip = request.META.get('REMOTE_ADDR')

        try:
            # Calculate VAT for cart (pass client_ip for anonymous user geolocation)
            vat_result = calculate_vat_for_cart(user, obj, client_ip=client_ip)

            # Return only the vat_calculations portion (convert Decimals to floats for JSON)
            return decimal_to_float(vat_result.get('vat_calculations', {}))
        except Exception as e:
            # Return empty structure on error to prevent serialization failure

            return {
                'items': [],
                'totals': {
                    'subtotal': 0.00,
                    'total_vat': 0.00,
                    'total_gross': 0.00,
                    'effective_vat_rate': 0.00
                },
                'region_info': {
                    'country': None,
                    'region': 'ROW'
                }
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
