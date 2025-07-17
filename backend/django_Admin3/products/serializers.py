from rest_framework import serializers
from .models import Product, ProductVariation, ProductBundle, ProductBundleProduct
from .models.product_group_filter import ProductGroupFilter
from .models.filter_system import FilterGroup
from exam_sessions_subjects_products.models import ExamSessionSubjectBundle, ExamSessionSubjectBundleProduct

class ProductSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='shortname', read_only=True)
    type = serializers.SerializerMethodField()
    variations = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = ['id', 'fullname', 'shortname', 'product_name', 'description', 'code', 
                 'type', 'variations', 'created_at', 'updated_at', 'is_active']
        read_only_fields = ['created_at', 'updated_at']
    
    def get_type(self, obj):
        """Determine product type based on product groups"""
        group_names = [group.name for group in obj.groups.all()]
        
        if 'Tutorial' in group_names:
            return 'Tutorial'
        elif 'Marking' in group_names:
            return 'Markings'
        else:
            return 'Material'  # Default type
    
    def get_variations(self, obj):
        """Get product variations with their details"""
        variations = []
        for variation in obj.product_variations.all():
            variations.append({
                'id': variation.id,
                'name': variation.name,
                'variation_type': variation.variation_type,
                'description': variation.description,
                'prices': []  # Add prices if needed
            })
        return variations

class ProductBundleProductSerializer(serializers.ModelSerializer):
    """Serializer for bundle components"""
    product = serializers.SerializerMethodField()
    product_variation = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductBundleProduct
        fields = ['id', 'product', 'product_variation', 'default_price_type', 
                 'quantity', 'sort_order', 'is_active']
    
    def get_product(self, obj):
        """Get product info from ProductProductVariation"""
        return {
            'id': obj.product_product_variation.product.id,
            'shortname': obj.product_product_variation.product.shortname,
            'fullname': obj.product_product_variation.product.fullname,
            'code': obj.product_product_variation.product.code,
        }
    
    def get_product_variation(self, obj):
        """Get variation info from ProductProductVariation"""
        return {
            'id': obj.product_product_variation.product_variation.id,
            'name': obj.product_product_variation.product_variation.name,
            'variation_type': obj.product_product_variation.product_variation.variation_type,
        }

class ProductBundleSerializer(serializers.ModelSerializer):
    """Serializer for master product bundles"""
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    components = ProductBundleProductSerializer(source='bundle_products', many=True, read_only=True)
    components_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductBundle
        fields = ['id', 'bundle_name', 'bundle_description', 'subject_code', 'subject_name',
                 'is_featured', 'is_active', 'display_order', 'components', 'components_count',
                 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']
    
    def get_components_count(self, obj):
        return obj.bundle_products.filter(is_active=True).count()

class ExamSessionSubjectBundleProductSerializer(serializers.ModelSerializer):
    """Serializer for exam session bundle components"""
    product = serializers.SerializerMethodField()
    product_variation = serializers.SerializerMethodField()
    exam_session_product_code = serializers.SerializerMethodField()
    exam_session_product_id = serializers.SerializerMethodField()
    prices = serializers.SerializerMethodField()
    
    class Meta:
        model = ExamSessionSubjectBundleProduct
        fields = ['id', 'product', 'product_variation', 'exam_session_product_code',
                 'exam_session_product_id', 'default_price_type', 'quantity', 'sort_order', 'is_active', 'prices']
    
    def get_product(self, obj):
        """Get product info from ExamSessionSubjectProductVariation"""
        essp = obj.exam_session_subject_product_variation.exam_session_subject_product
        return {
            'id': essp.product.id,
            'shortname': essp.product.shortname,
            'fullname': essp.product.fullname,
            'code': essp.product.code,
        }
    
    def get_product_variation(self, obj):
        """Get variation info from ExamSessionSubjectProductVariation"""
        ppv = obj.exam_session_subject_product_variation.product_product_variation
        return {
            'id': ppv.product_variation.id,
            'name': ppv.product_variation.name,
            'variation_type': ppv.product_variation.variation_type,
        }
    
    def get_exam_session_product_code(self, obj):
        """Get the exam session product code"""
        return obj.exam_session_subject_product_variation.product_code
    
    def get_exam_session_product_id(self, obj):
        """Get the exam session subject product ID (ESSP ID)"""
        return obj.exam_session_subject_product_variation.exam_session_subject_product.id
    
    def get_prices(self, obj):
        """Get all prices for this product variation from ExamSessionSubjectProductVariation"""
        espv = obj.exam_session_subject_product_variation
        return [
            {
                'id': price.id,
                'price_type': price.price_type,
                'amount': str(price.amount),  # Convert Decimal to string for JSON serialization
                'currency': price.currency,
            }
            for price in espv.prices.all()
        ]

class ExamSessionSubjectBundleSerializer(serializers.ModelSerializer):
    """Serializer for exam session bundles"""
    bundle_name = serializers.CharField(source='effective_name', read_only=True)
    bundle_description = serializers.CharField(source='effective_description', read_only=True)
    subject_code = serializers.CharField(source='exam_session_subject.subject.code', read_only=True)
    subject_name = serializers.CharField(source='exam_session_subject.subject.name', read_only=True)
    exam_session_code = serializers.CharField(source='exam_session_subject.exam_session.session_code', read_only=True)
    master_bundle_id = serializers.IntegerField(source='bundle.id', read_only=True)
    components = ExamSessionSubjectBundleProductSerializer(source='bundle_products', many=True, read_only=True)
    components_count = serializers.SerializerMethodField()
    is_featured = serializers.BooleanField(source='bundle.is_featured', read_only=True)
    
    class Meta:
        model = ExamSessionSubjectBundle
        fields = ['id', 'bundle_name', 'bundle_description', 'subject_code', 'subject_name',
                 'exam_session_code', 'master_bundle_id', 'is_featured', 'is_active', 'display_order',
                 'components', 'components_count', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']
    
    def get_components_count(self, obj):
        return obj.bundle_products.filter(is_active=True).count()

class FilterGroupSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()
    class Meta:
        model = FilterGroup
        fields = ['id', 'name', 'parent', 'children']
    def get_children(self, obj):
        return FilterGroupSerializer(obj.children.all(), many=True).data

class FilterGroupThreeLevelSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()
    class Meta:
        model = FilterGroup
        fields = ['id', 'name', 'parent', 'children']
    def get_children(self, obj):
        # Level 2
        return [
            {
                **FilterGroupThreeLevelSerializer(child).data,
                'children': [
                    FilterGroupThreeLevelSerializer(grandchild).data
                    for grandchild in child.children.all()
                ]
            }
            for child in obj.children.all()
        ]

class ProductVariationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariation
        fields = ['id', 'variation_type', 'name', 'description']

class ProductGroupFilterSerializer(serializers.ModelSerializer):
    groups = serializers.SerializerMethodField()
    class Meta:
        model = ProductGroupFilter
        fields = ['id', 'name', 'filter_type', 'groups']
    def get_groups(self, obj):
        return [
            {
                'id': group.id,
                'name': group.name,
                'parent': group.parent_id,
            }
            for group in obj.groups.all()
        ]

class FilterGroupWithProductsSerializer(serializers.ModelSerializer):
    products = serializers.SerializerMethodField()
    
    class Meta:
        model = FilterGroup
        fields = ['id', 'name', 'products']
    
    def get_products(self, obj):
        # Get active products in this group
        products = obj.products.filter(is_active=True).order_by('shortname')
        return [
            {
                'id': product.id,
                'shortname': product.shortname,
                'fullname': product.fullname,
                'code': product.code,
            }
            for product in products
        ]
