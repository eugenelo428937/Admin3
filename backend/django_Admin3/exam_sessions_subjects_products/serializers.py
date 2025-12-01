from rest_framework import serializers
from django.core.exceptions import ObjectDoesNotExist
from .models import ExamSessionSubjectProduct, ExamSessionSubjectProductVariation, Price
from exam_sessions_subjects.serializers import ExamSessionSubjectSerializer
from products.serializers import ProductSerializer, ProductVariationSerializer
from subjects.models import Subject
from products.models.products import Product, ProductVariation
from products.models import ProductVariationRecommendation
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
    exam_session_code = serializers.CharField(source='exam_session_subject.exam_session.session_code')
    exam_session_id = serializers.IntegerField(source='exam_session_subject.exam_session.id')
    product_id = serializers.IntegerField(source='product.id')
    product_code = serializers.CharField(source='product.code')
    product_name = serializers.CharField(source='product.fullname')
    product_short_name = serializers.CharField(source='product.shortname')
    product_description = serializers.CharField(source='product.description')
    buy_both = serializers.BooleanField(source='product.buy_both', read_only=True)
    variations = serializers.SerializerMethodField()

    class Meta:
        model = ExamSessionSubjectProduct
        fields = [
            'id', 'essp_id', 'type', 'product_id', 'product_code', 'product_name', 'product_short_name',
            'product_description', 'buy_both', 'subject_id', 'subject_code', 'subject_description', 
            'exam_session_code', 'exam_session_id', 'variations',
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

    def get_recommended_product(self, product_product_variation, exam_session_subject=None):
        """Get recommended product if exists for this product-variation combination.

        Uses prefetched recommendation data when available to avoid N+1 queries.
        """
        try:
            # Try to use prefetched recommendation first (avoids query)
            recommendation = getattr(product_product_variation, 'recommendation', None)

            # Fallback to query if not prefetched (shouldn't happen with optimized queryset)
            if recommendation is None:
                try:
                    recommendation = product_product_variation.recommendation
                except ProductVariationRecommendation.DoesNotExist:
                    return None

            if not recommendation:
                return None

            # Find the ExamSessionSubjectProductVariation for the recommended product
            # IMPORTANT: Filter by the same exam_session_subject to ensure recommendations
            # are from the same exam session and subject
            query = ExamSessionSubjectProductVariation.objects.filter(
                product_product_variation=recommendation.recommended_product_product_variation
            )

            # If exam_session_subject is provided, filter for the same session
            if exam_session_subject:
                query = query.filter(
                    exam_session_subject_product__exam_session_subject=exam_session_subject
                )

            recommended_esspv = query.select_related(
                'exam_session_subject_product__exam_session_subject__subject',
                'exam_session_subject_product__product',
                'product_product_variation__product_variation',
                'product_product_variation__product'
            ).prefetch_related('prices').first()

            if recommended_esspv:
                return {
                    'essp_id': recommended_esspv.exam_session_subject_product.id,
                    'esspv_id': recommended_esspv.id,
                    'product_code': recommended_esspv.exam_session_subject_product.product.code,
                    'product_name': recommended_esspv.exam_session_subject_product.product.fullname,
                    'product_short_name': recommended_esspv.exam_session_subject_product.product.shortname,
                    'variation_type': recommended_esspv.product_product_variation.product_variation.variation_type,
                    'prices': [
                        {
                            'id': price.id,
                            'price_type': price.price_type,
                            'amount': price.amount,
                            'currency': price.currency,
                        }
                        for price in recommended_esspv.prices.all()
                    ]
                }
        except (ObjectDoesNotExist, AttributeError):
            pass
        return None

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

            # Add recommended product if exists
            # Pass exam_session_subject to ensure recommended product is from same session
            recommended = self.get_recommended_product(
                esspv.product_product_variation,
                exam_session_subject=esspv.exam_session_subject_product.exam_session_subject
            )
            if recommended:
                variation_data['recommended_product'] = recommended

            # Add tutorial events if this is a tutorial product
            # Uses prefetched tutorial_events to avoid N+1 queries
            if product_type == 'Tutorial':
                # Use prefetched tutorial_events (related_name from TutorialEvent model)
                tutorial_events = esspv.tutorial_events.all()

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


# Unified Search API Serializers
class ProductSearchRequestSerializer(serializers.Serializer):
    """Serializer for unified product search request"""
    searchQuery = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Search query for fuzzy matching"
    )
    filters = serializers.DictField(
        child=serializers.ListField(child=serializers.CharField(), allow_empty=True),
        required=False,
        help_text="Filter criteria with lists of values for each filter type"
    )
    pagination = serializers.DictField(
        required=False,
        help_text="Pagination parameters"
    )
    options = serializers.DictField(
        required=False,
        help_text="Additional options like include_bundles, include_analytics"
    )

    def validate_pagination(self, value):
        """Validate pagination parameters"""
        if value:
            page = value.get('page', 1)
            page_size = value.get('page_size', 20)
            
            if not isinstance(page, int) or page < 1:
                raise serializers.ValidationError("page must be a positive integer")
            if not isinstance(page_size, int) or page_size < 1 or page_size > 100:
                raise serializers.ValidationError("page_size must be between 1 and 100")
        
        return value

    def validate_filters(self, value):
        """Validate filter parameters"""
        if value:
            valid_filter_types = [
                'subjects', 'categories', 'product_types',
                'products', 'essp_ids', 'product_ids',  # essp_ids for fuzzy search, product_ids for navbar
                'modes_of_delivery'
            ]

            for filter_type in value.keys():
                if filter_type not in valid_filter_types:
                    raise serializers.ValidationError(
                        f"Invalid filter type: {filter_type}. "
                        f"Valid types: {', '.join(valid_filter_types)}"
                    )
        
        return value


class FilterCountSerializer(serializers.Serializer):
    """Serializer for filter counts in response"""
    subjects = serializers.DictField(child=serializers.IntegerField(), required=False)
    categories = serializers.DictField(child=serializers.IntegerField(), required=False)
    product_types = serializers.DictField(child=serializers.IntegerField(), required=False)
    products = serializers.DictField(child=serializers.IntegerField(), required=False)
    modes_of_delivery = serializers.DictField(child=serializers.IntegerField(), required=False)


class ProductSearchPaginationSerializer(serializers.Serializer):
    """Serializer for pagination info in response"""
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    total_count = serializers.IntegerField()
    has_next = serializers.BooleanField()
    has_previous = serializers.BooleanField()


class ProductSearchResponseSerializer(serializers.Serializer):
    """Serializer for unified product search response"""
    products = serializers.ListField(child=serializers.DictField())
    filter_counts = FilterCountSerializer()
    pagination = ProductSearchPaginationSerializer()
