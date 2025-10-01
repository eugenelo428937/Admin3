"""
VAT Context Builder Tests (TDD RED Phase)

Epic 3: Dynamic VAT Calculation System
Phase 3: VAT Context Builder
Task: TASK-026 - Create Context Builder Tests

These tests will initially fail because the build_vat_context function doesn't exist yet.
This is intentional and follows TDD RED → GREEN → REFACTOR workflow.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal
from datetime import date
from cart.models import Cart, CartItem
from vat.context_builder import build_vat_context, build_item_context

User = get_user_model()


class TestContextBuilderFunctionExists(TestCase):
    """Test that context builder functions exist and are callable."""

    def test_build_vat_context_function_exists(self):
        """Test build_vat_context function can be imported and called."""
        self.assertTrue(callable(build_vat_context))

    def test_build_item_context_function_exists(self):
        """Test build_item_context function can be imported and called."""
        self.assertTrue(callable(build_item_context))


class TestVATContextStructure(TestCase):
    """Test the structure of the VAT context."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com'
        )
        self.cart = Cart.objects.create(user=self.user)

    def test_context_has_required_top_level_keys(self):
        """Test context has user, cart, and settings keys."""
        context = build_vat_context(self.user, self.cart)

        self.assertIn('user', context)
        self.assertIn('cart', context)
        self.assertIn('settings', context)

    def test_user_context_structure(self):
        """Test user portion of context has required fields."""
        context = build_vat_context(self.user, self.cart)
        user_context = context['user']

        self.assertIn('id', user_context)
        self.assertIn('region', user_context)
        self.assertIn('address', user_context)

        # Check types
        self.assertIsInstance(user_context['id'], int)
        # region can be None if no address
        self.assertTrue(user_context['region'] is None or isinstance(user_context['region'], str))
        self.assertIsInstance(user_context['address'], dict)

    def test_cart_context_structure(self):
        """Test cart portion of context has required fields."""
        context = build_vat_context(self.user, self.cart)
        cart_context = context['cart']

        self.assertIn('id', cart_context)
        self.assertIn('items', cart_context)
        self.assertIn('total_net', cart_context)

        # Check types
        self.assertIsInstance(cart_context['id'], int)
        self.assertIsInstance(cart_context['items'], list)
        self.assertIsInstance(cart_context['total_net'], Decimal)

    def test_settings_context_structure(self):
        """Test settings portion of context has required fields."""
        context = build_vat_context(self.user, self.cart)
        settings_context = context['settings']

        self.assertIn('effective_date', settings_context)
        self.assertIn('context_version', settings_context)

        # Check types
        self.assertIsInstance(settings_context['effective_date'], str)
        self.assertIsInstance(settings_context['context_version'], str)


class TestUserRegionExtraction(TestCase):
    """Test extraction of user region from address."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='regiontest',
            email='region@example.com'
        )
        self.cart = Cart.objects.create(user=self.user)

    def test_user_region_defaults_to_row(self):
        """Test user region defaults to ROW when no address."""
        # User has no profile/address - should return None (not ROW)
        context = build_vat_context(self.user, self.cart)

        self.assertIsNone(context['user']['region'])

    def test_user_region_from_uk_address(self):
        """Test UK region extracted from GB country code."""
        # Create user profile with UK address
        from userprofile.models import UserProfile, UserProfileAddress
        from country.models import Country

        Country.objects.get_or_create(iso_code='GB', defaults={'name': 'United Kingdom', 'phone_code': '+44'})
        profile, _ = UserProfile.objects.get_or_create(user=self.user)
        UserProfileAddress.objects.create(
            user_profile=profile,
            address_type='HOME',
            country='GB',
            address_data={'postcode': 'SW1A 1AA'}
        )

        context = build_vat_context(self.user, self.cart)
        self.assertEqual(context['user']['region'], 'UK')

    def test_user_region_from_ireland_address(self):
        """Test IE region extracted from IE country code."""
        from userprofile.models import UserProfile, UserProfileAddress
        from country.models import Country

        Country.objects.get_or_create(iso_code='IE', defaults={'name': 'Ireland', 'phone_code': '+353'})
        profile, _ = UserProfile.objects.get_or_create(user=self.user)
        UserProfileAddress.objects.create(
            user_profile=profile,
            address_type='HOME',
            country='IE',
            address_data={'postcode': 'D02 XY45'}
        )

        context = build_vat_context(self.user, self.cart)
        self.assertEqual(context['user']['region'], 'IE')

    def test_user_region_from_south_africa_address(self):
        """Test SA region extracted from ZA country code."""
        from userprofile.models import UserProfile, UserProfileAddress
        from country.models import Country

        Country.objects.get_or_create(iso_code='ZA', defaults={'name': 'South Africa', 'phone_code': '+27'})
        profile, _ = UserProfile.objects.get_or_create(user=self.user)
        UserProfileAddress.objects.create(
            user_profile=profile,
            address_type='HOME',
            country='ZA',
            address_data={'postcode': '8001'}
        )

        context = build_vat_context(self.user, self.cart)
        self.assertEqual(context['user']['region'], 'SA')

    def test_user_region_from_eu_country(self):
        """Test EU region extracted from EU country codes."""
        from userprofile.models import UserProfile, UserProfileAddress
        from country.models import Country

        Country.objects.get_or_create(iso_code='DE', defaults={'name': 'Germany', 'phone_code': '+49'})
        profile, _ = UserProfile.objects.get_or_create(user=self.user)
        UserProfileAddress.objects.create(
            user_profile=profile,
            address_type='HOME',
            country='DE',  # Germany
            address_data={'postcode': '10115'}
        )

        context = build_vat_context(self.user, self.cart)
        self.assertEqual(context['user']['region'], 'EU')

    def test_user_region_from_us_address(self):
        """Test ROW region for non-EU/UK countries."""
        from userprofile.models import UserProfile, UserProfileAddress
        from country.models import Country

        Country.objects.get_or_create(iso_code='US', defaults={'name': 'United States', 'phone_code': '+1'})
        profile, _ = UserProfile.objects.get_or_create(user=self.user)
        UserProfileAddress.objects.create(
            user_profile=profile,
            address_type='HOME',
            country='US',
            address_data={'postcode': '90210'}
        )

        context = build_vat_context(self.user, self.cart)
        self.assertEqual(context['user']['region'], 'ROW')


class TestCartItemsContext(TestCase):
    """Test building context for cart items."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='carttest',
            email='cart@example.com'
        )
        self.cart = Cart.objects.create(user=self.user)

    def test_empty_cart_returns_empty_items_list(self):
        """Test empty cart returns empty items list."""
        context = build_vat_context(self.user, self.cart)

        self.assertEqual(len(context['cart']['items']), 0)
        self.assertEqual(context['cart']['total_net'], Decimal('0.00'))

    def test_single_cart_item_context(self):
        """Test context for single cart item."""
        # Add to cart with metadata
        CartItem.objects.create(
            cart=self.cart,
            quantity=1,
            actual_price=Decimal('80.00'),
            item_type='fee',
            metadata={
                'product_code': 'MAT-EBOOK-CS2',
                'product_name': 'CS2 Study Materials (eBook)',
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

        context = build_vat_context(self.user, self.cart)

        # Check cart items
        self.assertEqual(len(context['cart']['items']), 1)

        item = context['cart']['items'][0]
        self.assertIn('item_id', item)
        self.assertIn('product_id', item)
        self.assertIn('product_code', item)
        self.assertIn('net_amount', item)
        self.assertIn('quantity', item)
        self.assertIn('classification', item)

        # Check values
        self.assertEqual(item['product_code'], 'MAT-EBOOK-CS2')
        self.assertEqual(item['net_amount'], '80.00')  # String format
        self.assertEqual(item['quantity'], 1)

        # Check classification
        self.assertTrue(item['classification']['is_ebook'])
        self.assertTrue(item['classification']['is_digital'])

    def test_multiple_cart_items_context(self):
        """Test context for multiple cart items."""
        # Add ebook to cart
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
                    'product_type': 'ebook'
                }
            }
        )

        # Add printed material to cart
        CartItem.objects.create(
            cart=self.cart,
            quantity=2,
            actual_price=Decimal('100.00'),
            item_type='fee',
            metadata={
                'product_code': 'MAT-PRINT-CM1',
                'product_name': 'CM1 Printed',
                'classification': {
                    'is_ebook': False,
                    'is_digital': False,
                    'is_material': True,
                    'product_type': 'material'
                }
            }
        )

        context = build_vat_context(self.user, self.cart)

        # Check cart items
        self.assertEqual(len(context['cart']['items']), 2)
        self.assertEqual(context['cart']['total_net'], Decimal('280.00'))

        # Check first item (ebook)
        ebook_item = next(i for i in context['cart']['items']
                         if 'EBOOK' in i['product_code'])
        self.assertEqual(ebook_item['net_amount'], '80.00')  # String format
        self.assertTrue(ebook_item['classification']['is_ebook'])

        # Check second item (printed)
        print_item = next(i for i in context['cart']['items']
                         if 'PRINT' in i['product_code'])
        self.assertEqual(print_item['net_amount'], '200.00')  # quantity=2
        self.assertTrue(print_item['classification']['is_material'])


class TestAnonymousUserContext(TestCase):
    """Test context building for anonymous users."""

    def test_anonymous_user_context(self):
        """Test context for anonymous user (no user object)."""
        cart = Cart.objects.create(user=None)

        context = build_vat_context(None, cart)

        # Check user context for anonymous
        self.assertIsNone(context['user']['id'])
        self.assertIsNone(context['user']['region'])  # No region for anonymous
        self.assertEqual(context['user']['address'], {})

        # Cart context should still work
        self.assertIsNotNone(context['cart']['id'])
        self.assertIsInstance(context['cart']['items'], list)


class TestPerItemContext(TestCase):
    """Test per-item context extraction."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='itemtest',
            email='item@example.com'
        )
        self.cart = Cart.objects.create(user=self.user)

    def test_build_item_context_structure(self):
        """Test per-item context has required structure."""
        # Create cart item with metadata
        cart_item = CartItem.objects.create(
            cart=self.cart,
            quantity=1,
            actual_price=Decimal('100.00'),
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

        # Check structure
        self.assertIn('item_id', context)
        self.assertIn('product_code', context)
        self.assertIn('net_amount', context)
        self.assertIn('classification', context)

        # Check values
        self.assertEqual(context['product_code'], 'MAT-EBOOK-CS2')
        self.assertEqual(context['net_amount'], '100.00')  # String format
        self.assertTrue(context['classification']['is_ebook'])


class TestContextMetadata(TestCase):
    """Test context metadata and versioning."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='metadata_test',
            email='meta@example.com'
        )
        self.cart = Cart.objects.create(user=self.user)

    def test_context_has_effective_date(self):
        """Test context includes current date as effective_date."""
        context = build_vat_context(self.user, self.cart)

        effective_date = context['settings']['effective_date']
        self.assertIsNotNone(effective_date)

        # Check it's today's date in YYYY-MM-DD format
        today = date.today().strftime('%Y-%m-%d')
        self.assertEqual(effective_date, today)

    def test_context_has_version(self):
        """Test context includes version number."""
        context = build_vat_context(self.user, self.cart)

        version = context['settings']['context_version']
        self.assertIsNotNone(version)
        self.assertEqual(version, '1.0')


def run_all_tests():
    """Run all context builder tests."""
    import sys
    from django.test.runner import DiscoverRunner

    test_runner = DiscoverRunner(verbosity=2)
    failures = test_runner.run_tests(['vat.tests.test_context_builder'])
    if failures:
        sys.exit(1)


if __name__ == '__main__':
    run_all_tests()