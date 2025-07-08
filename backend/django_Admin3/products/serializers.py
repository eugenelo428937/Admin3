from rest_framework import serializers
from .models import Product, ProductGroup, ProductVariation
from .models.product_group_filter import ProductGroupFilter
from .models.product_group import ProductGroup

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

class ProductGroupSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()
    class Meta:
        model = ProductGroup
        fields = ['id', 'name', 'parent', 'children']
    def get_children(self, obj):
        return ProductGroupSerializer(obj.children.all(), many=True).data

class ProductGroupThreeLevelSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()
    class Meta:
        model = ProductGroup
        fields = ['id', 'name', 'parent', 'children']
    def get_children(self, obj):
        # Level 2
        return [
            {
                **ProductGroupThreeLevelSerializer(child).data,
                'children': [
                    ProductGroupThreeLevelSerializer(grandchild).data
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

class ProductGroupWithProductsSerializer(serializers.ModelSerializer):
    products = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductGroup
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
