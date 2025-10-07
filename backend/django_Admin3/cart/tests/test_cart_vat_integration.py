"""
Test cases for Cart VAT integration.
Following TDD methodology: RED → GREEN → REFACTOR

Test Coverage:
- Calculate VAT for cart with items
- Store VAT result in cart.vat_result
- Retrieve VAT calculations from cart
- Update VAT when items change
- Handle different billing countries
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal
from datetime import date
from cart.models import Cart, CartItem
from utils.models import UtilsRegion, UtilsCountrys, UtilsCountryRegion
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
from exam_sessions_subjects.models import ExamSessionSubject
from exam_sessions.models import ExamSession
from subjects.models import Subject
from products.models import Product

User = get_user_model()


class CartVATIntegrationTestCase(TestCase):
    """Test cases for Cart VAT integration (TDD RED Phase)."""

    def setUp(self):
        """Set up test data."""
        # Create test user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

        # Get or create VAT regions and countries
        self.region_uk, _ = UtilsRegion.objects.get_or_create(
            code='UK',
            defaults={'name': 'United Kingdom'}
        )
        self.region_row, _ = UtilsRegion.objects.get_or_create(
            code='ROW',
            defaults={'name': 'Rest of World'}
        )

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

        # Create cart (we'll mock cart items without full product hierarchy)
        self.cart = Cart.objects.create(user=self.user)

    def test_cart_has_vat_result_field(self):
        """Test that Cart model has vat_result JSONField."""
        self.assertTrue(hasattr(self.cart, 'vat_result'))
        self.assertIsNone(self.cart.vat_result)

    def test_calculate_vat_for_cart_method_exists(self):
        """Test that Cart has calculate_vat method."""
        self.assertTrue(hasattr(self.cart, 'calculate_vat'))
        self.assertTrue(callable(getattr(self.cart, 'calculate_vat')))

    def test_calculate_vat_for_empty_cart(self):
        """Test VAT calculation for empty cart."""
        result = self.cart.calculate_vat(country_code='GB')

        self.assertIsNotNone(result)
        self.assertEqual(result['country_code'], 'GB')
        self.assertEqual(Decimal(str(result['total_net_amount'])), Decimal('0.00'))
        self.assertEqual(Decimal(str(result['total_vat_amount'])), Decimal('0.00'))

    def test_calculate_vat_for_cart_with_items(self):
        """Test VAT calculation for cart with items."""
        # Add items to cart
        CartItem.objects.create(
            cart=self.cart,
            product=self.essp,
            quantity=2,
            actual_price=Decimal('50.00')
        )

        result = self.cart.calculate_vat(country_code='GB')

        self.assertEqual(result['country_code'], 'GB')
        self.assertEqual(Decimal(str(result['vat_rate'])), Decimal('20.00'))
        self.assertEqual(Decimal(str(result['total_net_amount'])), Decimal('100.00'))
        self.assertEqual(Decimal(str(result['total_vat_amount'])), Decimal('20.00'))
        self.assertEqual(Decimal(str(result['total_gross_amount'])), Decimal('120.00'))

    def test_calculate_and_save_vat_stores_result(self):
        """Test that calculate_and_save_vat stores result in vat_result field."""
        CartItem.objects.create(
            cart=self.cart,
            product=self.essp,
            quantity=1,
            actual_price=Decimal('50.00')
        )

        self.cart.calculate_and_save_vat(country_code='GB')
        self.cart.refresh_from_db()

        self.assertIsNotNone(self.cart.vat_result)
        self.assertIn('country_code', self.cart.vat_result)
        self.assertEqual(self.cart.vat_result['country_code'], 'GB')
        self.assertIn('total_vat_amount', self.cart.vat_result)

    def test_vat_calculation_updates_when_items_change(self):
        """Test that VAT updates when cart items change."""
        item = CartItem.objects.create(
            cart=self.cart,
            product=self.essp,
            quantity=1,
            actual_price=Decimal('50.00')
        )

        self.cart.calculate_and_save_vat(country_code='GB')
        self.cart.refresh_from_db()

        initial_vat = Decimal(str(self.cart.vat_result['total_vat_amount']))
        self.assertEqual(initial_vat, Decimal('10.00'))

        # Update quantity
        item.quantity = 2
        item.save()

        self.cart.calculate_and_save_vat(country_code='GB')
        self.cart.refresh_from_db()

        updated_vat = Decimal(str(self.cart.vat_result['total_vat_amount']))
        self.assertEqual(updated_vat, Decimal('20.00'))

    def test_vat_calculation_for_different_countries(self):
        """Test VAT calculation for different countries."""
        CartItem.objects.create(
            cart=self.cart,
            product=self.essp,
            quantity=1,
            actual_price=Decimal('100.00')
        )

        # UK VAT (20%)
        self.cart.calculate_and_save_vat(country_code='GB')
        self.cart.refresh_from_db()
        gb_vat = Decimal(str(self.cart.vat_result['total_vat_amount']))
        self.assertEqual(gb_vat, Decimal('20.00'))

        # US VAT (0%)
        self.cart.calculate_and_save_vat(country_code='US')
        self.cart.refresh_from_db()
        us_vat = Decimal(str(self.cart.vat_result['total_vat_amount']))
        self.assertEqual(us_vat, Decimal('0.00'))

    def test_get_vat_calculation_returns_stored_result(self):
        """Test get_vat_calculation returns stored result."""
        CartItem.objects.create(
            cart=self.cart,
            product=self.essp,
            quantity=1,
            actual_price=Decimal('50.00')
        )

        self.cart.calculate_and_save_vat(country_code='GB')

        result = self.cart.get_vat_calculation()
        self.assertIsNotNone(result)
        self.assertEqual(result['country_code'], 'GB')

    def test_get_vat_calculation_returns_none_if_not_calculated(self):
        """Test get_vat_calculation returns None if VAT not calculated."""
        result = self.cart.get_vat_calculation()
        self.assertIsNone(result)

    def test_calculate_vat_with_multiple_items(self):
        """Test VAT calculation with multiple different items."""
        # Create another product
        product2 = Product.objects.create(
            code='CM1-EBOOK',
            fullname='CM1 eBook',
            group_name='Materials'
        )
        essp2 = ExamSessionSubjectProduct.objects.create(
            exam_session_subject=self.exam_session_subject,
            product=product2,
            price=Decimal('30.00'),
            is_available=True
        )

        # Add multiple items
        CartItem.objects.create(
            cart=self.cart,
            product=self.essp,
            quantity=2,
            actual_price=Decimal('50.00')
        )
        CartItem.objects.create(
            cart=self.cart,
            product=essp2,
            quantity=1,
            actual_price=Decimal('30.00')
        )

        result = self.cart.calculate_vat(country_code='GB')

        # Total: (50*2) + (30*1) = 130
        # VAT: 130 * 0.20 = 26
        self.assertEqual(Decimal(str(result['total_net_amount'])), Decimal('130.00'))
        self.assertEqual(Decimal(str(result['total_vat_amount'])), Decimal('26.00'))
        self.assertEqual(Decimal(str(result['total_gross_amount'])), Decimal('156.00'))

    def test_vat_calculation_error_handling(self):
        """Test VAT calculation with invalid country code."""
        CartItem.objects.create(
            cart=self.cart,
            product=self.essp,
            quantity=1,
            actual_price=Decimal('50.00')
        )

        # Should handle error gracefully
        result = self.cart.calculate_vat(country_code='XX')
        self.assertIn('error', result.keys())
