"""
Bundle serializers for the catalog API.

Location: catalog/serializers/bundle_serializers.py
Models:
- catalog.models.ProductBundleProduct
- catalog.models.ProductBundle
- exam_sessions_subjects_products.models.ExamSessionSubjectBundleProduct
- exam_sessions_subjects_products.models.ExamSessionSubjectBundle

Contract (from contracts/serializers.md):
- ProductBundleProductSerializer: id, product (nested), product_variation (nested),
                                   default_price_type, quantity, sort_order, is_active
- ProductBundleSerializer: id, bundle_name, bundle_description, subject_code, subject_name,
                           is_featured, is_active, display_order, components, components_count,
                           created_at, updated_at
- ExamSessionSubjectBundleProductSerializer: id, product (nested), product_variation (nested),
                                              exam_session_product_code, exam_session_product_id,
                                              default_price_type, quantity, sort_order, is_active, prices
- ExamSessionSubjectBundleSerializer: id, bundle_name, bundle_description, subject_code, subject_name,
                                      exam_session_code, master_bundle_id, components, components_count,
                                      is_featured, is_active, display_order, created_at, updated_at
"""
from rest_framework import serializers

from catalog.models import ProductBundle, ProductBundleProduct


class ProductBundleProductSerializer(serializers.ModelSerializer):
    """
    Serializer for ProductBundleProduct (bundle components).

    Provides nested product and product_variation objects via SerializerMethodField
    to extract data from the ProductProductVariation junction table.

    Fields:
        id (int): Primary key
        product (dict): Nested {id, shortname, fullname, code}
        product_variation (dict): Nested {id, name, variation_type}
        default_price_type (str): Default pricing tier
        quantity (int): Quantity in bundle
        sort_order (int): Display order
        is_active (bool): Active status
    """
    product = serializers.SerializerMethodField()
    product_variation = serializers.SerializerMethodField()

    class Meta:
        model = ProductBundleProduct
        fields = [
            'id', 'product', 'product_variation', 'default_price_type',
            'quantity', 'sort_order', 'is_active'
        ]

    def get_product(self, obj):
        """
        Get product info from ProductProductVariation junction.

        Returns:
            dict: {id, shortname, fullname, code}
        """
        return {
            'id': obj.product_product_variation.product.id,
            'shortname': obj.product_product_variation.product.shortname,
            'fullname': obj.product_product_variation.product.fullname,
            'code': obj.product_product_variation.product.code,
        }

    def get_product_variation(self, obj):
        """
        Get variation info from ProductProductVariation junction.

        Returns:
            dict: {id, name, variation_type}
        """
        return {
            'id': obj.product_product_variation.product_variation.id,
            'name': obj.product_product_variation.product_variation.name,
            'variation_type': obj.product_product_variation.product_variation.variation_type,
        }


class ProductBundleSerializer(serializers.ModelSerializer):
    """
    Serializer for ProductBundle (master bundles).

    Provides subject_code/subject_name from the related Subject model,
    and components as nested ProductBundleProductSerializer instances.

    Fields:
        id (int): Primary key
        bundle_name (str): Bundle display name
        bundle_description (str): Bundle description
        subject_code (str): Related subject code (read-only)
        subject_name (str): Related subject description/name (read-only)
        is_featured (bool): Featured flag
        is_active (bool): Active status
        display_order (int): Sort order
        components (list): Nested ProductBundleProductSerializer
        components_count (int): Count of active components
        created_at (datetime): Creation timestamp (read-only)
        updated_at (datetime): Last update timestamp (read-only)
    """
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    # Note: Subject model has 'description' field, not 'name' property
    # Using description as the "name" for consistency with SubjectSerializer
    subject_name = serializers.CharField(source='subject.description', read_only=True)

    components = ProductBundleProductSerializer(source='bundle_products', many=True, read_only=True)
    components_count = serializers.SerializerMethodField()

    class Meta:
        model = ProductBundle
        fields = [
            'id', 'bundle_name', 'bundle_description', 'subject_code', 'subject_name',
            'is_featured', 'is_active', 'display_order', 'components', 'components_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_components_count(self, obj):
        """
        Get count of active bundle components.

        Returns:
            int: Number of active ProductBundleProduct records
        """
        return obj.bundle_products.filter(is_active=True).count()


# =============================================================================
# ExamSessionSubjectBundle serializers
# =============================================================================

# Import ExamSessionSubjectBundle models lazily to avoid circular imports
# These models are in exam_sessions_subjects_products app

class ExamSessionSubjectBundleProductSerializer(serializers.Serializer):
    """
    Serializer for ExamSessionSubjectBundleProduct (exam session bundle components).

    Uses Serializer (not ModelSerializer) to handle the complex nested structure
    that spans multiple apps.

    Fields:
        id (int): Primary key
        product (dict): Nested {id, shortname, fullname, code}
        product_variation (dict): Nested {id, name, variation_type, description_short}
        exam_session_product_code (str): ESSP variation code
        exam_session_product_id (int): ESSP ID
        default_price_type (str): Default pricing
        quantity (int): Quantity
        sort_order (int): Display order
        is_active (bool): Active status
        prices (list): List of price objects
    """
    id = serializers.IntegerField(read_only=True)
    product = serializers.SerializerMethodField()
    product_variation = serializers.SerializerMethodField()
    exam_session_product_code = serializers.SerializerMethodField()
    exam_session_product_id = serializers.SerializerMethodField()
    default_price_type = serializers.CharField(read_only=True)
    quantity = serializers.IntegerField(read_only=True)
    sort_order = serializers.IntegerField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    prices = serializers.SerializerMethodField()

    def get_product(self, obj):
        """Get product info from ExamSessionSubjectProductVariation."""
        essp = obj.exam_session_subject_product_variation.exam_session_subject_product
        return {
            'id': essp.product.id,
            'shortname': essp.product.shortname,
            'fullname': essp.product.fullname,
            'code': essp.product.code,
        }

    def get_product_variation(self, obj):
        """Get variation info from ExamSessionSubjectProductVariation."""
        ppv = obj.exam_session_subject_product_variation.product_product_variation
        return {
            'id': ppv.product_variation.id,
            'name': ppv.product_variation.name,
            'variation_type': ppv.product_variation.variation_type,
            'description_short': ppv.product_variation.description_short or '',
        }

    def get_exam_session_product_code(self, obj):
        """Get the exam session product code."""
        return obj.exam_session_subject_product_variation.product_code

    def get_exam_session_product_id(self, obj):
        """Get the exam session subject product ID (ESSP ID)."""
        return obj.exam_session_subject_product_variation.exam_session_subject_product.id

    def get_prices(self, obj):
        """Get all prices for this product variation."""
        espv = obj.exam_session_subject_product_variation
        return [
            {
                'id': price.id,
                'price_type': price.price_type,
                'amount': str(price.amount),  # Convert Decimal to string for JSON
                'currency': price.currency,
            }
            for price in espv.prices.all()
        ]


class ExamSessionSubjectBundleSerializer(serializers.Serializer):
    """
    Serializer for ExamSessionSubjectBundle (exam session bundles).

    Uses Serializer (not ModelSerializer) to handle the complex nested structure
    that spans multiple apps.

    Fields:
        id (int): Primary key
        bundle_name (str): Effective bundle name
        bundle_description (str): Effective description
        subject_code (str): Subject code
        subject_name (str): Subject name/description
        exam_session_code (str): Session code
        master_bundle_id (int): Master bundle reference
        components (list): Nested bundle components
        components_count (int): Active components count
        is_featured (bool): Featured flag (from master bundle)
        is_active (bool): Active status
        display_order (int): Sort order
        created_at (datetime): Creation timestamp
        updated_at (datetime): Last update timestamp
    """
    id = serializers.IntegerField(read_only=True)
    bundle_name = serializers.CharField(source='effective_name', read_only=True)
    bundle_description = serializers.CharField(source='effective_description', read_only=True)
    subject_code = serializers.CharField(source='exam_session_subject.subject.code', read_only=True)
    subject_name = serializers.CharField(source='exam_session_subject.subject.description', read_only=True)
    exam_session_code = serializers.CharField(source='exam_session_subject.exam_session.session_code', read_only=True)
    master_bundle_id = serializers.IntegerField(source='bundle.id', read_only=True)
    is_featured = serializers.BooleanField(source='bundle.is_featured', read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    display_order = serializers.IntegerField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    components = serializers.SerializerMethodField()
    components_count = serializers.SerializerMethodField()

    def get_components(self, obj):
        """Get serialized bundle components."""
        serializer = ExamSessionSubjectBundleProductSerializer(
            obj.bundle_products.all(),
            many=True
        )
        return serializer.data

    def get_components_count(self, obj):
        """Get count of components (uses prefetched data if available)."""
        return len(obj.bundle_products.all())
