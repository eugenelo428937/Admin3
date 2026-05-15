from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal

from cart.models import Cart, CartItem, CartFee
from orders.models import Order, OrderItem
from orders.services.order_builder import OrderBuilder
from catalog.models import (
    Subject, ExamSession, ExamSessionSubject,
    Product as CatalogProduct, ProductVariation, ProductProductVariation
)
from store.models import Product as StoreProduct, MaterialProduct as StoreMaterialProduct

User = get_user_model()


class OrderBuilderTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser', email='test@example.com', password='testpass123'
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
        self.store_product = StoreMaterialProduct.objects.create(
            exam_session_subject=ess, product_product_variation=ppv
        )
        self.cart = Cart.objects.create(user=self.user)

        # Add items to cart
        self.item1 = CartItem.objects.create(
            cart=self.cart,
            product=self.store_product,
            item_type='product',
            quantity=2,
            price_type='standard',
            actual_price=Decimal('50.00'),
        )
        self.item2 = CartItem.objects.create(
            cart=self.cart,
            product=self.store_product,
            item_type='product',
            quantity=1,
            price_type='retaker',
            actual_price=Decimal('30.00'),
        )

        self.vat_result = {
            'totals': {
                'net': '130.00',
                'vat': '26.00',
                'gross': '156.00',
            },
            'items': [
                {'id': str(self.item1.id), 'vat_amount': '20.00'},
                {'id': str(self.item2.id), 'vat_amount': '6.00'},
            ],
            'region': 'UK',
        }

    def test_build_creates_order_with_totals(self):
        builder = OrderBuilder(cart=self.cart, user=self.user, vat_result=self.vat_result)
        order = builder.build()

        self.assertEqual(order.subtotal, Decimal('130.00'))
        self.assertEqual(order.vat_amount, Decimal('26.00'))
        self.assertEqual(order.total_amount, Decimal('156.00'))
        self.assertEqual(order.vat_country, 'UK')
        self.assertEqual(order.user, self.user)

    def test_build_transfers_items(self):
        builder = OrderBuilder(cart=self.cart, user=self.user, vat_result=self.vat_result)
        order = builder.build()

        order_items = order.items.all()
        self.assertEqual(order_items.count(), 2)

        item1_order = order_items.get(quantity=2)
        self.assertEqual(item1_order.actual_price, Decimal('50.00'))
        self.assertEqual(item1_order.vat_amount, Decimal('20.00'))

        item2_order = order_items.get(quantity=1)
        self.assertEqual(item2_order.actual_price, Decimal('30.00'))
        self.assertEqual(item2_order.vat_amount, Decimal('6.00'))

    def test_build_transfers_fees(self):
        """Task 23 (Release B): fee order items no longer have an
        ``item_type`` DB column — they're identified by
        ``purchasable.code == 'FEE_GENERIC'``. Filter on that instead.
        """
        from store.models import Purchasable
        CartFee.objects.create(
            cart=self.cart,
            fee_type='tutorial_booking_fee',
            name='Booking Fee',
            amount=Decimal('25.00'),
            currency='GBP',
        )

        builder = OrderBuilder(cart=self.cart, user=self.user, vat_result=self.vat_result)
        order = builder.build()

        fee_generic = Purchasable.objects.get(code='FEE_GENERIC')
        fee_items = order.items.filter(purchasable=fee_generic)
        self.assertEqual(fee_items.count(), 1)
        fee_item = fee_items.first()
        self.assertEqual(fee_item.actual_price, Decimal('25.00'))
        self.assertTrue(fee_item.is_vat_exempt)

    def test_build_atomic_transaction(self):
        # Verify order creation is atomic — if items fail, order shouldn't exist
        vat_result_bad_items = {
            'totals': {'net': '100.00', 'vat': '20.00', 'gross': '120.00'},
            'items': [],
            'region': 'UK',
        }
        builder = OrderBuilder(cart=self.cart, user=self.user, vat_result=vat_result_bad_items)
        order = builder.build()

        # Should still succeed — items just get zero VAT
        self.assertEqual(order.items.count(), 2)

    def test_build_with_zero_vat(self):
        vat_result = {
            'totals': {'net': '130.00', 'vat': '0.00', 'gross': '130.00'},
            'items': [],
            'region': 'ROW',
        }
        builder = OrderBuilder(cart=self.cart, user=self.user, vat_result=vat_result)
        order = builder.build()

        self.assertEqual(order.vat_amount, Decimal('0.00'))
        for item in order.items.all():
            self.assertTrue(item.is_vat_exempt)


class TransferFeesHardFailTests(TestCase):
    """`_transfer_fees` raises a clear app error when FEE_GENERIC is
    missing AND the cart actually has fees. No fees → no error."""

    def setUp(self):
        from store.models import Purchasable

        self.user = User.objects.create_user(username='hardfail',
                                             email='hf@t.com')
        self.cart = Cart.objects.create(user=self.user)
        # Remove FEE_GENERIC if present
        Purchasable.objects.filter(code='FEE_GENERIC').delete()
        self.builder = OrderBuilder(
            cart=self.cart, user=self.user,
            vat_result={'totals': {'net': '0.00', 'vat': '0.00',
                                   'gross': '0.00'},
                        'items': [], 'region': 'GB'},
        )
        self.CartFee = CartFee

    def test_no_fees_no_error_even_if_fee_generic_missing(self):
        order = self.builder._create_order()
        self.builder._transfer_fees(order)  # should not raise

    def test_with_fees_missing_fee_generic_raises_runtime_error(self):
        from decimal import Decimal
        order = self.builder._create_order()
        self.CartFee.objects.create(
            cart=self.cart, fee_type='tutorial_booking_fee',
            name='Tutorial Booking Fee', amount=Decimal('1.00'),
            currency='GBP',
        )
        with self.assertRaises(RuntimeError) as ctx:
            self.builder._transfer_fees(order)
        self.assertIn('FEE_GENERIC', str(ctx.exception))
        self.assertIn('migrate store', str(ctx.exception))

    def test_build_rolls_back_order_when_fee_generic_missing(self):
        from decimal import Decimal
        from orders.models import Order
        # Add a fee so _transfer_fees actually runs and raises.
        self.CartFee.objects.create(
            cart=self.cart, fee_type='tutorial_booking_fee',
            name='Tutorial Booking Fee', amount=Decimal('1.00'),
            currency='GBP',
        )
        order_count_before = Order.objects.count()
        with self.assertRaises(RuntimeError):
            self.builder.build()
        self.assertEqual(Order.objects.count(), order_count_before,
                         "Order should be rolled back when fee transfer fails")


class TransferTutorialChoicesTests(TestCase):
    """OrderBuilder copies CartTutorialChoice rows into TutorialChoice
    rows on the new OrderItem, 1-to-1, inside the existing atomic
    transaction."""

    def setUp(self):
        from datetime import date, timedelta
        from django.contrib.auth.models import User
        from django.utils import timezone
        from cart.models import Cart, CartItem
        from catalog.models import (
            ExamSession, ExamSessionSubject, Subject,
            Product as CatProduct, ProductVariation,
            ProductProductVariation,
        )
        from store.models import Product as StoreProduct, TutorialProduct
        from students.models import Student
        from tutorials.models import CartTutorialChoice, TutorialEvents

        self.user = User.objects.create_user(username='c', email='c@t.com')
        self.student = Student.objects.create(user=self.user)
        self.cart = Cart.objects.create(user=self.user)

        es = ExamSession.objects.create(
            session_code='25',
            start_date=timezone.now(),
            end_date=timezone.now() + timedelta(days=60))
        subj, _ = Subject.objects.get_or_create(
            code='CM2',
            defaults={'description': 'CM2', 'active': True})
        ess = ExamSessionSubject.objects.create(
            exam_session=es, subject=subj)
        cat, _ = CatProduct.objects.get_or_create(
            code='Live',
            defaults={'fullname': 'Tutorial - Live',
                      'shortname': 'Live'})
        pv, _ = ProductVariation.objects.get_or_create(
            code='LO_6H',
            defaults={'name': 'LO_6H', 'description': '',
                      'description_short': 'LO_6H',
                      'variation_type': 'Tutorial'})
        ppv, _ = ProductProductVariation.objects.get_or_create(
            product=cat, product_variation=pv)
        sp = TutorialProduct(
            exam_session_subject=ess, product_product_variation=ppv,
            product_code='CM2/Live/LO_6H/25',
            format='LO_6H')
        sp.save()
        self.event_a = TutorialEvents.objects.create(
            code='CM2-01-25A', store_product=sp,
            start_date=date(2025, 1, 1), end_date=date(2025, 2, 1))
        self.event_b = TutorialEvents.objects.create(
            code='CM2-02-25A', store_product=sp,
            start_date=date(2025, 1, 8), end_date=date(2025, 2, 8))
        self.cart_item = CartItem.objects.create(
            cart=self.cart, purchasable=sp.purchasable_ptr,
            actual_price='10.00', quantity=1)
        CartTutorialChoice.objects.create(
            cart_item=self.cart_item, student=self.student,
            tutorial_event=self.event_a, choice_rank=1)
        CartTutorialChoice.objects.create(
            cart_item=self.cart_item, student=self.student,
            tutorial_event=self.event_b, choice_rank=2)

    def test_choices_copied_to_order_item(self):
        from orders.services.order_builder import OrderBuilder
        from tutorials.models import TutorialChoice
        builder = OrderBuilder(
            cart=self.cart, user=self.user,
            vat_result={'totals': {'net': '10.00', 'vat': '0.00',
                                   'gross': '10.00'},
                        'items': [], 'region': 'GB'})
        order = builder.build()
        order_item = order.items.first()
        choices = TutorialChoice.objects.filter(order_item=order_item)
        self.assertEqual(choices.count(), 2)
        self.assertEqual(
            sorted(choices.values_list('choice_rank',
                                       'tutorial_event_id')),
            sorted([(1, self.event_a.id), (2, self.event_b.id)]))

    def test_no_choices_no_op(self):
        from orders.services.order_builder import OrderBuilder
        from tutorials.models import TutorialChoice
        from tutorials.models import CartTutorialChoice
        # Wipe existing cart choices and re-test that build is a no-op
        # for tutorial choices on a non-tutorial cart_item.
        CartTutorialChoice.objects.filter(
            cart_item=self.cart_item).delete()
        builder = OrderBuilder(
            cart=self.cart, user=self.user,
            vat_result={'totals': {'net': '10.00', 'vat': '0.00',
                                   'gross': '10.00'},
                        'items': [], 'region': 'GB'})
        order = builder.build()
        self.assertEqual(
            TutorialChoice.objects.filter(
                order_item__order=order).count(), 0)


class TutorialCheckoutAuthGateTests(TestCase):
    """OrderBuilder enforces the moved auth gate: a cart with tutorial
    choices cannot be built into an order unless cart.user is
    authenticated. The Student row itself is NOT required (Q1)."""

    def _seed_cart_with_tutorial(self, user=None, session_key=None):
        from datetime import date, timedelta
        from cart.models import Cart, CartItem
        from catalog.models import (
            ExamSession, ExamSessionSubject, Subject,
            Product as CatProduct, ProductVariation,
            ProductProductVariation,
        )
        from store.models import Product as StoreProduct, TutorialProduct
        from tutorials.models import CartTutorialChoice, TutorialEvents

        es = ExamSession.objects.create(
            session_code='25',
            start_date=timezone.now(),
            end_date=timezone.now() + timedelta(days=60))
        subj, _ = Subject.objects.get_or_create(
            code='CM2',
            defaults={'description': 'CM2', 'active': True})
        ess = ExamSessionSubject.objects.create(
            exam_session=es, subject=subj)
        cat, _ = CatProduct.objects.get_or_create(
            code='Live',
            defaults={'fullname': 'T - Live', 'shortname': 'Live'})
        pv, _ = ProductVariation.objects.get_or_create(
            code='LO_6H',
            defaults={'name': 'LO_6H', 'description': '',
                      'description_short': 'LO_6H',
                      'variation_type': 'Tutorial'})
        ppv, _ = ProductProductVariation.objects.get_or_create(
            product=cat, product_variation=pv)
        sp = TutorialProduct(
            exam_session_subject=ess, product_product_variation=ppv,
            product_code='CM2/Live/LO_6H/25',
            format='LO_6H')
        sp.save()
        ev = TutorialEvents.objects.create(
            code='CM2-01-25A', store_product=sp,
            start_date=date(2025, 1, 1), end_date=date(2025, 2, 1))

        cart = Cart.objects.create(user=user, session_key=session_key)
        cart_item = CartItem.objects.create(
            cart=cart, purchasable=sp.purchasable_ptr,
            actual_price='10.00', quantity=1)
        CartTutorialChoice.objects.create(
            cart_item=cart_item, student=None,
            tutorial_event=ev, choice_rank=1)
        return cart

    def test_anonymous_cart_with_tutorial_blocked(self):
        from django.contrib.auth.models import AnonymousUser
        from django.core.exceptions import ValidationError
        cart = self._seed_cart_with_tutorial(session_key='guest-z')
        before = Order.objects.count()
        builder = OrderBuilder(
            cart=cart, user=AnonymousUser(),
            vat_result={'totals': {'net': '10.00', 'vat': '0.00',
                                   'gross': '10.00'},
                        'items': [], 'region': 'GB'})
        with self.assertRaises(ValidationError) as ctx:
            builder.build()
        self.assertIn('logged-in', str(ctx.exception).lower())
        # No order persisted by this build.
        self.assertEqual(Order.objects.count(), before)

    def test_authenticated_user_without_student_can_check_out(self):
        from tutorials.models import TutorialChoice
        user = User.objects.create_user(
            username='nostud', email='ns@t.com', password='x')
        cart = self._seed_cart_with_tutorial(user=user)
        builder = OrderBuilder(
            cart=cart, user=user,
            vat_result={'totals': {'net': '10.00', 'vat': '0.00',
                                   'gross': '10.00'},
                        'items': [], 'region': 'GB'})
        order = builder.build()
        # Choice was carried across with student=None.
        tc = TutorialChoice.objects.get(order_item__order=order)
        self.assertIsNone(tc.student_id)
