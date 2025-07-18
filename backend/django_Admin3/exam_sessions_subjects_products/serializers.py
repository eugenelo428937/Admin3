from rest_framework import serializers
from .models import ExamSessionSubjectProduct, ExamSessionSubjectProductVariation, Price
from exam_sessions_subjects.serializers import ExamSessionSubjectSerializer
from products.serializers import ProductSerializer, ProductVariationSerializer
from subjects.models import Subject
from products.models.products import Product, ProductVariation
from tutorials.models import TutorialEvent


class ExamSessionSubjectProductSerializer(serializers.ModelSerializer):
    exam_session_subject_details = ExamSessionSubjectSerializer(source='exam_session_subject', read_only=True)
    product_details = ProductSerializer(source='product', read_only=True)
    type = serializers.SerializerMethodField()

    class Meta:
        model = ExamSessionSubjectProduct
        fields = ['id', 'exam_session_subject', 'product', 'created_at', 'updated_at',
                 'exam_session_subject_details', 'product_details', 'type']
        read_only_fields = ['created_at', 'updated_at']

    def get_type(self, obj):
        """Determine product type based on product name or category"""
        product_name = obj.product.fullname.lower()

        if 'tutorial' in product_name:
            return 'Tutorial'
        elif 'marking' in product_name or obj.product.group_name == 'Markings':
            return 'Markings'
        else:
            return 'Materials'  # or whatever default you want

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
        """Get product type from Product Group"""
        if hasattr(obj.product, 'group_name') and obj.product.group_name:
            group_name = obj.product.group_name.lower()
            if 'tutorial' in group_name:
                return 'Tutorial'
            elif 'marking' in group_name:
                return 'Markings'
        
        # Fallback to product name if group_name is not available or doesn't match
        product_name = obj.product.fullname.lower()
        if 'tutorial' in product_name:
            return 'Tutorial'
        elif 'marking' in product_name:
            return 'Markings'
        
        return 'Materials'  # Default for other products

    def get_variations(self, obj):
        # Get all ExamSessionSubjectProductVariation for this product using the correct related name
        esspvs = obj.variations.all()
        
        # Check if this is a tutorial product
        product_type = self.get_type(obj)
        
        variations_data = []
        for esspv in esspvs:
            variation_data = {
                'id': esspv.product_product_variation.id,
                'variation_type': esspv.product_product_variation.product_variation.variation_type,
                'name': esspv.product_product_variation.product_variation.name,
                'description': esspv.product_product_variation.product_variation.description,
                'description_short': esspv.product_product_variation.product_variation.description_short,
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
            
            # Add tutorial events if this is a tutorial product
            if product_type == 'Tutorial':
                tutorial_events = TutorialEvent.objects.filter(
                    exam_session_subject_product_variation=esspv
                ).select_related()
                
                variation_data['events'] = [
                    {
                        'id': event.id,
                        'code': event.code,
                        'venue': event.venue,
                        'is_soldout': event.is_soldout,
                        'finalisation_date': event.finalisation_date.isoformat() if event.finalisation_date else None,
                        'remain_space': event.remain_space,
                        'start_date': event.start_date.isoformat() if event.start_date else None,
                        'end_date': event.end_date.isoformat() if event.end_date else None,
                        'title': event.code,
                        'price': None  # Add price logic if available
                    }
                    for event in tutorial_events
                ]
            
            variations_data.append(variation_data)
        
        return variations_data

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
