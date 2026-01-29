from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal
from orders.models import (
    Order, OrderItem, Payment,
    OrderAcknowledgment, OrderPreference,
    OrderContact, OrderDelivery,
)
from catalog.models import (
    Subject, ExamSession, ExamSessionSubject,
    Product as CatalogProduct, ProductVariation, ProductProductVariation
)
from store.models import Product as StoreProduct

User = get_user_model()


class OrderModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser', email='test@example.com', password='testpass123'
        )

    def test_order_creation(self):
        order = Order.objects.create(
            user=self.user,
            subtotal=Decimal('100.00'),
            vat_amount=Decimal('20.00'),
            total_amount=Decimal('120.00'),
            vat_rate=Decimal('0.2000'),
            vat_country='GB',
        )
        self.assertEqual(order.user, self.user)
        self.assertEqual(order.subtotal, Decimal('100.00'))
        self.assertEqual(order.vat_amount, Decimal('20.00'))
        self.assertEqual(order.total_amount, Decimal('120.00'))
        self.assertEqual(order.vat_rate, Decimal('0.2000'))
        self.assertEqual(order.vat_country, 'GB')

    def test_order_str(self):
        order = Order.objects.create(
            user=self.user, total_amount=Decimal('120.00')
        )
        self.assertIn('testuser', str(order))
        self.assertIn('120.00', str(order))

    def test_order_db_table(self):
        self.assertEqual(Order._meta.db_table, '"acted"."orders"')

    def test_order_ordering(self):
        self.assertEqual(Order._meta.ordering, ['-created_at'])


class OrderItemModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser', email='test@example.com', password='testpass123'
        )
        self.order = Order.objects.create(
            user=self.user, subtotal=Decimal('100.00'),
            vat_amount=Decimal('20.00'), total_amount=Decimal('120.00')
        )
        # Create store product fixture for check constraint
        subject = Subject.objects.create(code='CM2')
        exam_session = ExamSession.objects.create(
            session_code='2025-04',
            start_date=timezone.now(), end_date=timezone.now()
        )
        ess = ExamSessionSubject.objects.create(exam_session=exam_session, subject=subject)
        cat_product = CatalogProduct.objects.create(fullname='Test Product', shortname='TP', code='TP01')
        variation = ProductVariation.objects.create(variation_type='eBook', name='Standard eBook')
        ppv = ProductProductVariation.objects.create(product=cat_product, product_variation=variation)
        self.store_product = StoreProduct.objects.create(
            exam_session_subject=ess, product_product_variation=ppv
        )

    def test_order_item_creation(self):
        item = OrderItem.objects.create(
            order=self.order,
            product=self.store_product,
            item_type='product',
            quantity=2,
            price_type='standard',
            actual_price=Decimal('50.00'),
            net_amount=Decimal('100.00'),
            vat_amount=Decimal('20.00'),
            gross_amount=Decimal('120.00'),
            vat_rate=Decimal('0.2000'),
        )
        self.assertEqual(item.order, self.order)
        self.assertEqual(item.quantity, 2)
        self.assertEqual(item.net_amount, Decimal('100.00'))

    def test_order_item_db_table(self):
        self.assertEqual(OrderItem._meta.db_table, '"acted"."order_items"')


class PaymentModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser', email='test@example.com', password='testpass123'
        )
        self.order = Order.objects.create(
            user=self.user, total_amount=Decimal('120.00')
        )

    def test_payment_creation(self):
        payment = Payment.objects.create(
            order=self.order,
            payment_method='card',
            amount=Decimal('120.00'),
            status='completed',
            transaction_id='TX123',
        )
        self.assertEqual(payment.order, self.order)
        self.assertEqual(payment.amount, Decimal('120.00'))
        self.assertEqual(payment.status, 'completed')

    def test_payment_is_successful(self):
        payment = Payment.objects.create(
            order=self.order, payment_method='card',
            amount=Decimal('120.00'), status='completed'
        )
        self.assertTrue(payment.is_successful)

    def test_payment_is_not_successful_when_failed(self):
        payment = Payment.objects.create(
            order=self.order, payment_method='card',
            amount=Decimal('120.00'), status='failed'
        )
        self.assertFalse(payment.is_successful)

    def test_payment_is_card(self):
        payment = Payment.objects.create(
            order=self.order, payment_method='card', amount=Decimal('120.00')
        )
        self.assertTrue(payment.is_card_payment)
        self.assertFalse(payment.is_invoice_payment)

    def test_payment_is_invoice(self):
        payment = Payment.objects.create(
            order=self.order, payment_method='invoice', amount=Decimal('120.00')
        )
        self.assertTrue(payment.is_invoice_payment)
        self.assertFalse(payment.is_card_payment)

    def test_payment_db_table(self):
        self.assertEqual(Payment._meta.db_table, '"acted"."order_payments"')


class OrderAcknowledgmentModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser', email='test@example.com', password='testpass123'
        )
        self.order = Order.objects.create(
            user=self.user, total_amount=Decimal('120.00')
        )

    def test_acknowledgment_creation(self):
        ack = OrderAcknowledgment.objects.create(
            order=self.order,
            acknowledgment_type='terms_conditions',
            title='Terms & Conditions',
            content_summary='Accept T&Cs',
            is_accepted=True,
        )
        self.assertEqual(ack.order, self.order)
        self.assertTrue(ack.is_accepted)
        self.assertTrue(ack.is_terms_and_conditions)

    def test_acknowledgment_db_table(self):
        self.assertEqual(OrderAcknowledgment._meta.db_table, '"acted"."order_user_acknowledgments"')


class OrderPreferenceModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser', email='test@example.com', password='testpass123'
        )
        self.order = Order.objects.create(
            user=self.user, total_amount=Decimal('120.00')
        )

    def test_preference_creation(self):
        pref = OrderPreference.objects.create(
            order=self.order,
            preference_type='marketing',
            preference_key='email_opt_in',
            preference_value={'choice': 'yes'},
            input_type='radio',
            title='Email Marketing',
        )
        self.assertEqual(pref.order, self.order)
        self.assertEqual(pref.preference_key, 'email_opt_in')

    def test_preference_db_table(self):
        self.assertEqual(OrderPreference._meta.db_table, '"acted"."order_user_preferences"')


class OrderContactModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser', email='test@example.com', password='testpass123'
        )
        self.order = Order.objects.create(
            user=self.user, total_amount=Decimal('120.00')
        )

    def test_contact_creation(self):
        contact = OrderContact.objects.create(
            order=self.order,
            mobile_phone='+447123456789',
            mobile_phone_country='GB',
            email_address='test@example.com',
        )
        self.assertEqual(contact.order, self.order)
        self.assertEqual(contact.email_address, 'test@example.com')

    def test_contact_db_table(self):
        self.assertEqual(OrderContact._meta.db_table, '"acted"."order_user_contact"')


class OrderDeliveryModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser', email='test@example.com', password='testpass123'
        )
        self.order = Order.objects.create(
            user=self.user, total_amount=Decimal('120.00')
        )

    def test_delivery_creation(self):
        delivery = OrderDelivery.objects.create(
            order=self.order,
            delivery_address_type='home',
            delivery_address_data={
                'address_line_1': '123 Main Street',
                'city': 'London',
                'postcode': 'SW1A 1AA',
                'country': 'GB',
            },
        )
        self.assertEqual(delivery.order, self.order)
        self.assertEqual(delivery.delivery_address_type, 'home')
        self.assertEqual(delivery.delivery_address_data['city'], 'London')

    def test_delivery_db_table(self):
        self.assertEqual(OrderDelivery._meta.db_table, '"acted"."order_delivery_detail"')
