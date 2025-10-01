"""
Product Classifier Tests (TDD RED Phase)

Epic 3: Dynamic VAT Calculation System
Phase 3: VAT Context Builder
Task: TASK-024 - Create Product Classifier Tests

These tests will initially fail because the classify_product function doesn't exist yet.
This is intentional and follows TDD RED → GREEN → REFACTOR workflow.
"""
from django.test import TestCase
from vat.product_classifier import classify_product


class TestProductClassifierFunction(TestCase):
    """Test that product classifier function exists and is callable."""

    def test_classify_product_function_exists(self):
        """Test classify_product function can be imported and called."""
        self.assertTrue(callable(classify_product))

    def test_classify_product_returns_dict(self):
        """Test classify_product returns a dictionary."""
        result = classify_product({'product_code': 'TEST-001'})
        self.assertIsInstance(result, dict)


class TestProductClassificationLogic(TestCase):
    """Test product classification based on product code patterns."""

    def test_classify_ebook_product(self):
        """Test eBook products are correctly classified."""
        result = classify_product({'product_code': 'MAT-EBOOK-CS2'})

        self.assertTrue(result['is_ebook'])
        self.assertTrue(result['is_digital'])
        self.assertFalse(result['is_material'])
        self.assertFalse(result['is_live_tutorial'])
        self.assertFalse(result['is_marking'])
        self.assertEqual(result['product_type'], 'ebook')

    def test_classify_printed_material(self):
        """Test printed materials are correctly classified."""
        result = classify_product({'product_code': 'MAT-PRINT-CM1'})

        self.assertFalse(result['is_ebook'])
        self.assertFalse(result['is_digital'])
        self.assertTrue(result['is_material'])
        self.assertFalse(result['is_live_tutorial'])
        self.assertFalse(result['is_marking'])
        self.assertEqual(result['product_type'], 'material')

    def test_classify_digital_product(self):
        """Test digital products (non-ebook) are correctly classified."""
        result = classify_product({'product_code': 'MAT-DIGITAL-ONLINE-CS1'})

        self.assertFalse(result['is_ebook'])
        self.assertTrue(result['is_digital'])
        self.assertFalse(result['is_material'])
        self.assertFalse(result['is_live_tutorial'])
        self.assertFalse(result['is_marking'])
        self.assertEqual(result['product_type'], 'digital')

    def test_classify_online_tutorial(self):
        """Test online tutorials are classified as digital."""
        result = classify_product({'product_code': 'TUT-ONLINE-CM2'})

        self.assertFalse(result['is_ebook'])
        self.assertTrue(result['is_digital'])
        self.assertFalse(result['is_material'])
        self.assertFalse(result['is_live_tutorial'])
        self.assertFalse(result['is_marking'])
        self.assertEqual(result['product_type'], 'digital')

    def test_classify_live_tutorial(self):
        """Test live tutorials are correctly classified."""
        result = classify_product({'product_code': 'TUT-LIVE-CS1'})

        self.assertFalse(result['is_ebook'])
        self.assertFalse(result['is_digital'])
        self.assertFalse(result['is_material'])
        self.assertTrue(result['is_live_tutorial'])
        self.assertFalse(result['is_marking'])
        self.assertEqual(result['product_type'], 'live_tutorial')

    def test_classify_marking_product(self):
        """Test marking products are correctly classified."""
        result = classify_product({'product_code': 'MARK-ASSIGNMENT-CM1'})

        self.assertFalse(result['is_ebook'])
        self.assertFalse(result['is_digital'])
        self.assertFalse(result['is_material'])
        self.assertFalse(result['is_live_tutorial'])
        self.assertTrue(result['is_marking'])
        self.assertEqual(result['product_type'], 'marking')

    def test_classify_unknown_product_type(self):
        """Test unknown product types default to material."""
        result = classify_product({'product_code': 'UNKNOWN-XYZ-123'})

        self.assertFalse(result['is_ebook'])
        self.assertFalse(result['is_digital'])
        self.assertTrue(result['is_material'])  # Default to material
        self.assertFalse(result['is_live_tutorial'])
        self.assertFalse(result['is_marking'])
        self.assertEqual(result['product_type'], 'material')


class TestProductClassificationEdgeCases(TestCase):
    """Test edge cases and error handling in product classification."""

    def test_classify_case_insensitive(self):
        """Test classification is case-insensitive."""
        # Test lowercase
        result_lower = classify_product({'product_code': 'mat-ebook-cs2'})
        self.assertTrue(result_lower['is_ebook'])

        # Test uppercase
        result_upper = classify_product({'product_code': 'MAT-EBOOK-CS2'})
        self.assertTrue(result_upper['is_ebook'])

        # Test mixed case
        result_mixed = classify_product({'product_code': 'MaT-eBoOk-CS2'})
        self.assertTrue(result_mixed['is_ebook'])

    def test_classify_none_product_code(self):
        """Test handling of None product code."""
        result = classify_product({'product_code': None})

        # Should default to material
        self.assertFalse(result['is_ebook'])
        self.assertFalse(result['is_digital'])
        self.assertTrue(result['is_material'])
        self.assertFalse(result['is_live_tutorial'])
        self.assertFalse(result['is_marking'])
        self.assertEqual(result['product_type'], 'material')

    def test_classify_empty_product_code(self):
        """Test handling of empty product code."""
        result = classify_product({'product_code': ''})

        # Should default to material
        self.assertFalse(result['is_ebook'])
        self.assertFalse(result['is_digital'])
        self.assertTrue(result['is_material'])
        self.assertFalse(result['is_live_tutorial'])
        self.assertFalse(result['is_marking'])
        self.assertEqual(result['product_type'], 'material')

    def test_classify_missing_product_code_key(self):
        """Test handling when product_code key is missing."""
        result = classify_product({})

        # Should default to material
        self.assertFalse(result['is_ebook'])
        self.assertFalse(result['is_digital'])
        self.assertTrue(result['is_material'])
        self.assertFalse(result['is_live_tutorial'])
        self.assertFalse(result['is_marking'])
        self.assertEqual(result['product_type'], 'material')

    def test_classify_none_product(self):
        """Test handling of None product."""
        result = classify_product(None)

        # Should default to material
        self.assertFalse(result['is_ebook'])
        self.assertFalse(result['is_digital'])
        self.assertTrue(result['is_material'])
        self.assertFalse(result['is_live_tutorial'])
        self.assertFalse(result['is_marking'])
        self.assertEqual(result['product_type'], 'material')


class TestProductClassificationCompound(TestCase):
    """Test classification of products with compound/mixed types."""

    def test_classify_ebook_overrides_material(self):
        """Test eBook classification takes precedence over material."""
        # Even if product code contains both EBOOK and PRINT
        result = classify_product({'product_code': 'MAT-EBOOK-PRINT-BUNDLE'})

        # eBook flag should be true (digital product)
        self.assertTrue(result['is_ebook'])
        self.assertTrue(result['is_digital'])
        # Material could also be true for bundle
        self.assertEqual(result['product_type'], 'ebook')

    def test_classify_marking_with_material(self):
        """Test marking products that also include materials."""
        result = classify_product({'product_code': 'MARK-WITH-PRINT-GUIDE'})

        # Marking should be primary classification
        self.assertTrue(result['is_marking'])
        self.assertEqual(result['product_type'], 'marking')


class TestClassificationReturnStructure(TestCase):
    """Test the structure of the returned classification dictionary."""

    def test_classification_has_all_required_fields(self):
        """Test classification dictionary contains all required fields."""
        result = classify_product({'product_code': 'TEST-PRODUCT'})

        # Check all required fields exist
        required_fields = [
            'is_digital',
            'is_ebook',
            'is_material',
            'is_live_tutorial',
            'is_marking',
            'product_type'
        ]

        for field in required_fields:
            self.assertIn(field, result, f"Missing required field: {field}")

    def test_classification_boolean_fields_are_bool(self):
        """Test boolean classification fields return bool type."""
        result = classify_product({'product_code': 'MAT-EBOOK-CS2'})

        # Check boolean fields are actually bool type
        self.assertIsInstance(result['is_digital'], bool)
        self.assertIsInstance(result['is_ebook'], bool)
        self.assertIsInstance(result['is_material'], bool)
        self.assertIsInstance(result['is_live_tutorial'], bool)
        self.assertIsInstance(result['is_marking'], bool)

    def test_classification_product_type_is_string(self):
        """Test product_type field returns string."""
        result = classify_product({'product_code': 'MAT-EBOOK-CS2'})

        self.assertIsInstance(result['product_type'], str)
        self.assertIn(result['product_type'],
                     ['ebook', 'material', 'digital', 'live_tutorial', 'marking'])


def run_all_tests():
    """Run all product classifier tests."""
    import sys
    from django.test.runner import DiscoverRunner

    test_runner = DiscoverRunner(verbosity=2)
    failures = test_runner.run_tests(['vat.tests.test_product_classifier'])
    if failures:
        sys.exit(1)


if __name__ == '__main__':
    run_all_tests()