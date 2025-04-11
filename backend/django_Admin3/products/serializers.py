from rest_framework import serializers
from .models import Product, ProductType, ProductSubtype

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ['id', 'code', 'fullname', 'shortname', 'description', 
                 'created_at', 'updated_at', 'is_active']
        read_only_fields = ['created_at', 'updated_at']


class ProductTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductType
        fields = ['id', 'name', 'description']


class ProductSubtypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductSubtype
        fields = ['id', 'name', 'description', 'product_type']
