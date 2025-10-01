"""
VAT Integration Tests - Epic 3 Phase 6
Test Matrix Stage 3: Integration tests for master VAT rule orchestration

Tests the full VAT calculation flow through master rule:
- calculate_vat_master orchestration
- determine_vat_region + calculate_vat_per_item integration
- Cart-level VAT totals
- Multiple items with mixed VAT rates
- End-to-end context flow

Test IDs: IT01-IT10+
"""

import pytest
from decimal import Decimal
from django.test import TestCase
from rules_engine.services.rule_engine import RuleEngine


@pytest.mark.django_db
class TestMasterVATOrchestration:
    """Test calculate_vat_master rule orchestration."""

    def test_it01_uk_cart_mixed_vat_rates(self, uk_cart_mixed, build_vat_context):
        """IT01: UK cart with ebook (0%) + material (20%) calculates correctly."""
        context = build_vat_context(uk_cart_mixed)

        engine = RuleEngine()
        result = engine.execute('checkout_start', context)

        assert result['ok'] is True
        assert 'cart' in result
        assert 'total_vat' in result['cart']
        assert 'vat_result' in result['cart']

        # Cart should have 2 items with different VAT rates
        vat_result = result['cart']['vat_result']
        assert len(vat_result['items']) == 2

        # Item 1: ebook £50.00 @ 0% = £0.00 VAT
        item1 = vat_result['items'][0]
        assert item1['vat_rate'] == Decimal('0.00')
        assert item1['vat_amount'] == Decimal('0.00')

        # Item 2: material £100.00 @ 20% = £20.00 VAT
        item2 = vat_result['items'][1]
        assert item2['vat_rate'] == Decimal('0.20')
        assert item2['vat_amount'] == Decimal('20.00')

        # Total VAT: £0.00 + £20.00 = £20.00
        assert result['cart']['total_vat'] == Decimal('20.00')

    def test_it02_row_cart_all_zero_vat(self, row_cart_digital, build_vat_context):
        """IT02: ROW cart with digital products has 0% VAT total."""
        context = build_vat_context(row_cart_digital)

        engine = RuleEngine()
        result = engine.execute('checkout_start', context)

        assert result['ok'] is True
        assert result['cart']['total_vat'] == Decimal('0.00')

        # All items should have 0% VAT
        vat_result = result['cart']['vat_result']
        for item in vat_result['items']:
            assert item['vat_rate'] == Decimal('0.00')
            assert item['vat_amount'] == Decimal('0.00')

    def test_it03_sa_cart_all_15_percent(self, sa_cart_mixed, build_vat_context):
        """IT03: SA cart with tutorial + material all have 15% VAT."""
        context = build_vat_context(sa_cart_mixed)

        engine = RuleEngine()
        result = engine.execute('checkout_start', context)

        assert result['ok'] is True

        vat_result = result['cart']['vat_result']
        assert len(vat_result['items']) == 2

        # Item 1: tutorial £200.00 @ 15% = £30.00 VAT
        item1 = vat_result['items'][0]
        assert item1['vat_rate'] == Decimal('0.15')
        assert item1['vat_amount'] == Decimal('30.00')

        # Item 2: material £100.00 @ 15% = £15.00 VAT
        item2 = vat_result['items'][1]
        assert item2['vat_rate'] == Decimal('0.15')
        assert item2['vat_amount'] == Decimal('15.00')

        # Total VAT: £30.00 + £15.00 = £45.00
        assert result['cart']['total_vat'] == Decimal('45.00')

    def test_it04_region_determination_flow(self, uk_user, ebook_product, build_vat_context):
        """IT04: Region determination flows correctly to per-item calculation."""
        # Create minimal cart
        from cart.models import Cart, CartItem
        cart = Cart.objects.create(user_id=uk_user.id)
        CartItem.objects.create(
            cart=cart,
            product=ebook_product,
            quantity=1,
            price=ebook_product.price
        )

        context = build_vat_context(cart)

        engine = RuleEngine()
        result = engine.execute('checkout_start', context)

        assert result['ok'] is True

        # Verify region was determined
        assert 'user_address' in context
        assert context['user_address']['region'] == 'UK'

        # Verify per-item calculation ran
        assert 'vat_result' in result['cart']
        assert len(result['cart']['vat_result']['items']) == 1

    def test_empty_cart_handles_gracefully(self, empty_cart, build_vat_context):
        """Empty cart handles VAT calculation without errors."""
        context = build_vat_context(empty_cart)

        engine = RuleEngine()
        result = engine.execute('checkout_start', context)

        assert result['ok'] is True
        assert result['cart']['total_vat'] == Decimal('0.00')
        assert result['cart']['vat_result']['items'] == []


@pytest.mark.django_db
class TestMultipleQuantitiesVAT:
    """Test VAT calculation with multiple quantities of same product."""

    def test_it05_multiple_quantities_same_product(self, uk_cart_multiple_quantities, build_vat_context):
        """IT05: Multiple quantities calculate VAT correctly."""
        context = build_vat_context(uk_cart_multiple_quantities)

        engine = RuleEngine()
        result = engine.execute('checkout_start', context)

        assert result['ok'] is True

        vat_result = result['cart']['vat_result']
        assert len(vat_result['items']) == 1

        # 3x £100.00 @ 20% = £300.00 net, £60.00 VAT
        item = vat_result['items'][0]
        assert item['quantity'] == 3
        assert item['net_amount'] == Decimal('300.00')
        assert item['vat_rate'] == Decimal('0.20')
        assert item['vat_amount'] == Decimal('60.00')

        assert result['cart']['total_vat'] == Decimal('60.00')

    def test_fractional_vat_rounding(self, uk_user, physical_book_product, build_vat_context):
        """Fractional VAT amounts round correctly with multiple quantities."""
        from cart.models import Cart, CartItem

        # Create cart with odd quantity for rounding test
        cart = Cart.objects.create(user_id=uk_user.id)
        CartItem.objects.create(
            cart=cart,
            product=physical_book_product,
            quantity=3,
            price=Decimal('33.33')  # Odd price for rounding
        )

        context = build_vat_context(cart)

        engine = RuleEngine()
        result = engine.execute('checkout_start', context)

        assert result['ok'] is True

        # 3x £33.33 = £99.99 @ 20% = £20.00 VAT (rounded)
        vat_result = result['cart']['vat_result']
        item = vat_result['items'][0]
        assert item['vat_amount'] == Decimal('20.00')
        assert result['cart']['total_vat'] == Decimal('20.00')


@pytest.mark.django_db
class TestCrossBorderVAT:
    """Test VAT calculation for cross-border scenarios."""

    def test_eu_material_treated_as_row(self, eu_cart_material, build_vat_context):
        """EU material treated as ROW (0% VAT)."""
        context = build_vat_context(eu_cart_material)

        engine = RuleEngine()
        result = engine.execute('checkout_start', context)

        assert result['ok'] is True
        assert result['cart']['total_vat'] == Decimal('0.00')

        vat_result = result['cart']['vat_result']
        assert vat_result['items'][0]['vat_rate'] == Decimal('0.00')

    def test_ie_material_has_local_rate(self, ie_user, physical_book_product, build_vat_context):
        """Ireland material has local 23% VAT rate."""
        from cart.models import Cart, CartItem

        cart = Cart.objects.create(user_id=ie_user.id)
        CartItem.objects.create(
            cart=cart,
            product=physical_book_product,
            quantity=1,
            price=physical_book_product.price
        )

        context = build_vat_context(cart)

        engine = RuleEngine()
        result = engine.execute('checkout_start', context)

        assert result['ok'] is True

        # £100.00 @ 23% = £23.00 VAT
        assert result['cart']['total_vat'] == Decimal('23.00')

        vat_result = result['cart']['vat_result']
        assert vat_result['items'][0]['vat_rate'] == Decimal('0.23')


@pytest.mark.django_db
class TestVATAuditTrail:
    """Test VAT calculation audit trail and metadata."""

    def test_vat_result_includes_metadata(self, uk_cart_ebook_only, build_vat_context):
        """VAT result includes calculation metadata."""
        context = build_vat_context(uk_cart_ebook_only)

        engine = RuleEngine()
        result = engine.execute('checkout_start', context)

        assert result['ok'] is True

        vat_result = result['cart']['vat_result']
        assert 'calculation_timestamp' in vat_result
        assert 'context_version' in vat_result
        assert 'items' in vat_result

    def test_item_vat_includes_rule_applied(self, uk_cart_mixed, build_vat_context):
        """Each item VAT result includes rule_applied for audit."""
        context = build_vat_context(uk_cart_mixed)

        engine = RuleEngine()
        result = engine.execute('checkout_start', context)

        assert result['ok'] is True

        vat_result = result['cart']['vat_result']
        for item in vat_result['items']:
            assert 'rule_applied' in item
            assert 'vat_rate' in item
            assert 'vat_amount' in item
            assert item['rule_applied'].endswith(':v1')

    def test_vat_result_includes_region(self, sa_cart_tutorial, build_vat_context):
        """VAT result includes user region for audit."""
        context = build_vat_context(sa_cart_tutorial)

        engine = RuleEngine()
        result = engine.execute('checkout_start', context)

        assert result['ok'] is True

        vat_result = result['cart']['vat_result']
        assert 'region' in vat_result
        assert vat_result['region'] == 'SA'


@pytest.mark.django_db
class TestEdgeCasesAndErrors:
    """Test edge cases and error handling."""

    def test_missing_user_address_handled(self, uk_cart_ebook_only):
        """Missing user address handled gracefully."""
        context = {
            'cart': {
                'id': uk_cart_ebook_only.id,
                'items': []
            }
        }

        engine = RuleEngine()
        result = engine.execute('checkout_start', context)

        # Should either return error or default to ROW
        assert 'ok' in result
        if not result['ok']:
            assert 'errors' in result

    def test_invalid_country_code_defaults_to_row(self, uk_user, ebook_product, build_vat_context):
        """Invalid country code defaults to ROW region."""
        from cart.models import Cart, CartItem
        from country.models import Country
        from userprofile.models import UserProfile

        # Create user with invalid country code
        country, _ = Country.objects.get_or_create(
            code='XX',
            defaults={'name': 'Unknown'}
        )
        profile = UserProfile.objects.get(user=uk_user)
        profile.country = country
        profile.save()

        cart = Cart.objects.create(user_id=uk_user.id)
        CartItem.objects.create(
            cart=cart,
            product=ebook_product,
            quantity=1,
            price=ebook_product.price
        )

        context = build_vat_context(cart)

        engine = RuleEngine()
        result = engine.execute('checkout_start', context)

        assert result['ok'] is True
        # Should default to ROW treatment (0% VAT)
        assert result['cart']['total_vat'] == Decimal('0.00')

    def test_zero_price_item_has_zero_vat(self, uk_user, build_vat_context):
        """Zero price item has zero VAT amount."""
        from cart.models import Cart, CartItem
        from products.models import Products

        free_product = Products.objects.create(
            product_name='Free Item',
            product_code='FREE-001',
            price=Decimal('0.00')
        )

        cart = Cart.objects.create(user_id=uk_user.id)
        CartItem.objects.create(
            cart=cart,
            product=free_product,
            quantity=1,
            price=Decimal('0.00')
        )

        context = build_vat_context(cart)

        engine = RuleEngine()
        result = engine.execute('checkout_start', context)

        assert result['ok'] is True
        assert result['cart']['total_vat'] == Decimal('0.00')

    def test_very_small_amounts_round_correctly(self, uk_user, build_vat_context):
        """Very small amounts round to 2 decimal places."""
        from cart.models import Cart, CartItem
        from products.models import Products

        small_product = Products.objects.create(
            product_name='Small Item',
            product_code='SMALL-001',
            price=Decimal('0.01')
        )

        cart = Cart.objects.create(user_id=uk_user.id)
        CartItem.objects.create(
            cart=cart,
            product=small_product,
            quantity=1,
            price=Decimal('0.01')
        )

        context = build_vat_context(cart)

        engine = RuleEngine()
        result = engine.execute('checkout_start', context)

        assert result['ok'] is True

        # £0.01 @ 20% = £0.002 → rounds to £0.00
        vat_result = result['cart']['vat_result']
        item = vat_result['items'][0]
        assert item['vat_amount'] == Decimal('0.00')

    def test_large_amounts_calculate_correctly(self, uk_user, build_vat_context):
        """Large amounts calculate VAT correctly."""
        from cart.models import Cart, CartItem
        from products.models import Products

        expensive_product = Products.objects.create(
            product_name='Expensive Item',
            product_code='EXP-001',
            price=Decimal('10000.00')
        )

        cart = Cart.objects.create(user_id=uk_user.id)
        CartItem.objects.create(
            cart=cart,
            product=expensive_product,
            quantity=1,
            price=Decimal('10000.00')
        )

        context = build_vat_context(cart)

        engine = RuleEngine()
        result = engine.execute('checkout_start', context)

        assert result['ok'] is True

        # £10,000.00 @ 20% = £2,000.00 VAT
        assert result['cart']['total_vat'] == Decimal('2000.00')

        vat_result = result['cart']['vat_result']
        item = vat_result['items'][0]
        assert item['vat_amount'] == Decimal('2000.00')
