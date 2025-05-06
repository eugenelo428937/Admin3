from rest_framework import serializers
from .models import Product, ProductCategory, ProductSubcategory, ProductVariation
from .models.product_main_category import ProductMainCategory

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ['id', 'fullname', 'shortname', 'description', 
                 'created_at', 'updated_at', 'is_active']
        read_only_fields = ['created_at', 'updated_at']

class ProductCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductCategory
        fields = ['id', 'name', 'description']

class ProductSubcategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductSubcategory
        fields = ['id', 'name', 'description', 'product_category']

class ProductVariationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariation
        fields = ['id', 'variation_type', 'name', 'description']

class ProductSubcategoryNestedSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductSubcategory
        fields = ['id', 'name', 'description']

class ProductCategoryNestedSerializer(serializers.ModelSerializer):
    subcategories = ProductSubcategoryNestedSerializer(many=True, source='subcategories')
    class Meta:
        model = ProductCategory
        fields = ['id', 'name', 'description', 'subcategories']

class ProductMainCategoryHierarchySerializer(serializers.ModelSerializer):
    categories = serializers.SerializerMethodField()
    class Meta:
        model = ProductMainCategory
        fields = ['id', 'name', 'categories']
    def get_categories(self, obj):
        categories = ProductCategory.objects.filter(main_category=obj)
        return ProductCategoryNestedSerializer(categories, many=True).data
