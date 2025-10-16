"""
Test cases for VAT calculation integration with rules engine.
Following TDD methodology: RED → GREEN → REFACTOR

Test Coverage:
- VAT calculation via rules engine entry point
- VAT custom function integration
- Cart VAT calculation through rules
- Order VAT calculation through rules
"""
from django.test import TestCase
from decimal import Decimal
from datetime import date
from utils.models import UtilsRegion, UtilsCountrys, UtilsCountryRegion
from rules_engine.custom_functions import calculate_vat_for_context
from rules_engine.services.rule_engine import rule_engine


class VATRulesEngineIntegrationTestCase(TestCase):
    """Test cases for VAT integration with rules engine (TDD RED Phase)."""

    def setUp(self):
        """Set up test data."""
        # Get or create regions
        self.region_uk, _ = UtilsRegion.objects.get_or_create(
            code='UK',
            defaults={'name': 'United Kingdom'}
        )
        self.region_row, _ = UtilsRegion.objects.get_or_create(
            code='ROW',
            defaults={'name': 'Rest of World'}
        )

        # Get or create countries
        self.country_gb, _ = UtilsCountrys.objects.get_or_create(
            code='GB',
            defaults={
                'name': 'United Kingdom',
                'vat_percent': Decimal('20.00')
            }
        )
        self.country_us, _ = UtilsCountrys.objects.get_or_create(
            code='US',
            defaults={
                'name': 'United States',
                'vat_percent': Decimal('0.00')
            }
        )

        # Get or create country-region mappings
        UtilsCountryRegion.objects.get_or_create(
            country=self.country_gb,
            effective_from=date(2020, 1, 1),
            defaults={'region': self.region_uk}
        )
        UtilsCountryRegion.objects.get_or_create(
            country=self.country_us,
            effective_from=date(2020, 1, 1),
            defaults={'region': self.region_row}
        )

    def test_calculate_vat_custom_function_basic(self):
        """Test calculate_vat_for_context custom function with basic input."""
        context = {
            'country_code': 'GB',
            'net_amount': Decimal('100.00')
        }

        result = calculate_vat_for_context(context, {})

        self.assertEqual(result['country_code'], 'GB')
        self.assertEqual(result['vat_rate'], Decimal('20.00'))
        self.assertEqual(result['net_amount'], Decimal('100.00'))
        self.assertEqual(result['vat_amount'], Decimal('20.00'))
        self.assertEqual(result['gross_amount'], Decimal('120.00'))

    def test_calculate_vat_custom_function_with_cart_items(self):
        """Test calculate_vat_for_context with cart items."""
        context = {
            'country_code': 'GB',
            'cart_items': [
                {'net_price': Decimal('50.00'), 'quantity': 2},
                {'net_price': Decimal('30.00'), 'quantity': 1}
            ]
        }

        result = calculate_vat_for_context(context, {})

        self.assertEqual(result['total_net_amount'], Decimal('130.00'))
        self.assertEqual(result['total_vat_amount'], Decimal('26.00'))
        self.assertEqual(result['total_gross_amount'], Decimal('156.00'))

    def test_calculate_vat_custom_function_zero_vat_country(self):
        """Test calculate_vat_for_context with zero VAT country."""
        context = {
            'country_code': 'US',
            'net_amount': Decimal('100.00')
        }

        result = calculate_vat_for_context(context, {})

        self.assertEqual(result['vat_rate'], Decimal('0.00'))
        self.assertEqual(result['vat_amount'], Decimal('0.00'))
        self.assertEqual(result['gross_amount'], Decimal('100.00'))

    def test_calculate_vat_custom_function_invalid_country(self):
        """Test calculate_vat_for_context with invalid country code."""
        context = {
            'country_code': 'XX',
            'net_amount': Decimal('100.00')
        }

        result = calculate_vat_for_context(context, {})

        # Should return error result
        self.assertIn('error', result)
        self.assertIn('Country not found', result['error'])

    def test_calculate_vat_custom_function_missing_country_code(self):
        """Test calculate_vat_for_context without country code."""
        context = {
            'net_amount': Decimal('100.00')
        }

        result = calculate_vat_for_context(context, {})

        # Should return error result
        self.assertIn('error', result)

    def test_calculate_vat_with_params_override(self):
        """Test calculate_vat_for_context with params override."""
        context = {
            'country_code': 'US',  # Context has US
            'net_amount': Decimal('100.00')
        }

        params = {
            'country_code': 'GB'  # Params override to GB
        }

        result = calculate_vat_for_context(context, params)

        # Should use GB from params
        self.assertEqual(result['country_code'], 'GB')
        self.assertEqual(result['vat_rate'], Decimal('20.00'))
        self.assertEqual(result['vat_amount'], Decimal('20.00'))


class Phase3CompositeRulesIntegrationTestCase(TestCase):
    """
    Phase 3: Integration tests for composite VAT rules.

    Tests verify:
    1. Management command creates all 17 rules
    2. End-to-end VAT calculation via RuleEngine.execute()
    3. Multi-item cart calculations
    4. Audit trail in RuleExecution table
    5. Performance targets (< 50ms per cart item)

    Entry Point: cart_calculate_vat
    """

    @classmethod
    def setUpTestData(cls):
        """
        Set up test data for Phase 3 integration tests.

        Creates regions, countries, mappings, and VAT composite rules.
        """
        # Create regions (Phase 1 data)
        cls.uk_region, _ = UtilsRegion.objects.get_or_create(
            code='UK',
            defaults={'name': 'United Kingdom', 'active': True}
        )
        cls.sa_region, _ = UtilsRegion.objects.get_or_create(
            code='SA',
            defaults={'name': 'South Africa', 'active': True}
        )
        cls.row_region, _ = UtilsRegion.objects.get_or_create(
            code='ROW',
            defaults={'name': 'Rest of World', 'active': True}
        )

        # Create countries with VAT rates
        cls.uk_country, _ = UtilsCountrys.objects.get_or_create(
            code='GB',
            defaults={
                'name': 'United Kingdom',
                'vat_percent': Decimal('20.00'),
                'active': True
            }
        )
        cls.za_country, _ = UtilsCountrys.objects.get_or_create(
            code='ZA',
            defaults={
                'name': 'South Africa',
                'vat_percent': Decimal('15.00'),
                'active': True
            }
        )

        # Create country-region mappings
        UtilsCountryRegion.objects.get_or_create(
            country=cls.uk_country,
            region=cls.uk_region,
            effective_from=date(2020, 1, 1),
            defaults={'effective_to': None}
        )
        UtilsCountryRegion.objects.get_or_create(
            country=cls.za_country,
            region=cls.sa_region,
            effective_from=date(2020, 1, 1),
            defaults={'effective_to': None}
        )

        # Create VAT composite rules via management command
        from django.core.management import call_command
        from io import StringIO

        out = StringIO()
        call_command('setup_vat_composite_rules', stdout=out, stderr=out)

    def setUp(self):
        """Set up before each test."""
        from rules_engine.models import ActedRuleExecution

        # Clear execution history only (not rules)
        ActedRuleExecution.objects.filter(entry_point='cart_calculate_vat').delete()

    def tearDown(self):
        """Clean up after each test."""
        from rules_engine.models import ActedRuleExecution

        # Only clean execution history
        ActedRuleExecution.objects.filter(entry_point='cart_calculate_vat').delete()

    def test_uk_digital_product_full_flow(self):
        """
        T017: Test UK digital product end-to-end VAT calculation.

        Input: GB country, Digital product, £50.00 net
        Expected output: region=UK, rate=0.20, vat=£10.00, gross=£60.00

        Verifies full rule chain:
        1. Master rule: lookup_region('GB') → 'UK'
        2. UK regional rule: lookup_vat_rate('GB') → 0.20
        3. UK digital product rule: calculate_vat_amount(50.00, 0.20) → £10.00

        Expected to FAIL: Rules don't exist yet (will be created in GREEN phase)
        """
        from rules_engine.services.rule_engine import rule_engine

        context = {
            'cart_item': {
                'id': 'item_test_1',
                'product_type': 'Digital',
                'net_amount': Decimal('50.00')
            },
            'user': {
                'id': 'user_test_1',
                'country_code': 'GB'
            },
            'vat': {}
        }

        result = rule_engine.execute('cart_calculate_vat', context)

        # Verify full VAT calculation
        self.assertEqual(result['vat']['region'], 'UK')
        self.assertEqual(result['vat']['rate'], Decimal('0.20'))
        self.assertEqual(result['cart_item']['vat_amount'], Decimal('10.00'))
        self.assertEqual(result['cart_item']['gross_amount'], Decimal('60.00'))

    def test_sa_printed_product_full_flow(self):
        """
        T018: Test SA printed product end-to-end VAT calculation.

        Input: ZA country, Printed product, R500.00 net
        Expected output: region=SA, rate=0.15, vat=R75.00, gross=R575.00

        Expected to FAIL: Rules don't exist yet (will be created in GREEN phase)
        """
        from rules_engine.services.rule_engine import rule_engine

        context = {
            'cart_item': {
                'id': 'item_test_2',
                'product_type': 'Printed',
                'net_amount': Decimal('500.00')
            },
            'user': {
                'id': 'user_test_2',
                'country_code': 'ZA'
            },
            'vat': {}
        }

        result = rule_engine.execute('cart_calculate_vat', context)

        self.assertEqual(result['vat']['region'], 'SA')
        self.assertEqual(result['vat']['rate'], Decimal('0.15'))
        self.assertEqual(result['cart_item']['vat_amount'], Decimal('75.00'))
        self.assertEqual(result['cart_item']['gross_amount'], Decimal('575.00'))

    def test_unknown_country_row_fallback(self):
        """
        T019: Test unknown country ROW fallback.

        Input: XX country (unknown), Digital product, $100.00 net
        Expected output: region=ROW, rate=0.00, vat=$0.00, gross=$100.00

        Expected to FAIL: Rules don't exist yet (will be created in GREEN phase)
        """
        from rules_engine.services.rule_engine import rule_engine

        context = {
            'cart_item': {
                'id': 'item_test_3',
                'product_type': 'Digital',
                'net_amount': Decimal('100.00')
            },
            'user': {
                'id': 'user_test_3',
                'country_code': 'XX'  # Unknown country
            },
            'vat': {}
        }

        result = rule_engine.execute('cart_calculate_vat', context)

        self.assertEqual(result['vat']['region'], 'ROW')
        self.assertEqual(result['vat']['rate'], Decimal('0.00'))
        self.assertEqual(result['cart_item']['vat_amount'], Decimal('0.00'))
        self.assertEqual(result['cart_item']['gross_amount'], Decimal('100.00'))

    def test_uk_multi_item_cart(self):
        """
        T020: Test multi-item cart calculation.

        Input: 3 items (Digital £50, Printed £100, FlashCard £30), all UK
        Expected: Individual VAT per item, total £36 VAT

        Expected to FAIL: Rules don't exist yet (will be created in GREEN phase)
        """
        from rules_engine.services.rule_engine import rule_engine

        cart_items = [
            {'id': 'item_1', 'product_type': 'Digital', 'net_amount': Decimal('50.00')},
            {'id': 'item_2', 'product_type': 'Printed', 'net_amount': Decimal('100.00')},
            {'id': 'item_3', 'product_type': 'FlashCard', 'net_amount': Decimal('30.00')}
        ]

        total_vat = Decimal('0.00')
        total_gross = Decimal('0.00')

        for item in cart_items:
            context = {
                'cart_item': item,
                'user': {'id': 'user_multi', 'country_code': 'GB'},
                'vat': {}
            }
            result = rule_engine.execute('cart_calculate_vat', context)

            vat_amount = result['cart_item']['vat_amount']
            gross_amount = result['cart_item']['gross_amount']

            total_vat += vat_amount
            total_gross += gross_amount

        # Total VAT: £10 + £20 + £6 = £36.00
        self.assertEqual(total_vat, Decimal('36.00'))
        # Total gross: £60 + £120 + £36 = £216.00
        self.assertEqual(total_gross, Decimal('216.00'))
