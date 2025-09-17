from rest_framework import serializers
from .models import Cart, CartItem, ActedOrder, ActedOrderItem

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

class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    user_context = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ['id', 'user', 'session_key', 'items', 'created_at', 'updated_at', 'has_marking', 'has_digital', 'user_context']
    
    def get_user_context(self, obj):
        """Get user context including IP and country information and acknowledgments"""
        print("[CartSerializer.get_user_context] Called")
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

class ActedOrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.product.fullname', read_only=True)
    product_code = serializers.CharField(source='product.product.code', read_only=True)
    subject_code = serializers.CharField(source='product.exam_session_subject.subject.code', read_only=True)
    exam_session_code = serializers.CharField(source='product.exam_session_subject.exam_session.session_code', read_only=True)
    product_type = serializers.SerializerMethodField()

    class Meta:
        model = ActedOrderItem
        fields = ['id', 'product', 'product_name', 'product_code', 'subject_code', 'exam_session_code', 'product_type', 'quantity', 'price_type', 'actual_price', 'metadata']

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

class ActedOrderSerializer(serializers.ModelSerializer):
    items = ActedOrderItemSerializer(many=True, read_only=True)
    user = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = ActedOrder
        fields = ['id', 'user', 'created_at', 'updated_at', 'items']
