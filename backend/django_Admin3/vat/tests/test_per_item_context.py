"""
Per-Item Context Builder Tests - Epic 3 Phase 3
TDD RED Phase: Tests for individual cart item context extraction

Tests edge cases and validation for build_item_context function.
Updated to use actual CartItem schema with actual_price and metadata fields.
"""

from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from cart.models import Cart, CartItem
from vat.context_builder import build_item_context

User = get_user_model()


class TestPerItemContextFunction(TestCase):
    """Test per-item context builder function exists."""

    def test_build_item_context_function_exists(self):
        """Test build_item_context function is importable."""
        from vat.context_builder import build_item_context
        self.assertTrue(callable(build_item_context))


class TestPerItemContextStructure(TestCase):
    """Test per-item context structure."""

    def setUp(self):
        """Create test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.cart = Cart.objects.create(user=self.user)

        # Create cart item with metadata
        self.cart_item = CartItem.objects.create(
            cart=self.cart,
            quantity=2,
            actual_price=Decimal('100.00'),
            item_type='fee',
            metadata={
                'product_code': 'MAT-PRINT-CS2',
                'classification': {
                    'is_material': True,
                    'is_digital': False,
                    'is_ebook': False,
                    'is_live_tutorial': False,
                    'is_marking': False,
                    'product_type': 'material'
                }
            }
        )

    def test_item_context_has_required_fields(self):
        """Test item context has all required fields."""
        context = build_item_context(self.cart_item)

        self.assertIn('item_id', context)
        self.assertIn('product_id', context)
        self.assertIn('product_code', context)
        self.assertIn('net_amount', context)
        self.assertIn('quantity', context)
        self.assertIn('classification', context)

    def test_item_context_includes_classification(self):
        """Test item context includes product classification."""
        context = build_item_context(self.cart_item)

        classification = context['classification']
        self.assertIn('is_digital', classification)
        self.assertIn('is_ebook', classification)
        self.assertIn('is_material', classification)
        self.assertIn('is_live_tutorial', classification)
        self.assertIn('is_marking', classification)
        self.assertIn('product_type', classification)


class TestPerItemContextCalculations(TestCase):
    """Test per-item context calculations."""

    def setUp(self):
        """Create test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.cart = Cart.objects.create(user=self.user)

    def test_net_amount_calculation_single_quantity(self):
        """Test net amount calculation with quantity 1."""
        cart_item = CartItem.objects.create(
            cart=self.cart,
            quantity=1,
            actual_price=Decimal('100.00'),
            item_type='fee',
            metadata={'product_code': 'MAT-PRINT-CS2'}
        )

        context = build_item_context(cart_item)

        self.assertEqual(context['net_amount'], '100.00')
        self.assertEqual(context['quantity'], 1)

    def test_net_amount_calculation_multiple_quantity(self):
        """Test net amount calculation with quantity > 1."""
        cart_item = CartItem.objects.create(
            cart=self.cart,
            quantity=3,
            actual_price=Decimal('50.00'),
            item_type='fee',
            metadata={'product_code': 'MAT-EBOOK-CS2'}
        )

        context = build_item_context(cart_item)

        # 50.00 * 3 = 150.00
        self.assertEqual(context['net_amount'], '150.00')
        self.assertEqual(context['quantity'], 3)

    def test_net_amount_calculation_with_decimals(self):
        """Test net amount calculation with decimal prices."""
        cart_item = CartItem.objects.create(
            cart=self.cart,
            quantity=2,
            actual_price=Decimal('75.50'),
            item_type='fee',
            metadata={'product_code': 'MARK-CS2'}
        )

        context = build_item_context(cart_item)

        # 75.50 * 2 = 151.00
        self.assertEqual(context['net_amount'], '151.00')

    def test_net_amount_rounding(self):
        """Test net amount is properly rounded to 2 decimals."""
        cart_item = CartItem.objects.create(
            cart=self.cart,
            quantity=3,
            actual_price=Decimal('33.33'),
            item_type='fee',
            metadata={'product_code': 'MAT-PRINT'}
        )

        context = build_item_context(cart_item)

        # 33.33 * 3 = 99.99
        self.assertEqual(context['net_amount'], '99.99')


class TestPerItemContextDataTypes(TestCase):
    """Test per-item context data types."""

    def setUp(self):
        """Create test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.cart = Cart.objects.create(user=self.user)

        self.cart_item = CartItem.objects.create(
            cart=self.cart,
            quantity=1,
            actual_price=Decimal('100.00'),
            item_type='fee',
            metadata={
                'product_code': 'MAT-PRINT-CS2',
                'classification': {
                    'is_material': True,
                    'product_type': 'material'
                }
            }
        )

    def test_item_id_is_integer(self):
        """Test item_id is an integer."""
        context = build_item_context(self.cart_item)

        self.assertIsInstance(context['item_id'], int)

    def test_product_id_is_integer(self):
        """Test product_id is an integer."""
        context = build_item_context(self.cart_item)

        # product_id can be None if no product FK
        self.assertTrue(
            context['product_id'] is None or isinstance(context['product_id'], int)
        )

    def test_net_amount_is_decimal(self):
        """Test net_amount is a Decimal."""
        context = build_item_context(self.cart_item)

        # net_amount is now a string per VAT schema
        self.assertIsInstance(context['net_amount'], str)
        # Should be parseable as Decimal
        Decimal(context['net_amount'])

    def test_quantity_is_integer(self):
        """Test quantity is an integer."""
        context = build_item_context(self.cart_item)

        self.assertIsInstance(context['quantity'], int)

    def test_classification_is_dict(self):
        """Test classification is a dictionary."""
        context = build_item_context(self.cart_item)

        self.assertIsInstance(context['classification'], dict)


class TestPerItemContextEdgeCases(TestCase):
    """Test per-item context edge cases."""

    def setUp(self):
        """Create test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.cart = Cart.objects.create(user=self.user)

    def test_item_context_with_zero_price(self):
        """Test item context with zero price."""
        cart_item = CartItem.objects.create(
            cart=self.cart,
            quantity=1,
            actual_price=Decimal('0.00'),
            item_type='fee',
            metadata={'product_code': 'FREE-ITEM'}
        )

        context = build_item_context(cart_item)

        self.assertEqual(context['net_amount'], '0.00')
        self.assertEqual(context['product_code'], 'FREE-ITEM')

    def test_item_context_with_missing_product_code(self):
        """Test item context when product has no product_code."""
        cart_item = CartItem.objects.create(
            cart=self.cart,
            quantity=1,
            actual_price=Decimal('100.00'),
            item_type='fee',
            metadata={}  # No product_code
        )

        context = build_item_context(cart_item)

        # Should have None product_code
        self.assertIsNone(context['product_code'])
        # Should still have classification
        self.assertIn('classification', context)

    def test_item_context_with_empty_product_code(self):
        """Test item context when product has empty product_code."""
        cart_item = CartItem.objects.create(
            cart=self.cart,
            quantity=1,
            actual_price=Decimal('100.00'),
            item_type='fee',
            metadata={'product_code': ''}  # Empty string
        )

        context = build_item_context(cart_item)

        # Should have empty product_code
        self.assertEqual(context['product_code'], '')
        # Should still classify
        self.assertIn('classification', context)


class TestPerItemContextProductVariations(TestCase):
    """Test per-item context with product variations."""

    def setUp(self):
        """Create test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.cart = Cart.objects.create(user=self.user)

    def test_item_context_falls_back_to_product_code(self):
        """Test item context falls back to product code if no variation."""
        # Create item with classification in metadata
        cart_item = CartItem.objects.create(
            cart=self.cart,
            quantity=1,
            actual_price=Decimal('100.00'),
            item_type='fee',
            metadata={
                'product_code': 'MAT-PRINT-CS2',
                'classification': {
                    'is_material': True,
                    'product_type': 'material'
                }
            }
        )

        context = build_item_context(cart_item)

        self.assertEqual(context['product_code'], 'MAT-PRINT-CS2')
        self.assertTrue(context['classification']['is_material'])

    def test_item_context_prefers_metadata_classification(self):
        """Test item context prefers metadata classification over inference."""
        # Provide explicit classification in metadata
        cart_item = CartItem.objects.create(
            cart=self.cart,
            quantity=1,
            actual_price=Decimal('80.00'),
            item_type='fee',
            metadata={
                'product_code': 'MAT-EBOOK-CS2',
                'classification': {
                    'is_ebook': True,
                    'is_digital': True,
                    'is_material': False,
                    'is_live_tutorial': False,
                    'is_marking': False,
                    'product_type': 'ebook'
                }
            }
        )

        context = build_item_context(cart_item)

        # Should use metadata classification
        self.assertTrue(context['classification']['is_ebook'])
        self.assertTrue(context['classification']['is_digital'])
        self.assertFalse(context['classification']['is_material'])


class TestPerItemContextClassification(TestCase):
    """Test per-item context classification."""

    def setUp(self):
        """Create test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.cart = Cart.objects.create(user=self.user)

    def test_ebook_classification(self):
        """Test eBook product classification."""
        cart_item = CartItem.objects.create(
            cart=self.cart,
            quantity=1,
            actual_price=Decimal('80.00'),
            item_type='fee',
            metadata={
                'product_code': 'MAT-EBOOK-CS2',
                'classification': {
                    'is_ebook': True,
                    'is_digital': True,
                    'product_type': 'ebook'
                }
            }
        )

        context = build_item_context(cart_item)

        self.assertTrue(context['classification']['is_ebook'])
        self.assertTrue(context['classification']['is_digital'])
        self.assertEqual(context['classification']['product_type'], 'ebook')

    def test_material_classification(self):
        """Test material product classification."""
        cart_item = CartItem.objects.create(
            cart=self.cart,
            quantity=1,
            actual_price=Decimal('100.00'),
            item_type='fee',
            metadata={
                'product_code': 'MAT-PRINT-CS2',
                'classification': {
                    'is_material': True,
                    'product_type': 'material'
                }
            }
        )

        context = build_item_context(cart_item)

        self.assertTrue(context['classification']['is_material'])
        self.assertEqual(context['classification']['product_type'], 'material')

    def test_marking_classification(self):
        """Test marking product classification."""
        cart_item = CartItem.objects.create(
            cart=self.cart,
            quantity=1,
            actual_price=Decimal('50.00'),
            item_type='fee',
            metadata={
                'product_code': 'MARK-CS2',
                'classification': {
                    'is_marking': True,
                    'product_type': 'marking'
                }
            }
        )

        context = build_item_context(cart_item)

        self.assertTrue(context['classification']['is_marking'])
        self.assertEqual(context['classification']['product_type'], 'marking')

    def test_tutorial_classification(self):
        """Test tutorial product classification."""
        cart_item = CartItem.objects.create(
            cart=self.cart,
            quantity=1,
            actual_price=Decimal('200.00'),
            item_type='fee',
            metadata={
                'product_code': 'TUT-LIVE-CS2',
                'classification': {
                    'is_live_tutorial': True,
                    'product_type': 'live_tutorial'
                }
            }
        )

        context = build_item_context(cart_item)

        self.assertTrue(context['classification']['is_live_tutorial'])
        self.assertEqual(context['classification']['product_type'], 'live_tutorial')
