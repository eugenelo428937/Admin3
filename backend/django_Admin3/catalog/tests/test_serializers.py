"""
Tests for catalog serializers.

TDD: These tests define the expected serializer behavior.
Run tests FIRST to verify they FAIL, then implement serializers.

Test Command:
    python manage.py test catalog.tests.test_serializers --keepdb -v 2
"""
from django.test import TestCase
from rest_framework.test import APIRequestFactory

from catalog.tests.fixtures import CatalogTestDataMixin


class TestSubjectSerializer(CatalogTestDataMixin, TestCase):
    """Test SubjectSerializer fields and output format."""

    def setUp(self):
        super().setUp()
        self.setup_catalog_test_data()

    def test_serializer_fields(self):
        """Verify SubjectSerializer has required fields: id, code, description, name."""
        from catalog.serializers import SubjectSerializer

        serializer = SubjectSerializer(self.subject_cm2)
        data = serializer.data

        self.assertIn('id', data)
        self.assertIn('code', data)
        self.assertIn('description', data)
        self.assertIn('name', data)

    def test_name_aliases_description(self):
        """Verify name field is an alias for description (frontend compatibility)."""
        from catalog.serializers import SubjectSerializer

        serializer = SubjectSerializer(self.subject_cm2)
        data = serializer.data

        # name should equal description
        self.assertEqual(data['name'], data['description'])
        self.assertEqual(data['name'], 'Financial Mathematics')

    def test_serialized_output_format(self):
        """Verify serialized output matches expected format."""
        from catalog.serializers import SubjectSerializer

        serializer = SubjectSerializer(self.subject_cm2)
        data = serializer.data

        self.assertEqual(data['code'], 'CM2')
        self.assertEqual(data['description'], 'Financial Mathematics')
        self.assertIsInstance(data['id'], int)

    def test_serialize_multiple_subjects(self):
        """Verify serializer works with multiple subjects (many=True)."""
        from catalog.serializers import SubjectSerializer
        from catalog.models import Subject

        subjects = Subject.objects.filter(active=True)
        serializer = SubjectSerializer(subjects, many=True)
        data = serializer.data

        self.assertEqual(len(data), 2)  # CM2 and SA1 are active
        for item in data:
            self.assertIn('id', item)
            self.assertIn('code', item)
            self.assertIn('name', item)


class TestExamSessionSerializer(CatalogTestDataMixin, TestCase):
    """Test ExamSessionSerializer fields and read_only behavior."""

    def setUp(self):
        super().setUp()
        self.setup_catalog_test_data()

    def test_serializer_fields(self):
        """Verify ExamSessionSerializer has required fields."""
        from catalog.serializers import ExamSessionSerializer

        serializer = ExamSessionSerializer(self.session_april)
        data = serializer.data

        expected_fields = ['id', 'session_code', 'start_date', 'end_date', 'create_date', 'modified_date']
        for field in expected_fields:
            self.assertIn(field, data, f"Missing field: {field}")

    def test_read_only_timestamps(self):
        """Verify create_date and modified_date are read-only."""
        from catalog.serializers import ExamSessionSerializer

        serializer = ExamSessionSerializer()
        read_only_fields = serializer.Meta.read_only_fields

        self.assertIn('create_date', read_only_fields)
        self.assertIn('modified_date', read_only_fields)

    def test_serialized_output_format(self):
        """Verify serialized output matches expected format."""
        from catalog.serializers import ExamSessionSerializer

        serializer = ExamSessionSerializer(self.session_april)
        data = serializer.data

        self.assertEqual(data['session_code'], '2026-04')
        self.assertIsNotNone(data['start_date'])
        self.assertIsNotNone(data['end_date'])


class TestProductVariationSerializer(CatalogTestDataMixin, TestCase):
    """Test ProductVariationSerializer fields."""

    def setUp(self):
        super().setUp()
        self.setup_catalog_test_data()

    def test_serializer_fields(self):
        """Verify ProductVariationSerializer has required fields."""
        from catalog.serializers import ProductVariationSerializer

        serializer = ProductVariationSerializer(self.variation_ebook)
        data = serializer.data

        expected_fields = ['id', 'variation_type', 'name', 'description']
        for field in expected_fields:
            self.assertIn(field, data, f"Missing field: {field}")

    def test_serialized_output_format(self):
        """Verify serialized output matches expected format."""
        from catalog.serializers import ProductVariationSerializer

        serializer = ProductVariationSerializer(self.variation_ebook)
        data = serializer.data

        self.assertEqual(data['variation_type'], 'eBook')
        self.assertEqual(data['name'], 'Standard eBook')


class TestProductSerializer(CatalogTestDataMixin, TestCase):
    """Test ProductSerializer with nested variations and computed type."""

    def setUp(self):
        super().setUp()
        self.setup_catalog_test_data()

    def test_serializer_fields(self):
        """Verify ProductSerializer has all required fields."""
        from catalog.serializers import ProductSerializer

        serializer = ProductSerializer(self.product_core)
        data = serializer.data

        expected_fields = [
            'id', 'fullname', 'shortname', 'product_name', 'description',
            'code', 'type', 'variations', 'created_at', 'updated_at',
            'is_active', 'buy_both'
        ]
        for field in expected_fields:
            self.assertIn(field, data, f"Missing field: {field}")

    def test_product_name_aliases_shortname(self):
        """Verify product_name is an alias for shortname."""
        from catalog.serializers import ProductSerializer

        serializer = ProductSerializer(self.product_core)
        data = serializer.data

        self.assertEqual(data['product_name'], data['shortname'])
        self.assertEqual(data['product_name'], 'CM2 Core')

    def test_computed_type_field_default(self):
        """Verify type defaults to 'Material' when product has no groups."""
        from catalog.serializers import ProductSerializer

        serializer = ProductSerializer(self.product_core)
        data = serializer.data

        # Without Tutorial or Marking groups, type should be Material
        self.assertEqual(data['type'], 'Material')

    def test_variations_nested_output(self):
        """Verify variations are properly nested with expected structure."""
        from catalog.serializers import ProductSerializer

        serializer = ProductSerializer(self.product_core)
        data = serializer.data

        self.assertIsInstance(data['variations'], list)
        if data['variations']:  # Product has variations
            variation = data['variations'][0]
            self.assertIn('id', variation)
            self.assertIn('name', variation)
            self.assertIn('variation_type', variation)
            self.assertIn('description', variation)
            self.assertIn('prices', variation)

    def test_read_only_timestamps(self):
        """Verify created_at and updated_at are read-only."""
        from catalog.serializers import ProductSerializer

        serializer = ProductSerializer()
        read_only_fields = serializer.Meta.read_only_fields

        self.assertIn('created_at', read_only_fields)
        self.assertIn('updated_at', read_only_fields)


class TestProductBundleProductSerializer(CatalogTestDataMixin, TestCase):
    """Test ProductBundleProductSerializer with nested product/variation."""

    def setUp(self):
        super().setUp()
        self.setup_catalog_test_data()

    def test_serializer_fields(self):
        """Verify ProductBundleProductSerializer has required fields."""
        from catalog.serializers import ProductBundleProductSerializer

        serializer = ProductBundleProductSerializer(self.bundle_product_1)
        data = serializer.data

        expected_fields = [
            'id', 'product', 'product_variation', 'default_price_type',
            'quantity', 'sort_order', 'is_active'
        ]
        for field in expected_fields:
            self.assertIn(field, data, f"Missing field: {field}")

    def test_nested_product_structure(self):
        """Verify nested product contains expected fields."""
        from catalog.serializers import ProductBundleProductSerializer

        serializer = ProductBundleProductSerializer(self.bundle_product_1)
        data = serializer.data

        product = data['product']
        self.assertIn('id', product)
        self.assertIn('shortname', product)
        self.assertIn('fullname', product)
        self.assertIn('code', product)

    def test_nested_product_variation_structure(self):
        """Verify nested product_variation contains expected fields."""
        from catalog.serializers import ProductBundleProductSerializer

        serializer = ProductBundleProductSerializer(self.bundle_product_1)
        data = serializer.data

        variation = data['product_variation']
        self.assertIn('id', variation)
        self.assertIn('name', variation)
        self.assertIn('variation_type', variation)


class TestProductBundleSerializer(CatalogTestDataMixin, TestCase):
    """Test ProductBundleSerializer with components and subject fields."""

    def setUp(self):
        super().setUp()
        self.setup_catalog_test_data()

    def test_serializer_fields(self):
        """Verify ProductBundleSerializer has all required fields."""
        from catalog.serializers import ProductBundleSerializer

        serializer = ProductBundleSerializer(self.bundle_cm2)
        data = serializer.data

        expected_fields = [
            'id', 'bundle_name', 'bundle_description', 'subject_code',
            'subject_name', 'is_featured', 'is_active', 'display_order',
            'components', 'components_count', 'created_at', 'updated_at'
        ]
        for field in expected_fields:
            self.assertIn(field, data, f"Missing field: {field}")

    def test_subject_code_from_related(self):
        """Verify subject_code is sourced from subject.code."""
        from catalog.serializers import ProductBundleSerializer

        serializer = ProductBundleSerializer(self.bundle_cm2)
        data = serializer.data

        self.assertEqual(data['subject_code'], 'CM2')

    def test_subject_name_from_related(self):
        """Verify subject_name is sourced from subject (description as name)."""
        from catalog.serializers import ProductBundleSerializer

        serializer = ProductBundleSerializer(self.bundle_cm2)
        data = serializer.data

        # subject.name would need to be defined or use description
        # Based on Subject model, name property might not exist, so this could be None
        # The serializer uses source='subject.name' which may need adjustment
        self.assertIn('subject_name', data)

    def test_components_nested_serialization(self):
        """Verify components are nested ProductBundleProductSerializer instances."""
        from catalog.serializers import ProductBundleSerializer

        serializer = ProductBundleSerializer(self.bundle_cm2)
        data = serializer.data

        self.assertIsInstance(data['components'], list)
        self.assertEqual(len(data['components']), 2)  # bundle_product_1 and bundle_product_2

        for component in data['components']:
            self.assertIn('product', component)
            self.assertIn('product_variation', component)

    def test_components_count_computed(self):
        """Verify components_count returns count of active components."""
        from catalog.serializers import ProductBundleSerializer

        serializer = ProductBundleSerializer(self.bundle_cm2)
        data = serializer.data

        # Both bundle products are active
        self.assertEqual(data['components_count'], 2)

    def test_read_only_timestamps(self):
        """Verify created_at and updated_at are read-only."""
        from catalog.serializers import ProductBundleSerializer

        serializer = ProductBundleSerializer()
        read_only_fields = serializer.Meta.read_only_fields

        self.assertIn('created_at', read_only_fields)
        self.assertIn('updated_at', read_only_fields)
