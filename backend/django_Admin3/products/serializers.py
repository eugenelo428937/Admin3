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
    subcategories = serializers.SerializerMethodField()
    class Meta:
        model = ProductCategory
        fields = ['id', 'name', 'description', 'subcategories']
    def get_subcategories(self, obj):
        # Use the correct related_name from ProductSubcategory FK
        subcategories = obj.subcategory.all()  # related_name is 'subcategory' per migration 0003
        return ProductSubcategoryNestedSerializer(subcategories, many=True).data

class ProductMainCategoryHierarchySerializer(serializers.ModelSerializer):
    categories = serializers.SerializerMethodField()
    class Meta:
        model = ProductMainCategory
        fields = ['id', 'name', 'order_sequence', 'categories']
    def get_categories(self, obj):
        categories = obj.categories.all()
        return ProductCategoryNestedSerializer(categories, many=True).data
