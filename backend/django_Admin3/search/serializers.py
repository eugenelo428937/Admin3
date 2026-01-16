"""
Search API Serializers.

Request and response serializers for the search endpoints.
Uses store.Product directly with grouped response format.
"""
from rest_framework import serializers
from collections import defaultdict
from store.models import Product as StoreProduct


class StoreProductListSerializer:
    """
    Serializer for store.Product that groups variations.

    Produces the same response format as the legacy ESSP ProductListSerializer
    by grouping store.Product instances by their underlying catalog.Product
    and exam_session_subject.
    """

    @classmethod
    def serialize_grouped_products(cls, store_products):
        """
        Group store products by catalog.Product + exam_session_subject
        and serialize in the expected format.

        Args:
            store_products: QuerySet or list of store.Product instances

        Returns:
            List of dicts in the expected frontend format
        """
        # Group products by (exam_session_subject_id, catalog_product_id)
        grouped = defaultdict(list)

        for sp in store_products:
            key = (sp.exam_session_subject_id, sp.product_product_variation.product_id)
            grouped[key].append(sp)

        results = []
        for (ess_id, product_id), variations in grouped.items():
            # Use first variation to get common fields
            first = variations[0]
            ess = first.exam_session_subject
            catalog_product = first.product_product_variation.product

            # Determine product type
            product_type = cls._get_product_type(catalog_product)

            # Build variations array
            variations_data = []
            for sp in variations:
                ppv = sp.product_product_variation
                pv = ppv.product_variation

                variation_data = {
                    'id': ppv.id,
                    'store_product_id': sp.id,
                    'variation_type': pv.variation_type,
                    'name': pv.name,
                    'description': pv.description,
                    'description_short': pv.description_short,
                    'prices': [
                        {
                            'id': price.id,
                            'price_type': price.price_type,
                            'amount': str(price.amount),
                            'currency': price.currency,
                        }
                        for price in sp.prices.all()
                    ]
                }

                # Add tutorial events if available
                if product_type == 'Tutorial' and hasattr(sp, 'tutorial_events'):
                    variation_data['events'] = cls._serialize_tutorial_events(sp)

                # Add recommendation if exists
                if hasattr(ppv, 'recommendation') and ppv.recommendation:
                    variation_data['recommended_product'] = cls._serialize_recommendation(
                        ppv.recommendation, ess
                    )

                variations_data.append(variation_data)

            # Build product data
            product_data = {
                'id': first.id,  # Use first store.Product id as primary
                'essp_id': first.id,  # For backward compatibility
                'store_product_id': first.id,
                'type': product_type,
                'product_id': catalog_product.id,
                'product_code': catalog_product.code,
                'product_name': catalog_product.fullname,
                'product_short_name': catalog_product.shortname,
                'product_description': catalog_product.description,
                'buy_both': getattr(catalog_product, 'buy_both', False),
                'subject_id': ess.subject.id,
                'subject_code': ess.subject.code,
                'subject_description': ess.subject.description,
                'exam_session_code': ess.exam_session.session_code,
                'exam_session_id': ess.exam_session.id,
                'variations': variations_data,
            }

            results.append(product_data)

        return results

    @classmethod
    def _get_product_type(cls, catalog_product):
        """Determine product type from catalog.Product."""
        # Check product groups first
        if hasattr(catalog_product, 'groups'):
            for group in catalog_product.groups.all():
                group_name = group.name.lower()
                if 'tutorial' in group_name:
                    return 'Tutorial'
                elif 'marking' in group_name:
                    return 'Markings'

        # Fallback to product name
        product_name = (catalog_product.fullname or '').lower()
        if 'tutorial' in product_name:
            return 'Tutorial'
        elif 'marking' in product_name:
            return 'Markings'

        return 'Materials'

    @classmethod
    def _serialize_tutorial_events(cls, store_product):
        """Serialize tutorial events for a store product."""
        events = []
        try:
            for event in store_product.tutorial_events.all():
                events.append({
                    'id': event.id,
                    'code': event.code,
                    'venue': event.venue,
                    'is_soldout': event.is_soldout,
                    'finalisation_date': event.finalisation_date.isoformat() if event.finalisation_date else None,
                    'remain_space': event.remain_space,
                    'start_date': event.start_date.isoformat() if event.start_date else None,
                    'end_date': event.end_date.isoformat() if event.end_date else None,
                    'title': event.code,
                    'price': None
                })
        except Exception:
            pass
        return events

    @classmethod
    def _serialize_recommendation(cls, recommendation, exam_session_subject):
        """Serialize product recommendation."""
        try:
            rec_ppv = recommendation.recommended_product_product_variation

            # Find the store.Product for this recommendation in same exam session
            rec_store_product = StoreProduct.objects.filter(
                product_product_variation=rec_ppv,
                exam_session_subject=exam_session_subject
            ).prefetch_related('prices').first()

            if rec_store_product:
                return {
                    'essp_id': rec_store_product.id,
                    'store_product_id': rec_store_product.id,
                    'product_code': rec_ppv.product.code,
                    'product_name': rec_ppv.product.fullname,
                    'product_short_name': rec_ppv.product.shortname,
                    'variation_type': rec_ppv.product_variation.variation_type,
                    'prices': [
                        {
                            'id': price.id,
                            'price_type': price.price_type,
                            'amount': str(price.amount),
                            'currency': price.currency,
                        }
                        for price in rec_store_product.prices.all()
                    ]
                }
        except Exception:
            pass
        return None


class ProductSearchRequestSerializer(serializers.Serializer):
    """
    Serializer for unified product search request.

    Request format:
    {
        "searchQuery": "CM2 tutorial",
        "filters": {
            "subjects": ["CM2", "SA1"],
            "categories": ["Bundle"],
            "product_types": ["Core Study Material"],
            "products": [],
            "modes_of_delivery": ["Ebook"]
        },
        "pagination": {
            "page": 1,
            "page_size": 20
        },
        "options": {
            "include_bundles": true,
            "include_analytics": false
        }
    }
    """
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
        """Validate pagination parameters."""
        if value:
            page = value.get('page', 1)
            page_size = value.get('page_size', 20)

            if not isinstance(page, int) or page < 1:
                raise serializers.ValidationError("page must be a positive integer")
            if not isinstance(page_size, int) or page_size < 1 or page_size > 100:
                raise serializers.ValidationError("page_size must be between 1 and 100")

        return value

    def validate_filters(self, value):
        """Validate filter parameters."""
        if value:
            valid_filter_types = [
                'subjects', 'categories', 'product_types',
                'products', 'essp_ids', 'product_ids',
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
    """Serializer for filter counts in response."""
    subjects = serializers.DictField(child=serializers.IntegerField(), required=False)
    categories = serializers.DictField(child=serializers.IntegerField(), required=False)
    product_types = serializers.DictField(child=serializers.IntegerField(), required=False)
    products = serializers.DictField(child=serializers.IntegerField(), required=False)
    modes_of_delivery = serializers.DictField(child=serializers.IntegerField(), required=False)


class ProductSearchPaginationSerializer(serializers.Serializer):
    """Serializer for pagination info in response."""
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    total_count = serializers.IntegerField()
    has_next = serializers.BooleanField()
    has_previous = serializers.BooleanField()


class ProductSearchResponseSerializer(serializers.Serializer):
    """Serializer for unified product search response."""
    products = serializers.ListField(child=serializers.DictField())
    filter_counts = FilterCountSerializer()
    pagination = ProductSearchPaginationSerializer()


__all__ = [
    'StoreProductListSerializer',
    'ProductSearchRequestSerializer',
    'FilterCountSerializer',
    'ProductSearchPaginationSerializer',
    'ProductSearchResponseSerializer',
]
