"""
Per-Item Context Builder Tests - Epic 3 Phase 3
TDD RED Phase: Tests for individual cart item context extraction

Tests edge cases and validation for build_item_context function.
"""

from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from cart.models import Cart, CartItem
from products.models import Products, ProductVariations
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
        self.cart = Cart.objects.create(user_id=self.user.id)

        # Create product
        self.product = Products.objects.create(
            product_name='Test Product',
            product_code='MAT-PRINT-CS2',
            price=Decimal('100.00')
        )

        self.cart_item = CartItem.objects.create(
            cart=self.cart,
            product=self.product,
            quantity=2,
            price=Decimal('100.00')
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
        self.cart = Cart.objects.create(user_id=self.user.id)

    def test_net_amount_calculation_single_quantity(self):
        """Test net amount calculation with quantity 1."""
        product = Products.objects.create(
            product_name='Test Product',
            product_code='MAT-PRINT-CS2',
            price=Decimal('100.00')
        )

        cart_item = CartItem.objects.create(
            cart=self.cart,
            product=product,
            quantity=1,
            price=Decimal('100.00')
        )

        context = build_item_context(cart_item)
        self.assertEqual(context['net_amount'], Decimal('100.00'))
        self.assertEqual(context['quantity'], 1)

    def test_net_amount_calculation_multiple_quantity(self):
        """Test net amount calculation with quantity > 1."""
        product = Products.objects.create(
            product_name='Test Product',
            product_code='MAT-PRINT-CS2',
            price=Decimal('50.00')
        )

        cart_item = CartItem.objects.create(
            cart=self.cart,
            product=product,
            quantity=3,
            price=Decimal('50.00')
        )

        context = build_item_context(cart_item)
        self.assertEqual(context['net_amount'], Decimal('150.00'))
        self.assertEqual(context['quantity'], 3)

    def test_net_amount_calculation_with_decimals(self):
        """Test net amount calculation with decimal prices."""
        product = Products.objects.create(
            product_name='Test Product',
            product_code='MAT-EBOOK-CS2',
            price=Decimal('33.33')
        )

        cart_item = CartItem.objects.create(
            cart=self.cart,
            product=product,
            quantity=2,
            price=Decimal('33.33')
        )

        context = build_item_context(cart_item)
        # 33.33 * 2 = 66.66
        self.assertEqual(context['net_amount'], Decimal('66.66'))

    def test_net_amount_rounding(self):
        """Test net amount is properly rounded to 2 decimals."""
        product = Products.objects.create(
            product_name='Test Product',
            product_code='MAT-PRINT-CS2',
            price=Decimal('10.005')  # Should round to 10.01
        )

        cart_item = CartItem.objects.create(
            cart=self.cart,
            product=product,
            quantity=1,
            price=Decimal('10.005')
        )

        context = build_item_context(cart_item)
        # Verify 2 decimal places
        self.assertEqual(context['net_amount'].as_tuple().exponent, -2)


class TestPerItemContextProductVariations(TestCase):
    """Test per-item context with product variations."""

    def setUp(self):
        """Create test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.cart = Cart.objects.create(user_id=self.user.id)

        self.product = Products.objects.create(
            product_name='Test Material',
            product_code='MAT-BASE',
            price=Decimal('100.00')
        )

    def test_item_context_prefers_variation_code(self):
        """Test item context uses variation code over product code."""
        variation = ProductVariations.objects.create(
            product=self.product,
            product_code='MAT-EBOOK-CS2',
            price=Decimal('80.00')
        )

        cart_item = CartItem.objects.create(
            cart=self.cart,
            product=self.product,
            product_variation=variation,
            quantity=1,
            price=Decimal('80.00')
        )

        context = build_item_context(cart_item)

        # Should use variation code, not product code
        self.assertEqual(context['product_code'], 'MAT-EBOOK-CS2')
        self.assertEqual(context['product_id'], variation.id)

        # Classification should be based on variation code (ebook)
        self.assertTrue(context['classification']['is_ebook'])
        self.assertFalse(context['classification']['is_material'])

    def test_item_context_falls_back_to_product_code(self):
        """Test item context uses product code when no variation."""
        cart_item = CartItem.objects.create(
            cart=self.cart,
            product=self.product,
            quantity=1,
            price=Decimal('100.00')
        )

        context = build_item_context(cart_item)

        # Should use product code
        self.assertEqual(context['product_code'], 'MAT-BASE')
        self.assertEqual(context['product_id'], self.product.id)


class TestPerItemContextEdgeCases(TestCase):
    """Test per-item context edge cases."""

    def setUp(self):
        """Create test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.cart = Cart.objects.create(user_id=self.user.id)

    def test_item_context_with_zero_price(self):
        """Test item context with zero price."""
        product = Products.objects.create(
            product_name='Free Product',
            product_code='MAT-FREE',
            price=Decimal('0.00')
        )

        cart_item = CartItem.objects.create(
            cart=self.cart,
            product=product,
            quantity=1,
            price=Decimal('0.00')
        )

        context = build_item_context(cart_item)
        self.assertEqual(context['net_amount'], Decimal('0.00'))
        self.assertEqual(context['price'], Decimal('0.00'))

    def test_item_context_with_missing_product_code(self):
        """Test item context when product has no product_code."""
        product = Products.objects.create(
            product_name='Product Without Code',
            product_code=None,  # No product code
            price=Decimal('50.00')
        )

        cart_item = CartItem.objects.create(
            cart=self.cart,
            product=product,
            quantity=1,
            price=Decimal('50.00')
        )

        context = build_item_context(cart_item)

        # Should have None product_code
        self.assertIsNone(context['product_code'])

        # Classification should default to material
        self.assertTrue(context['classification']['is_material'])
        self.assertEqual(context['classification']['product_type'], 'material')

    def test_item_context_with_empty_product_code(self):
        """Test item context when product has empty product_code."""
        product = Products.objects.create(
            product_name='Product With Empty Code',
            product_code='',  # Empty string
            price=Decimal('50.00')
        )

        cart_item = CartItem.objects.create(
            cart=self.cart,
            product=product,
            quantity=1,
            price=Decimal('50.00')
        )

        context = build_item_context(cart_item)

        # Should have empty product_code
        self.assertEqual(context['product_code'], '')

        # Classification should default to material
        self.assertTrue(context['classification']['is_material'])


class TestPerItemContextDataTypes(TestCase):
    """Test per-item context data types."""

    def setUp(self):
        """Create test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.cart = Cart.objects.create(user_id=self.user.id)

        self.product = Products.objects.create(
            product_name='Test Product',
            product_code='MAT-PRINT-CS2',
            price=Decimal('100.00')
        )

        self.cart_item = CartItem.objects.create(
            cart=self.cart,
            product=self.product,
            quantity=2,
            price=Decimal('100.00')
        )

    def test_item_id_is_integer(self):
        """Test item_id is an integer."""
        context = build_item_context(self.cart_item)
        self.assertIsInstance(context['item_id'], int)

    def test_product_id_is_integer(self):
        """Test product_id is an integer."""
        context = build_item_context(self.cart_item)
        self.assertIsInstance(context['product_id'], int)

    def test_quantity_is_integer(self):
        """Test quantity is an integer."""
        context = build_item_context(self.cart_item)
        self.assertIsInstance(context['quantity'], int)

    def test_net_amount_is_decimal(self):
        """Test net_amount is a Decimal."""
        context = build_item_context(self.cart_item)
        self.assertIsInstance(context['net_amount'], Decimal)

    def test_classification_is_dict(self):
        """Test classification is a dictionary."""
        context = build_item_context(self.cart_item)
        self.assertIsInstance(context['classification'], dict)
