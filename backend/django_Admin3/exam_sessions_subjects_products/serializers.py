from rest_framework import serializers
from .models import ExamSessionSubjectProduct, ExamSessionSubjectProductVariation, Price
from exam_sessions_subjects.serializers import ExamSessionSubjectSerializer
from products.serializers import ProductSerializer, ProductVariationSerializer
from subjects.models import Subject
from products.models.products import Product, ProductVariation


class ExamSessionSubjectProductSerializer(serializers.ModelSerializer):
    exam_session_subject_details = ExamSessionSubjectSerializer(source='exam_session_subject', read_only=True)
    product_details = ProductSerializer(source='product', read_only=True)

    class Meta:
        model = ExamSessionSubjectProduct
        fields = ['id', 'exam_session_subject', 'product', 'created_at', 'updated_at',
                 'exam_session_subject_details', 'product_details']
        read_only_fields = ['created_at', 'updated_at']

class ProductListSerializer(serializers.ModelSerializer):
    essp_id = serializers.IntegerField(source='id', read_only=True)
    type = serializers.SerializerMethodField()
    subject_id = serializers.IntegerField(source='exam_session_subject.subject.id')
    subject_code = serializers.CharField(source='exam_session_subject.subject.code')
    subject_description = serializers.CharField(source='exam_session_subject.subject.description')
    product_id = serializers.IntegerField(source='product.id')
    product_code = serializers.CharField(source='product.code')
    product_name = serializers.CharField(source='product.fullname')
    product_short_name = serializers.CharField(source='product.shortname')
    product_description = serializers.CharField(source='product.description')
    variations = serializers.SerializerMethodField()

    class Meta:
        model = ExamSessionSubjectProduct
        fields = [
            'id', 'essp_id', 'type', 'product_id', 'product_code', 'product_name', 'product_short_name',
            'product_description', 'subject_id', 'subject_code', 'subject_description', 'variations',
        ]

    def get_type(self, obj):
        if 'mark' in obj.product.code.lower() or 'mark' in obj.product.fullname.lower():
            return 'Markings'
        return 'Other'

    def get_variations(self, obj):
        # Get all ExamSessionSubjectProductVariation for this product using the correct related name
        esspvs = obj.variations.all()
        # Return a list of dicts with variation info and all prices
        return [
            {
                'id': esspv.product_product_variation.id,
                'variation_type': esspv.product_product_variation.product_variation.variation_type,
                'name': esspv.product_product_variation.product_variation.name,
                'description': esspv.product_product_variation.product_variation.description,
                'prices': [
                    {
                        'id': price.id,
                        'price_type': price.price_type,
                        'amount': price.amount,
                        'currency': price.currency,
                    }
                    for price in esspv.prices.all()
                ]
            }
            for esspv in esspvs
        ]

class PriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Price
        fields = [
            "id", "variation", "price_type", "amount", "currency", "created_at", "updated_at"
        ]
        read_only_fields = ['created_at', 'updated_at']

class ExamSessionSubjectProductVariationSerializer(serializers.ModelSerializer):
    price = PriceSerializer(read_only=True)

    class Meta:
        model = ExamSessionSubjectProductVariation
        fields = ['id', 'exam_session_subject_product', 'product_product_variation', 'product_code', 'created_at', 'updated_at', 'price']
        read_only_fields = ['created_at', 'updated_at']
