"""Search serializers for the store app.

DEPRECATED: This module is superseded by search.serializers.StoreProductListSerializer
which correctly groups products by (exam_session_subject_id, catalog_product_id).

The group_store_products_for_search() function incorrectly grouped by catalog_product_id
alone, causing products from different exam sessions/subjects to merge their variations.

Use StoreProductListSerializer.serialize_grouped_products() instead.
"""
import warnings
from rest_framework import serializers
from store.models import Product, Price


class SearchVariationPriceSerializer(serializers.ModelSerializer):
    """Price data for search result variations."""

    class Meta:
        model = Price
        fields = ['id', 'price_type', 'amount', 'currency']


class SearchProductSerializer(serializers.Serializer):
    """
    Serializer for search results that groups store products by catalog product.

    Transforms store.Product records into the format MaterialProductCard expects:
    - Groups products by their catalog.Product template
    - Creates variations array with nested prices
    - Includes subject_code, session_code, product_name, type

    Expected output format:
    {
        "id": 123,  # catalog.Product ID
        "subject_code": "CM2",
        "session_code": "2025-04",
        "product_name": "Combined Materials Pack",
        "shortname": "CM Pack",
        "type": "Material",
        "buy_both": true,
        "variations": [
            {
                "id": 456,  # store.Product ID
                "name": "Printed",
                "variation_type": "Printed",
                "description": "Printed materials",
                "prices": [{"price_type": "standard", "amount": "99.00"}]
            }
        ]
    }
    """
    id = serializers.IntegerField()
    subject_code = serializers.CharField()
    subject_name = serializers.CharField()
    session_code = serializers.CharField()
    exam_session_code = serializers.CharField()  # Alias for frontend compatibility
    product_name = serializers.CharField()
    shortname = serializers.CharField()
    fullname = serializers.CharField()
    code = serializers.CharField()
    description = serializers.CharField(allow_blank=True)
    type = serializers.CharField()
    buy_both = serializers.BooleanField()
    is_active = serializers.BooleanField()
    variations = serializers.ListField()


def group_store_products_for_search(store_products):
    """
    DEPRECATED: Use search.serializers.StoreProductListSerializer.serialize_grouped_products() instead.

    This function incorrectly groups by catalog_product_id alone, causing products
    from different exam sessions/subjects to merge their variations.

    Args:
        store_products: QuerySet of store.Product with related data prefetched

    Returns:
        list: List of dicts formatted for SearchProductSerializer
    """
    warnings.warn(
        "group_store_products_for_search is deprecated. "
        "Use search.serializers.StoreProductListSerializer.serialize_grouped_products() instead.",
        DeprecationWarning,
        stacklevel=2
    )
    from collections import defaultdict

    # Group by catalog product ID
    grouped = defaultdict(list)
    catalog_products = {}

    for store_product in store_products:
        ppv = store_product.product_product_variation
        catalog_product = ppv.product
        catalog_products[catalog_product.id] = {
            'catalog_product': catalog_product,
            'ess': store_product.exam_session_subject,
        }
        grouped[catalog_product.id].append(store_product)

    # Build result list
    results = []
    for catalog_id, store_prods in grouped.items():
        info = catalog_products[catalog_id]
        catalog_product = info['catalog_product']
        ess = info['ess']

        # Compute type from product groups
        group_names = [g.name for g in catalog_product.groups.all()]
        if 'Tutorial' in group_names:
            product_type = 'Tutorial'
        elif 'Marking' in group_names:
            product_type = 'Markings'
        else:
            product_type = 'Material'

        # Build variations array
        variations = []
        for sp in store_prods:
            pv = sp.product_product_variation.product_variation
            prices = [
                {
                    'id': p.id,
                    'price_type': p.price_type,
                    'amount': str(p.amount),
                    'currency': p.currency,
                }
                for p in sp.prices.all()
            ]
            variations.append({
                'id': sp.id,  # store.Product ID for cart operations
                'name': pv.name,
                'variation_type': pv.variation_type,
                'description': pv.description or '',
                'prices': prices,
            })

        results.append({
            'id': catalog_id,  # catalog.Product ID for grouping
            'subject_code': ess.subject.code,
            'subject_name': ess.subject.description,
            'session_code': ess.exam_session.session_code,
            'exam_session_code': ess.exam_session.session_code,  # Alias
            'product_name': catalog_product.fullname,
            'shortname': catalog_product.shortname,
            'fullname': catalog_product.fullname,
            'code': catalog_product.code,
            'description': catalog_product.description or '',
            'type': product_type,
            'buy_both': catalog_product.buy_both,
            'is_active': catalog_product.is_active,
            'variations': variations,
        })

    return results
