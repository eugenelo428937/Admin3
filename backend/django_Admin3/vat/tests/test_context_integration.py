"""
Context Builder Integration Tests - Epic 3 Phase 3
TDD REFACTOR Phase: End-to-end tests for complete context building flow

Tests the complete integration of:
- Product classification
- Per-item context extraction
- Full VAT context assembly
- Edge cases across components

Updated to use actual CartItem schema with actual_price and metadata fields.
"""

from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from cart.models import Cart, CartItem
from country.models import Country
from userprofile.models import UserProfile, UserProfileAddress
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

        # Create UK country (use iso_code not code)
        self.uk = Country.objects.create(
            iso_code='GB',
            name='United Kingdom',
            phone_code='+44'
        )

        # Create user profile with UK HOME address
        self.profile, _ = UserProfile.objects.get_or_create(user=self.user)
        # Clear any existing addresses and create fresh HOME address
        UserProfileAddress.objects.filter(user_profile=self.profile).delete()
        UserProfileAddress.objects.create(
            user_profile=self.profile,
            address_type='HOME',
            country='GB',
            address_data={'postcode': 'SW1A 1AA'}
        )

        # Create cart
        self.cart = Cart.objects.create(user=self.user)

    def test_complete_context_with_multiple_product_types(self):
        """Test complete context with diverse product types."""
        # Create cart items with actual_price and metadata (no Product FK needed)

        # eBook item
        CartItem.objects.create(
            cart=self.cart,
            quantity=1,
            actual_price=Decimal('80.00'),
            item_type='fee',
            metadata={
                'product_code': 'MAT-EBOOK-CS2',
                'product_name': 'CS2 eBook',
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

        # Material item (2x quantity)
        CartItem.objects.create(
            cart=self.cart,
            quantity=2,
            actual_price=Decimal('100.00'),
            item_type='fee',
            metadata={
                'product_code': 'MAT-PRINT-CS2',
                'product_name': 'CS2 Printed Material',
                'classification': {
                    'is_ebook': False,
                    'is_digital': False,
                    'is_material': True,
                    'is_live_tutorial': False,
                    'is_marking': False,
                    'product_type': 'material'
                }
            }
        )

        # Marking item
        CartItem.objects.create(
            cart=self.cart,
            quantity=1,
            actual_price=Decimal('50.00'),
            item_type='fee',
            metadata={
                'product_code': 'MARK-CS2',
                'product_name': 'CS2 Marking',
                'classification': {
                    'is_ebook': False,
                    'is_digital': False,
                    'is_material': False,
                    'is_live_tutorial': False,
                    'is_marking': True,
                    'product_type': 'marking'
                }
            }
        )

        # Tutorial item
        CartItem.objects.create(
            cart=self.cart,
            quantity=1,
            actual_price=Decimal('200.00'),
            item_type='fee',
            metadata={
                'product_code': 'TUT-LIVE-CS2',
                'product_name': 'Live Tutorial',
                'classification': {
                    'is_ebook': False,
                    'is_digital': False,
                    'is_material': False,
                    'is_live_tutorial': True,
                    'is_marking': False,
                    'product_type': 'live_tutorial'
                }
            }
        )

        # Build context
        context = build_vat_context(self.user, self.cart)

        # Verify user context
        self.assertEqual(context['user']['id'], self.user.id)
        self.assertEqual(context['user']['region'], 'UK')
        self.assertEqual(context['user']['address']['country'], 'GB')
        self.assertEqual(context['user']['address']['postcode'], 'SW1A 1AA')

        # Verify cart context
        self.assertEqual(len(context['cart']['items']), 4)
        # 80 + (100*2) + 50 + 200 = 530
        self.assertEqual(context['cart']['total_net'], Decimal('530.00'))

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
        # Create cart items with different product codes (simulating variations)

        CartItem.objects.create(
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
                    'product_type': 'ebook'
                }
            }
        )

        CartItem.objects.create(
            cart=self.cart,
            quantity=2,
            actual_price=Decimal('100.00'),
            item_type='fee',
            metadata={
                'product_code': 'MAT-PRINT-CS2',
                'classification': {
                    'is_ebook': False,
                    'is_digital': False,
                    'is_material': True,
                    'product_type': 'material'
                }
            }
        )

        # Build context
        context = build_vat_context(self.user, self.cart)

        # Verify variations are classified correctly
        items = context['cart']['items']
        self.assertEqual(len(items), 2)

        # Verify ebook variation
        ebook_item = next(i for i in items if i['product_code'] == 'MAT-EBOOK-CS2')
        self.assertTrue(ebook_item['classification']['is_ebook'])
        self.assertEqual(ebook_item['net_amount'], '80.00')  # String format

        # Verify print variation (2x quantity)
        print_item = next(i for i in items if i['product_code'] == 'MAT-PRINT-CS2')
        self.assertTrue(print_item['classification']['is_material'])
        self.assertEqual(print_item['net_amount'], '200.00')  # 100 * 2

    def test_context_with_anonymous_user(self):
        """Test context building with anonymous user."""
        # Create anonymous cart
        anon_cart = Cart.objects.create(user=None)

        # Add product
        CartItem.objects.create(
            cart=anon_cart,
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
        uk = Country.objects.create(iso_code='GB', name='United Kingdom', phone_code='+44')
        profile, _ = UserProfile.objects.get_or_create(user=self.user)
        UserProfileAddress.objects.create(
            user_profile=profile,
            address_type='HOME',
            country='GB',
            address_data={'postcode': 'SW1A 1AA'}
        )
        cart = Cart.objects.create(user=self.user)

        context = build_vat_context(self.user, cart)
        self.assertEqual(context['user']['region'], 'UK')

    def test_eu_region_mapping(self):
        """Test EU country maps to EU region."""
        france = Country.objects.create(iso_code='FR', name='France', phone_code='+33')
        profile, _ = UserProfile.objects.get_or_create(user=self.user)
        # Clear any existing HOME addresses first
        UserProfileAddress.objects.filter(user_profile=profile, address_type='HOME').delete()
        UserProfileAddress.objects.create(
            user_profile=profile,
            address_type='HOME',
            country='FR',
            address_data={'postcode': '75001'}
        )
        cart = Cart.objects.create(user=self.user)

        context = build_vat_context(self.user, cart)
        self.assertEqual(context['user']['region'], 'EU')

    def test_row_region_mapping(self):
        """Test non-UK/non-EU country maps to ROW region."""
        australia = Country.objects.create(iso_code='AU', name='Australia', phone_code='+61')
        profile, _ = UserProfile.objects.get_or_create(user=self.user)
        # Clear any existing HOME addresses first
        UserProfileAddress.objects.filter(user_profile=profile, address_type='HOME').delete()
        UserProfileAddress.objects.create(
            user_profile=profile,
            address_type='HOME',
            country='AU',
            address_data={'postcode': '2000'}
        )
        cart = Cart.objects.create(user=self.user)

        context = build_vat_context(self.user, cart)
        self.assertEqual(context['user']['region'], 'ROW')

    def test_user_without_profile(self):
        """Test user without profile has None region."""
        cart = Cart.objects.create(user=self.user)

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
        self.cart = Cart.objects.create(user=self.user)

    def test_total_net_aggregation(self):
        """Test total_net aggregates all item net_amounts."""
        CartItem.objects.create(
            cart=self.cart,
            quantity=2,
            actual_price=Decimal('50.00'),
            item_type='fee',
            metadata={'product_code': 'MAT-PRINT-1'}
        )

        CartItem.objects.create(
            cart=self.cart,
            quantity=1,
            actual_price=Decimal('75.50'),
            item_type='fee',
            metadata={'product_code': 'MAT-EBOOK-2'}
        )

        CartItem.objects.create(
            cart=self.cart,
            quantity=3,
            actual_price=Decimal('25.25'),
            item_type='fee',
            metadata={'product_code': 'MARK-3'}
        )

        context = build_vat_context(self.user, self.cart)

        # Verify individual amounts (as strings)
        items = context['cart']['items']
        self.assertEqual(items[0]['net_amount'], '100.00')  # 50 * 2
        self.assertEqual(items[1]['net_amount'], '75.50')   # 75.50 * 1
        self.assertEqual(items[2]['net_amount'], '75.75')   # 25.25 * 3

        # Verify total (as Decimal for total_net)
        expected_total = Decimal('100.00') + Decimal('75.50') + Decimal('75.75')
        self.assertEqual(context['cart']['total_net'], expected_total)

    def test_decimal_precision_preserved(self):
        """Test decimal precision is preserved throughout calculations."""
        CartItem.objects.create(
            cart=self.cart,
            quantity=3,
            actual_price=Decimal('33.33'),
            item_type='fee',
            metadata={'product_code': 'MAT-PRINT'}
        )

        context = build_vat_context(self.user, self.cart)

        # 33.33 * 3 = 99.99
        self.assertEqual(context['cart']['items'][0]['net_amount'], '99.99')
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
        self.cart = Cart.objects.create(user=self.user)

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
