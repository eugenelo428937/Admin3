"""
Context Builder Integration Tests - Epic 3 Phase 3
TDD REFACTOR Phase: End-to-end tests for complete context building flow

Tests the complete integration of:
- Product classification
- Per-item context extraction
- Full VAT context assembly
- Edge cases across components
"""

from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from cart.models import Cart, CartItem
from products.models import Products, ProductVariations
from country.models import Country
from userprofile.models import UserProfile
from vat.context_builder import build_vat_context, build_item_context
from vat.product_classifier import classify_product

User = get_user_model()


class TestContextBuilderIntegration(TestCase):
    """Integration tests for full context building flow."""

    def setUp(self):
        """Create comprehensive test data."""
        # Create user with profile
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

        # Create UK country
        self.uk = Country.objects.create(
            code='GB',
            name='United Kingdom'
        )

        # Create user profile with UK address
        self.profile = UserProfile.objects.create(
            user=self.user,
            country=self.uk,
            postcode='SW1A 1AA'
        )

        # Create cart
        self.cart = Cart.objects.create(user_id=self.user.id)

    def test_complete_context_with_multiple_product_types(self):
        """Test complete context with diverse product types."""
        # Create products: ebook, material, marking, live tutorial
        ebook = Products.objects.create(
            product_name='CS2 eBook',
            product_code='MAT-EBOOK-CS2',
            price=Decimal('80.00')
        )

        material = Products.objects.create(
            product_name='CS2 Printed Material',
            product_code='MAT-PRINT-CS2',
            price=Decimal('100.00')
        )

        marking = Products.objects.create(
            product_name='CS2 Marking',
            product_code='MARK-CS2',
            price=Decimal('50.00')
        )

        tutorial = Products.objects.create(
            product_name='Live Tutorial',
            product_code='TUT-LIVE-CS2',
            price=Decimal('200.00')
        )

        # Add items to cart
        CartItem.objects.create(cart=self.cart, product=ebook, quantity=1, price=ebook.price)
        CartItem.objects.create(cart=self.cart, product=material, quantity=2, price=material.price)
        CartItem.objects.create(cart=self.cart, product=marking, quantity=1, price=marking.price)
        CartItem.objects.create(cart=self.cart, product=tutorial, quantity=1, price=tutorial.price)

        # Build context
        context = build_vat_context(self.user, self.cart)

        # Verify user context
        self.assertEqual(context['user']['id'], self.user.id)
        self.assertEqual(context['user']['region'], 'UK')
        self.assertEqual(context['user']['address']['country'], 'GB')
        self.assertEqual(context['user']['address']['postcode'], 'SW1A 1AA')

        # Verify cart context
        self.assertEqual(len(context['cart']['items']), 4)
        self.assertEqual(context['cart']['total_net'], Decimal('530.00'))  # 80 + 200 + 50 + 200

        # Verify classifications
        items = context['cart']['items']

        # Find each item by product code
        ebook_item = next(i for i in items if i['product_code'] == 'MAT-EBOOK-CS2')
        self.assertTrue(ebook_item['classification']['is_ebook'])
        self.assertTrue(ebook_item['classification']['is_digital'])

        material_item = next(i for i in items if i['product_code'] == 'MAT-PRINT-CS2')
        self.assertTrue(material_item['classification']['is_material'])

        marking_item = next(i for i in items if i['product_code'] == 'MARK-CS2')
        self.assertTrue(marking_item['classification']['is_marking'])

        tutorial_item = next(i for i in items if i['product_code'] == 'TUT-LIVE-CS2')
        self.assertTrue(tutorial_item['classification']['is_live_tutorial'])

    def test_context_with_product_variations(self):
        """Test context building with product variations."""
        # Create base product
        material = Products.objects.create(
            product_name='CS2 Material',
            product_code='MAT-BASE-CS2',
            price=Decimal('100.00')
        )

        # Create variations
        ebook_variation = ProductVariations.objects.create(
            product=material,
            product_code='MAT-EBOOK-CS2',
            price=Decimal('80.00')
        )

        print_variation = ProductVariations.objects.create(
            product=material,
            product_code='MAT-PRINT-CS2',
            price=Decimal('100.00')
        )

        # Add items with variations
        CartItem.objects.create(
            cart=self.cart,
            product=material,
            product_variation=ebook_variation,
            quantity=1,
            price=ebook_variation.price
        )

        CartItem.objects.create(
            cart=self.cart,
            product=material,
            product_variation=print_variation,
            quantity=2,
            price=print_variation.price
        )

        # Build context
        context = build_vat_context(self.user, self.cart)

        # Verify variations are classified correctly
        items = context['cart']['items']
        self.assertEqual(len(items), 2)

        # Verify ebook variation
        ebook_item = next(i for i in items if i['product_code'] == 'MAT-EBOOK-CS2')
        self.assertTrue(ebook_item['classification']['is_ebook'])
        self.assertEqual(ebook_item['net_amount'], Decimal('80.00'))

        # Verify print variation
        print_item = next(i for i in items if i['product_code'] == 'MAT-PRINT-CS2')
        self.assertTrue(print_item['classification']['is_material'])
        self.assertEqual(print_item['net_amount'], Decimal('200.00'))

    def test_context_with_anonymous_user(self):
        """Test context building with anonymous user."""
        # Create anonymous cart
        anon_cart = Cart.objects.create(user_id=None)

        # Add product
        product = Products.objects.create(
            product_name='Test Product',
            product_code='MAT-PRINT-CS2',
            price=Decimal('100.00')
        )

        CartItem.objects.create(
            cart=anon_cart,
            product=product,
            quantity=1,
            price=product.price
        )

        # Build context with None user
        context = build_vat_context(None, anon_cart)

        # Verify anonymous user context
        self.assertIsNone(context['user']['id'])
        self.assertIsNone(context['user']['region'])
        self.assertEqual(context['user']['address'], {})

        # Verify cart context still works
        self.assertEqual(len(context['cart']['items']), 1)
        self.assertEqual(context['cart']['total_net'], Decimal('100.00'))

    def test_context_with_empty_cart(self):
        """Test context building with empty cart."""
        context = build_vat_context(self.user, self.cart)

        # Verify empty cart
        self.assertEqual(len(context['cart']['items']), 0)
        self.assertEqual(context['cart']['total_net'], Decimal('0.00'))

        # User context should still be populated
        self.assertEqual(context['user']['id'], self.user.id)
        self.assertEqual(context['user']['region'], 'UK')


class TestContextBuilderRegionMapping(TestCase):
    """Integration tests for region mapping."""

    def setUp(self):
        """Create test users with different countries."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

    def test_uk_region_mapping(self):
        """Test UK country maps to UK region."""
        uk = Country.objects.create(code='GB', name='United Kingdom')
        UserProfile.objects.create(user=self.user, country=uk)
        cart = Cart.objects.create(user_id=self.user.id)

        context = build_vat_context(self.user, cart)
        self.assertEqual(context['user']['region'], 'UK')

    def test_eu_region_mapping(self):
        """Test EU country maps to EU region."""
        france = Country.objects.create(code='FR', name='France')
        UserProfile.objects.create(user=self.user, country=france)
        cart = Cart.objects.create(user_id=self.user.id)

        context = build_vat_context(self.user, cart)
        self.assertEqual(context['user']['region'], 'EU')

    def test_row_region_mapping(self):
        """Test non-UK/non-EU country maps to ROW region."""
        australia = Country.objects.create(code='AU', name='Australia')
        UserProfile.objects.create(user=self.user, country=australia)
        cart = Cart.objects.create(user_id=self.user.id)

        context = build_vat_context(self.user, cart)
        self.assertEqual(context['user']['region'], 'ROW')

    def test_user_without_profile(self):
        """Test user without profile has None region."""
        cart = Cart.objects.create(user_id=self.user.id)

        context = build_vat_context(self.user, cart)
        self.assertIsNone(context['user']['region'])
        self.assertEqual(context['user']['address'], {})


class TestContextBuilderNetAmountCalculations(TestCase):
    """Integration tests for net amount calculations."""

    def setUp(self):
        """Create test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.cart = Cart.objects.create(user_id=self.user.id)

    def test_total_net_aggregation(self):
        """Test total_net aggregates all item net_amounts."""
        product1 = Products.objects.create(
            product_name='Product 1',
            product_code='MAT-PRINT-1',
            price=Decimal('50.00')
        )

        product2 = Products.objects.create(
            product_name='Product 2',
            product_code='MAT-EBOOK-2',
            price=Decimal('75.50')
        )

        product3 = Products.objects.create(
            product_name='Product 3',
            product_code='MARK-3',
            price=Decimal('25.25')
        )

        CartItem.objects.create(cart=self.cart, product=product1, quantity=2, price=product1.price)
        CartItem.objects.create(cart=self.cart, product=product2, quantity=1, price=product2.price)
        CartItem.objects.create(cart=self.cart, product=product3, quantity=3, price=product3.price)

        context = build_vat_context(self.user, self.cart)

        # Verify individual amounts
        items = context['cart']['items']
        self.assertEqual(items[0]['net_amount'], Decimal('100.00'))  # 50 * 2
        self.assertEqual(items[1]['net_amount'], Decimal('75.50'))   # 75.50 * 1
        self.assertEqual(items[2]['net_amount'], Decimal('75.75'))   # 25.25 * 3

        # Verify total
        expected_total = Decimal('100.00') + Decimal('75.50') + Decimal('75.75')
        self.assertEqual(context['cart']['total_net'], expected_total)

    def test_decimal_precision_preserved(self):
        """Test decimal precision is preserved throughout calculations."""
        product = Products.objects.create(
            product_name='Decimal Product',
            product_code='MAT-PRINT',
            price=Decimal('33.33')
        )

        CartItem.objects.create(cart=self.cart, product=product, quantity=3, price=product.price)

        context = build_vat_context(self.user, self.cart)

        # 33.33 * 3 = 99.99
        self.assertEqual(context['cart']['items'][0]['net_amount'], Decimal('99.99'))
        self.assertEqual(context['cart']['total_net'], Decimal('99.99'))


class TestContextBuilderMetadata(TestCase):
    """Integration tests for context metadata."""

    def setUp(self):
        """Create test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.cart = Cart.objects.create(user_id=self.user.id)

    def test_settings_section_present(self):
        """Test settings section is present in context."""
        context = build_vat_context(self.user, self.cart)

        self.assertIn('settings', context)
        self.assertIn('effective_date', context['settings'])
        self.assertIn('context_version', context['settings'])

    def test_context_version(self):
        """Test context version is correct."""
        context = build_vat_context(self.user, self.cart)

        self.assertEqual(context['settings']['context_version'], '1.0')

    def test_effective_date_format(self):
        """Test effective_date is in ISO format."""
        context = build_vat_context(self.user, self.cart)

        # Should be ISO date format YYYY-MM-DD
        effective_date = context['settings']['effective_date']
        self.assertRegex(effective_date, r'^\d{4}-\d{2}-\d{2}$')
