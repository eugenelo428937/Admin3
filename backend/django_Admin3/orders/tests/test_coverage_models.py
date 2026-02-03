"""
Comprehensive model tests to increase orders app coverage from 89% to 98%.

Covers missed lines in:
- orders/models/preference.py (74% -> target ~100%)
- orders/models/order_item.py (78% -> target ~100%)
- orders/models/acknowledgment.py (89% -> target ~100%)
- orders/models/delivery.py (90% -> target ~100%)
- orders/models/contact.py (95% -> target ~100%)
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal

from orders.models import (
    Order, OrderItem, OrderAcknowledgment,
    OrderPreference, OrderContact, OrderDelivery,
)
from catalog.models import (
    Subject, ExamSession, ExamSessionSubject,
    Product as CatalogProduct, ProductVariation, ProductProductVariation,
)
from store.models import Product as StoreProduct
from marking_vouchers.models import MarkingVoucher

User = get_user_model()


class ORDBaseTestMixin:
    """Shared setup for orders coverage tests."""

    def _create_user(self, username='ord_testuser'):
        return User.objects.create_user(
            username=username,
            email=f'{username}@example.com',
            password='ord_testpass123',
        )

    def _create_order(self, user, total=Decimal('120.00')):
        return Order.objects.create(
            user=user,
            subtotal=Decimal('100.00'),
            vat_amount=Decimal('20.00'),
            total_amount=total,
        )

    def _create_store_product(self, code='ORD_CM2', session_code='ORD-2025-04'):
        subject = Subject.objects.create(code=code)
        exam_session = ExamSession.objects.create(
            session_code=session_code,
            start_date=timezone.now(),
            end_date=timezone.now(),
        )
        ess = ExamSessionSubject.objects.create(
            exam_session=exam_session, subject=subject
        )
        cat_product = CatalogProduct.objects.create(
            fullname='ORD Test Product', shortname='OTP', code='OTP01'
        )
        variation = ProductVariation.objects.create(
            variation_type='eBook', name='ORD Standard eBook'
        )
        ppv = ProductProductVariation.objects.create(
            product=cat_product, product_variation=variation
        )
        return StoreProduct.objects.create(
            exam_session_subject=ess, product_product_variation=ppv
        )


# =============================================================================
# OrderPreference model tests - covering get_display_value for all input types
# =============================================================================
class OrderPreferenceDisplayValueTest(ORDBaseTestMixin, TestCase):
    """Tests for OrderPreference.get_display_value() covering all input_type branches."""

    def setUp(self):
        self.user = self._create_user('ord_pref_user')
        self.order = self._create_order(self.user)

    def test_get_display_value_radio(self):
        """Radio input returns the 'choice' key from preference_value."""
        pref = OrderPreference.objects.create(
            order=self.order,
            preference_type='marketing',
            preference_key='ord_email_opt_in',
            preference_value={'choice': 'yes'},
            input_type='radio',
            title='ORD Email Marketing',
        )
        self.assertEqual(pref.get_display_value(), 'yes')

    def test_get_display_value_radio_missing_choice(self):
        """Radio input returns empty string when 'choice' key is missing."""
        pref = OrderPreference.objects.create(
            order=self.order,
            preference_type='marketing',
            preference_key='ord_radio_empty',
            preference_value={},
            input_type='radio',
            title='ORD Radio Empty',
        )
        self.assertEqual(pref.get_display_value(), '')

    def test_get_display_value_checkbox(self):
        """Checkbox input returns comma-separated selections."""
        pref = OrderPreference.objects.create(
            order=self.order,
            preference_type='communication',
            preference_key='ord_contact_methods',
            preference_value={'selections': ['email', 'sms', 'phone']},
            input_type='checkbox',
            title='ORD Contact Methods',
        )
        self.assertEqual(pref.get_display_value(), 'email, sms, phone')

    def test_get_display_value_checkbox_empty_selections(self):
        """Checkbox input returns empty string when selections list is empty."""
        pref = OrderPreference.objects.create(
            order=self.order,
            preference_type='communication',
            preference_key='ord_checkbox_empty',
            preference_value={'selections': []},
            input_type='checkbox',
            title='ORD Checkbox Empty',
        )
        self.assertEqual(pref.get_display_value(), '')

    def test_get_display_value_checkbox_missing_selections(self):
        """Checkbox input returns empty string when 'selections' key is missing."""
        pref = OrderPreference.objects.create(
            order=self.order,
            preference_type='communication',
            preference_key='ord_checkbox_no_key',
            preference_value={},
            input_type='checkbox',
            title='ORD Checkbox No Key',
        )
        self.assertEqual(pref.get_display_value(), '')

    def test_get_display_value_text(self):
        """Text input returns the 'text' key from preference_value."""
        pref = OrderPreference.objects.create(
            order=self.order,
            preference_type='custom',
            preference_key='ord_notes',
            preference_value={'text': 'Please deliver before noon'},
            input_type='text',
            title='ORD Notes',
        )
        self.assertEqual(pref.get_display_value(), 'Please deliver before noon')

    def test_get_display_value_text_missing(self):
        """Text input returns empty string when 'text' key is missing."""
        pref = OrderPreference.objects.create(
            order=self.order,
            preference_type='custom',
            preference_key='ord_text_empty',
            preference_value={},
            input_type='text',
            title='ORD Text Empty',
        )
        self.assertEqual(pref.get_display_value(), '')

    def test_get_display_value_textarea(self):
        """Textarea input returns the 'text' key (same branch as text)."""
        pref = OrderPreference.objects.create(
            order=self.order,
            preference_type='custom',
            preference_key='ord_textarea',
            preference_value={'text': 'Long form feedback text'},
            input_type='textarea',
            title='ORD Textarea',
        )
        self.assertEqual(pref.get_display_value(), 'Long form feedback text')

    def test_get_display_value_select(self):
        """Select input returns the 'selected' key from preference_value."""
        pref = OrderPreference.objects.create(
            order=self.order,
            preference_type='delivery',
            preference_key='ord_delivery_speed',
            preference_value={'selected': 'express'},
            input_type='select',
            title='ORD Delivery Speed',
        )
        self.assertEqual(pref.get_display_value(), 'express')

    def test_get_display_value_select_missing(self):
        """Select input returns empty string when 'selected' key is missing."""
        pref = OrderPreference.objects.create(
            order=self.order,
            preference_type='delivery',
            preference_key='ord_select_empty',
            preference_value={},
            input_type='select',
            title='ORD Select Empty',
        )
        self.assertEqual(pref.get_display_value(), '')

    def test_get_display_value_custom_input_type(self):
        """Custom input type returns string representation of the whole value."""
        pref = OrderPreference.objects.create(
            order=self.order,
            preference_type='custom',
            preference_key='ord_custom_pref',
            preference_value={'data': 'some_value', 'extra': 42},
            input_type='custom',
            title='ORD Custom Preference',
        )
        result = pref.get_display_value()
        self.assertIn('data', result)
        self.assertIn('some_value', result)

    def test_str_representation(self):
        """Test __str__ returns expected format."""
        pref = OrderPreference.objects.create(
            order=self.order,
            preference_type='marketing',
            preference_key='ord_str_test',
            preference_value={'choice': 'yes'},
            input_type='radio',
            title='ORD String Test',
        )
        result = str(pref)
        self.assertIn(str(self.order.id), result)
        self.assertIn('ord_str_test', result)

    def test_meta_verbose_name(self):
        self.assertEqual(OrderPreference._meta.verbose_name, 'Order Preference')
        self.assertEqual(OrderPreference._meta.verbose_name_plural, 'Order Preferences')

    def test_unique_together_constraint(self):
        """Test unique_together includes order, rule, preference_key."""
        unique_together = OrderPreference._meta.unique_together
        self.assertIn(('order', 'rule', 'preference_key'), unique_together)


# =============================================================================
# OrderItem model tests - covering __str__, item_name, item_price
# =============================================================================
class OrderItemStrAndPropertiesTest(ORDBaseTestMixin, TestCase):
    """Tests for OrderItem.__str__, item_name, and item_price properties."""

    def setUp(self):
        self.user = self._create_user('ord_item_user')
        self.order = self._create_order(self.user)
        self.store_product = self._create_store_product()

    def test_str_product_item(self):
        """__str__ for product type includes product, price_type, gross_amount, order id."""
        item = OrderItem.objects.create(
            order=self.order,
            product=self.store_product,
            item_type='product',
            quantity=2,
            price_type='standard',
            actual_price=Decimal('50.00'),
            gross_amount=Decimal('60.00'),
        )
        result = str(item)
        self.assertIn('2 x', result)
        self.assertIn('standard', result)
        self.assertIn('60.00', result)
        self.assertIn(str(self.order.id), result)

    def test_str_marking_voucher_item(self):
        """__str__ for marking_voucher type includes voucher info."""
        voucher = MarkingVoucher.objects.create(
            code='ORD_MV_STR', name='ORD Mock Voucher',
            price=Decimal('25.00'), is_active=True,
        )
        item = OrderItem.objects.create(
            order=self.order,
            item_type='marking_voucher',
            marking_voucher=voucher,
            quantity=1,
            price_type='standard',
            actual_price=Decimal('25.00'),
            gross_amount=Decimal('25.00'),
        )
        result = str(item)
        self.assertIn('1 x', result)
        self.assertIn('ORD_MV_STR', result)
        self.assertIn('25.00', result)

    def test_item_name_product(self):
        """item_name property returns str(product) for product items."""
        item = OrderItem.objects.create(
            order=self.order,
            product=self.store_product,
            item_type='product',
            quantity=1,
            actual_price=Decimal('50.00'),
        )
        self.assertEqual(item.item_name, str(self.store_product))

    def test_item_name_marking_voucher(self):
        """item_name property returns marking_voucher.name for voucher items."""
        voucher = MarkingVoucher.objects.create(
            code='ORD_MV_NAME', name='ORD Voucher Name',
            price=Decimal('30.00'), is_active=True,
        )
        item = OrderItem.objects.create(
            order=self.order,
            item_type='marking_voucher',
            marking_voucher=voucher,
            quantity=1,
            actual_price=Decimal('30.00'),
        )
        self.assertEqual(item.item_name, 'ORD Voucher Name')

    def test_item_price_with_actual_price(self):
        """item_price returns actual_price when set."""
        item = OrderItem.objects.create(
            order=self.order,
            product=self.store_product,
            item_type='product',
            quantity=1,
            actual_price=Decimal('75.00'),
        )
        self.assertEqual(item.item_price, Decimal('75.00'))

    def test_item_price_marking_voucher_fallback(self):
        """item_price returns marking_voucher.price when actual_price is None."""
        voucher = MarkingVoucher.objects.create(
            code='ORD_MV_PRICE', name='ORD Price Voucher',
            price=Decimal('30.00'), is_active=True,
        )
        item = OrderItem.objects.create(
            order=self.order,
            item_type='marking_voucher',
            marking_voucher=voucher,
            quantity=1,
        )
        self.assertEqual(item.item_price, Decimal('30.00'))

    def test_item_price_none_for_product_without_actual_price(self):
        """item_price returns None when actual_price is None and not a voucher."""
        item = OrderItem(
            order=self.order,
            product=self.store_product,
            item_type='product',
            quantity=1,
            actual_price=None,
        )
        self.assertIsNone(item.item_price)

    def test_meta_verbose_name(self):
        self.assertEqual(OrderItem._meta.verbose_name, 'Order Item')
        self.assertEqual(OrderItem._meta.verbose_name_plural, 'Order Items')


# =============================================================================
# OrderAcknowledgment model tests - covering properties and methods
# =============================================================================
class OrderAcknowledgmentPropertiesTest(ORDBaseTestMixin, TestCase):
    """Tests for OrderAcknowledgment properties and methods."""

    def setUp(self):
        self.user = self._create_user('ord_ack_user')
        self.order = self._create_order(self.user)

    def test_is_terms_and_conditions_true(self):
        ack = OrderAcknowledgment.objects.create(
            order=self.order,
            acknowledgment_type='terms_conditions',
            title='ORD Terms & Conditions',
            content_summary='ORD Accept T&Cs',
            is_accepted=True,
        )
        self.assertTrue(ack.is_terms_and_conditions)

    def test_is_terms_and_conditions_false(self):
        ack = OrderAcknowledgment.objects.create(
            order=self.order,
            acknowledgment_type='product_specific',
            title='ORD Product Note',
            content_summary='ORD product specific ack',
            is_accepted=True,
        )
        self.assertFalse(ack.is_terms_and_conditions)

    def test_is_product_specific_true(self):
        ack = OrderAcknowledgment.objects.create(
            order=self.order,
            acknowledgment_type='product_specific',
            title='ORD Product Specific',
            content_summary='ORD Product ack',
            is_accepted=True,
        )
        self.assertTrue(ack.is_product_specific)

    def test_is_product_specific_false(self):
        ack = OrderAcknowledgment.objects.create(
            order=self.order,
            acknowledgment_type='terms_conditions',
            title='ORD Terms',
            content_summary='ORD Terms ack',
            is_accepted=True,
        )
        self.assertFalse(ack.is_product_specific)

    def test_get_affected_products_with_data(self):
        ack = OrderAcknowledgment.objects.create(
            order=self.order,
            acknowledgment_type='product_specific',
            title='ORD Product Ack',
            content_summary='ORD Acknowledges specific products',
            is_accepted=True,
            acknowledgment_data={'product_ids': [101, 102, 103]},
        )
        self.assertEqual(ack.get_affected_products(), [101, 102, 103])

    def test_get_affected_products_empty(self):
        ack = OrderAcknowledgment.objects.create(
            order=self.order,
            acknowledgment_type='custom',
            title='ORD Custom Ack',
            content_summary='ORD No products',
            is_accepted=True,
            acknowledgment_data={},
        )
        self.assertEqual(ack.get_affected_products(), [])

    def test_str_accepted(self):
        ack = OrderAcknowledgment.objects.create(
            order=self.order,
            acknowledgment_type='terms_conditions',
            title='ORD T&C',
            content_summary='ORD Accept',
            is_accepted=True,
        )
        result = str(ack)
        self.assertIn('Accepted', result)
        self.assertIn(str(self.order.id), result)

    def test_str_pending(self):
        ack = OrderAcknowledgment.objects.create(
            order=self.order,
            acknowledgment_type='warning',
            title='ORD Warning',
            content_summary='ORD Warning ack',
            is_accepted=False,
        )
        result = str(ack)
        self.assertIn('Pending', result)

    def test_all_acknowledgment_types(self):
        """Test creation with all acknowledgment types to cover get_acknowledgment_type_display."""
        types = [
            'terms_conditions', 'product_specific', 'deadline_expired',
            'policy_change', 'warning', 'digital_consent', 'custom',
        ]
        for ack_type in types:
            ack = OrderAcknowledgment.objects.create(
                order=self.order,
                acknowledgment_type=ack_type,
                title=f'ORD {ack_type}',
                content_summary=f'ORD {ack_type} summary',
                is_accepted=True,
            )
            # __str__ calls get_acknowledgment_type_display
            result = str(ack)
            self.assertIn(str(self.order.id), result)

    def test_meta_ordering(self):
        self.assertEqual(OrderAcknowledgment._meta.ordering, ['-accepted_at'])


# =============================================================================
# OrderDelivery model tests - covering __str__
# =============================================================================
class OrderDeliveryStrTest(ORDBaseTestMixin, TestCase):
    """Tests for OrderDelivery.__str__ covering both branches."""

    def setUp(self):
        self.user = self._create_user('ord_delivery_user')
        self.order = self._create_order(self.user)

    def test_str_with_delivery_type(self):
        delivery = OrderDelivery.objects.create(
            order=self.order,
            delivery_address_type='home',
            delivery_address_data={'city': 'London'},
        )
        result = str(delivery)
        self.assertIn(str(self.order.id), result)
        self.assertIn('home', result)

    def test_str_with_work_delivery_type(self):
        delivery = OrderDelivery.objects.create(
            order=self.order,
            delivery_address_type='work',
            invoice_address_type='home',
            delivery_address_data={'city': 'Manchester'},
            invoice_address_data={'city': 'London'},
        )
        result = str(delivery)
        self.assertIn('work', result)

    def test_str_without_delivery_type(self):
        """When delivery_address_type is None, __str__ shows 'unspecified'."""
        delivery = OrderDelivery.objects.create(
            order=self.order,
            delivery_address_type=None,
            delivery_address_data={},
        )
        result = str(delivery)
        self.assertIn('unspecified', result)
        self.assertIn(str(self.order.id), result)

    def test_meta_verbose_name(self):
        self.assertEqual(OrderDelivery._meta.verbose_name, 'Order Delivery Detail')
        self.assertEqual(OrderDelivery._meta.verbose_name_plural, 'Order Delivery Details')


# =============================================================================
# OrderContact model tests - covering __str__
# =============================================================================
class OrderContactStrTest(ORDBaseTestMixin, TestCase):
    """Tests for OrderContact.__str__."""

    def setUp(self):
        self.user = self._create_user('ord_contact_user')
        self.order = self._create_order(self.user)

    def test_str_representation(self):
        contact = OrderContact.objects.create(
            order=self.order,
            mobile_phone='+447123456789',
            mobile_phone_country='GB',
            email_address='ord_contact@example.com',
        )
        result = str(contact)
        self.assertIn(str(self.order.id), result)
        self.assertIn('ord_contact@example.com', result)

    def test_str_with_all_phones(self):
        contact = OrderContact.objects.create(
            order=self.order,
            mobile_phone='+447123456789',
            mobile_phone_country='GB',
            home_phone='+441234567890',
            home_phone_country='GB',
            work_phone='+441234567891',
            work_phone_country='GB',
            email_address='ord_allphones@example.com',
        )
        result = str(contact)
        self.assertIn('ord_allphones@example.com', result)

    def test_meta_verbose_name(self):
        self.assertEqual(OrderContact._meta.verbose_name, 'Order Contact')
        self.assertEqual(OrderContact._meta.verbose_name_plural, 'Order Contacts')
